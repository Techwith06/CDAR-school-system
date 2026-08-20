import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { put } from "@vercel/blob";

import * as store from "./store.js";
import {
  authenticate,
  requireRole,
  hashPassword,
  verifyPassword,
  issueTokens,
  verifyToken,
  blacklistRefresh,
  isRefreshBlacklisted,
} from "./auth.js";
import {
  generateTempPassword,
  generateStudentId,
  generateStaffId,
  generateUniversityEmail,
} from "./ids.js";
import { curriculumCourseCodes } from "./curriculum.js";
import {
  userOut,
  materialOut,
  assignmentOut,
  enrollmentOut,
  notificationOut,
  programOut,
  courseOut,
  departmentOut,
  paginate,
} from "./serializers.js";

const UPLOAD_DIR = resolveUploadDir();

function resolveUploadDir() {
  const candidates = [
    path.join(process.cwd(), "server", "data", "uploads"),
    path.join(process.cwd(), "data", "uploads"),
  ];
  return candidates.find((dir) => fs.existsSync(dir)) ?? candidates[0];
}
const MAX_FILE_BYTES = 30 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function validationError(res, errors) {
  return res.status(400).json(errors);
}

function findFile(req, field) {
  const files = Array.isArray(req.files) ? req.files : [];
  return files.find((f) => f.fieldname === field) ?? null;
}

async function storeFile(req, file, destPath) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(destPath, file.buffer, {
        access: "public",
        contentType: file.mimetype || "application/octet-stream",
      });
      return blob.url;
    } catch {
      // fall through to local disk
    }
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const localPath = path.join(UPLOAD_DIR, destPath);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, file.buffer);
  return `${req.protocol}://${req.get("host")}/uploads/${destPath}`;
}

async function loadData() {
  const departments = await store.getTable("departments");
  const programs = await store.getTable("programs");
  const courses = await store.getTable("courses");
  const users = await store.getTable("users");
  const materials = await store.getTable("materials");
  const notifications = await store.getTable("notifications");
  const assignments = await store.getTable("assignments");
  const enrollments = await store.getTable("enrollments");

  const deptById = new Map(departments.map((d) => [d.id, d]));
  const progById = new Map(programs.map((p) => [p.id, p]));
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const programsH = programs.map((p) => ({
    ...p,
    department_name: deptById.get(p.department_id)?.name ?? null,
  }));
  const coursesH = courses.map((c) => ({
    ...c,
    department_name: deptById.get(c.department_id)?.name ?? null,
    program_name: progById.get(c.program_id)?.name ?? null,
  }));
  const usersH = users.map((u) => ({
    ...u,
    department_name: deptById.get(u.department_id)?.name ?? null,
    program_name: progById.get(u.program_id)?.name ?? null,
  }));
  const materialsH = materials.map((m) => {
    const course = courseById.get(m.course_id);
    return {
      ...m,
      course_code: course?.course_code ?? null,
      department_name: course ? deptById.get(course.department_id)?.name ?? null : null,
      program_name: course ? progById.get(course.program_id)?.name ?? null : null,
      uploaded_by_name: m.uploaded_by_id ? userById.get(m.uploaded_by_id)?.full_name ?? "" : "",
    };
  });

  return {
    departments,
    programs: programsH,
    courses: coursesH,
    users: usersH,
    materials: materialsH,
    notifications,
    assignments,
    enrollments,
    deptById,
    progById,
    courseById,
    userById,
  };
}

async function loadUserForRequest(req, res, next) {
  const user = await store.findById("users", req.auth.userId);
  if (!user) return sendError(res, 401, "NOT_AUTHENTICATED", "User no longer exists.");
  const departments = await store.getTable("departments");
  const programs = await store.getTable("programs");
  const deptById = new Map(departments.map((d) => [d.id, d]));
  const progById = new Map(programs.map((p) => [p.id, p]));
  req.user = {
    ...user,
    department_name: deptById.get(user.department_id)?.name ?? null,
    program_name: progById.get(user.program_id)?.name ?? null,
  };
  next();
}

function paginatedResponse(rows, query, route) {
  return paginate(rows, query, route);
}

// ---------------------------------------------------------------- auth

app.post("/api/auth/register/", upload.any(), async (req, res) => {
  try {
    const data = req.body ?? {};
    const password = (data.password || "").toString();
    if (password && password.length < 8) {
      return validationError(res, { password: ["This password is too short. It must contain at least 8 characters."] });
    }
    const fullName = String(data.full_name || "").trim();
    if (!fullName) return validationError(res, { full_name: ["This field is required."] });
    const role = data.role || "student";
    if (!["student", "lecturer"].includes(role)) {
      return validationError(res, { role: ["\"student\" is not a valid choice."] });
    }
    const dataAll = await loadData();
    const deptName = String(data.department_name || "");
    const progName = String(data.program_name || "");
    let department = deptName
      ? dataAll.departments.find((d) => d.name.toLowerCase() === deptName.toLowerCase()) ?? null
      : null;
    if (deptName && !department) {
      department = { id: await store.nextId("departments"), name: deptName };
      await store.insert("departments", department);
      dataAll.departments.push(department);
    }
    let program = null;
    if (progName && department) {
      program =
        dataAll.programs.find(
          (p) => p.name === progName && p.department_id === department.id,
        ) ?? null;
      if (!program) {
        program = { id: await store.nextId("programs"), name: progName, department_id: department.id };
        await store.insert("programs", program);
        dataAll.programs.push(program);
      }
    }
    let email = String(data.email || "").trim();
    let studentId = role === "student" ? String(data.student_id || "") : "";
    let staffId = role === "lecturer" ? String(data.staff_id || "") : "";
    let identifier = String(data.identifier || "");
    if (role === "student" && (!studentId || dataAll.users.some((u) => u.role === "student" && u.student_id === studentId))) {
      studentId = generateStudentId(dataAll.users.filter((u) => u.role === "student"), department, program);
    }
    if (role === "lecturer" && (!staffId || dataAll.users.some((u) => u.role === "lecturer" && u.staff_id === staffId))) {
      staffId = generateStaffId(dataAll.users.filter((u) => u.role === "lecturer"), department);
    }
    if (!email) {
      email = generateUniversityEmail(role === "student" ? studentId : staffId);
    }
    if (dataAll.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return validationError(res, { email: ["A user with that email already exists."] });
    }

    const pictureFile = findFile(req, "profile_picture");
    let profilePicture = null;
    if (pictureFile) {
      profilePicture = await storeFile(
        req,
        pictureFile,
        `avatars/${crypto.randomUUID()}-${pictureFile.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      );
    }

    const now = new Date().toISOString();
    const user = {
      id: await store.nextId("users"),
      full_name: fullName,
      email,
      role,
      student_id: role === "student" ? studentId : null,
      staff_id: role === "lecturer" ? staffId : null,
      department_id: department?.id ?? null,
      program_id: program?.id ?? null,
      level: role === "student" ? Number(data.level) || 100 : null,
      semester: role === "student" ? Number(data.semester) || 1 : null,
      phone_number: String(data.phone_number || ""),
      date_of_birth: data.date_of_birth || null,
      gender: String(data.gender || ""),
      nationality: String(data.nationality || ""),
      address: String(data.address || ""),
      profile_picture: profilePicture,
      is_active: true,
      is_staff: false,
      password: hashPassword(password || generateTempPassword()),
      created_at: now,
      updated_at: now,
    };
    await store.insert("users", user);
    if (role === "student") await syncEnrollments(user);

    const tokens = issueTokens(user);
    const deptById = new Map(dataAll.departments.map((d) => [d.id, d]));
    const progById = new Map(dataAll.programs.map((p) => [p.id, p]));
    return res.status(201).json({
      ...tokens,
      user: userOut({
        ...user,
        department_name: deptById.get(user.department_id)?.name ?? null,
        program_name: progById.get(user.program_id)?.name ?? null,
      }),
    });
  } catch (err) {
    console.error("register error", err);
    return sendError(res, 400, "VALIDATION_ERROR", "Could not register user.");
  }
});

app.get("/api/auth/id-preview/", authenticate, loadUserForRequest, async (req, res) => {
  const dataAll = await loadData();
  const role = req.query.role;
  const deptName = String(req.query.department || "");
  const progName = String(req.query.program || "");
  const department = deptName
    ? dataAll.departments.find((d) => d.name.toLowerCase() === deptName.toLowerCase())
    : null;
  let program = null;
  if (progName && department) {
    program =
      dataAll.programs.find(
        (p) => p.name === progName && p.department_id === department.id,
      ) ?? null;
  }
  let identifier = null;
  if (role === "student") {
    identifier = generateStudentId(dataAll.users.filter((u) => u.role === "student"), department, program);
  } else if (role === "lecturer") {
    identifier = generateStaffId(dataAll.users.filter((u) => u.role === "lecturer"), department);
  }
  return res.json({ id: identifier });
});

app.post("/api/auth/login/", async (req, res) => {
  const identifier = String(req.body?.identifier || "").trim();
  const password = String(req.body?.password || "");
  if (!identifier || !password) {
    return sendError(res, 400, "VALIDATION_ERROR", "identifier and password are required.");
  }
  const dataAll = await loadData();
  let user =
    dataAll.users.find((u) => u.email.toLowerCase() === identifier.toLowerCase()) ?? null;
  if (!user) {
    user =
      dataAll.users.find((u) => u.role === "student" && u.student_id === identifier) ??
      dataAll.users.find((u) => u.role === "lecturer" && u.staff_id === identifier) ??
      null;
  }
  if (!user || !verifyPassword(password, user.password)) {
    return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid identifier or password.");
  }
  if (!user.is_active) {
    return sendError(res, 403, "ACCOUNT_DISABLED", "This account has been deactivated.");
  }
  const tokens = issueTokens(user);
  return res.json({ ...tokens, user: userOut(user) });
});

app.post("/api/auth/refresh/", async (req, res) => {
  const refresh = String(req.body?.refresh || "");
  if (!refresh) {
    return validationError(res, { refresh: ["This field is required."] });
  }
  const payload = verifyToken(refresh);
  if (!payload || payload.type !== "refresh") {
    return validationError(res, { refresh: ["Token is invalid or expired."] });
  }
  if (await isRefreshBlacklisted(refresh)) {
    return validationError(res, { refresh: ["Token is invalid or expired."] });
  }
  const user = await store.findById("users", payload.sub);
  if (!user) return validationError(res, { refresh: ["User no longer exists."] });
  const access = issueTokens(user).access_token;
  return res.json({ access });
});

app.post("/api/auth/logout/", authenticate, async (req, res) => {
  const refresh = String(req.body?.refresh || "");
  if (refresh) await blacklistRefresh(refresh);
  return res.json({ status: "logged_out" });
});

app.get("/api/auth/me/", authenticate, loadUserForRequest, async (req, res) => {
  return res.json(userOut(req.user));
});

app.put("/api/auth/me/", authenticate, loadUserForRequest, upload.any(), async (req, res) => {
  try {
    const data = req.body ?? {};
    const user = req.user;
    let update = {};

    if (user.role === "student") {
      update = { phone_number: String(data.phone_number ?? user.phone_number ?? "") };
    } else {
      const fullName = String(data.full_name || "").trim();
      if (fullName) update.full_name = fullName;
      const email = String(data.email || "").trim();
      if (email) {
        const dataAll = await loadData();
        if (dataAll.users.some((u) => u.id !== user.id && u.email.toLowerCase() === email.toLowerCase())) {
          return validationError(res, { email: ["A user with that email already exists."] });
        }
        update.email = email;
      }
      const staffId = String(data.staff_id || "");
      if (staffId) update.staff_id = staffId;
      const departmentName = String(data.department_name || "");
      if (departmentName) {
        const dataAll = await loadData();
        let dept = dataAll.departments.find((d) => d.name.toLowerCase() === departmentName.toLowerCase());
        if (!dept) {
          dept = { id: await store.nextId("departments"), name: departmentName };
          await store.insert("departments", dept);
        }
        update.department_id = dept.id;
      }
      if (data.date_of_birth !== undefined) update.date_of_birth = data.date_of_birth || null;
      if (data.gender !== undefined) update.gender = String(data.gender || "");
      if (data.nationality !== undefined) update.nationality = String(data.nationality || "");
      if (data.address !== undefined) update.address = String(data.address || "");
    }

    const pictureFile = findFile(req, "profile_picture");
    if (pictureFile) {
      update.profile_picture = await storeFile(
        req,
        pictureFile,
        `avatars/${crypto.randomUUID()}-${pictureFile.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      );
    } else if (String(data.remove_profile_picture || "") === "true") {
      update.profile_picture = null;
    }

    update.updated_at = new Date().toISOString();
    const saved = await store.update("users", user.id, update);
    const dataAll = await loadData();
    const deptById = new Map(dataAll.departments.map((d) => [d.id, d]));
    const progById = new Map(dataAll.programs.map((p) => [p.id, p]));
    return res.json(
      userOut({
        ...saved,
        department_name: deptById.get(saved.department_id)?.name ?? null,
        program_name: progById.get(saved.program_id)?.name ?? null,
      }),
    );
  } catch (err) {
    console.error("me update error", err);
    return sendError(res, 400, "VALIDATION_ERROR", "Could not update profile.");
  }
});

// ---------------------------------------------------------------- departments / programs / courses

app.get("/api/departments/", authenticate, async (req, res) => {
  const dataAll = await loadData();
  return res.json(paginatedResponse(dataAll.departments.map(departmentOut), req.query, "/departments/"));
});

app.get("/api/departments/:id/programs/", authenticate, async (req, res) => {
  const dataAll = await loadData();
  const dept = await store.findById("departments", req.params.id);
  if (!dept) return res.status(404).json({ detail: "Not found." });
  const programs = dataAll.programs.filter((p) => p.department_id === dept.id);
  return res.json(programs.map(programOut));
});

app.get("/api/programs/", authenticate, async (req, res) => {
  const dataAll = await loadData();
  return res.json(paginatedResponse(dataAll.programs.map(programOut), req.query, "/programs/"));
});

app.get("/api/programs/:id/courses/", authenticate, async (req, res) => {
  const dataAll = await loadData();
  const program = await store.findById("programs", req.params.id);
  if (!program) return res.status(404).json({ detail: "Not found." });
  const courses = dataAll.courses.filter((c) => c.program_id === program.id);
  return res.json(courses.map(courseOut));
});

app.get("/api/courses/", authenticate, async (req, res) => {
  const dataAll = await loadData();
  return res.json(paginatedResponse(dataAll.courses.map(courseOut), req.query, "/courses/"));
});

// ---------------------------------------------------------------- users

app.get("/api/users/", authenticate, loadUserForRequest, async (req, res) => {
  const dataAll = await loadData();
  let rows = dataAll.users;
  const role = req.query.role;
  const department = String(req.query.department || "");
  const search = String(req.query.search || "");
  if (role === "student") rows = rows.filter((u) => u.role === "student");
  else if (role === "lecturer") rows = rows.filter((u) => u.role === "lecturer");
  else if (role === "admin") rows = rows.filter((u) => u.role === "admin");
  if (department) {
    rows = rows.filter((u) => (u.department_name || "").toLowerCase() === department.toLowerCase());
  }
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s) ||
        (u.student_id || "").toLowerCase().includes(s),
    );
  }
  return res.json(paginatedResponse(rows.map(userOut), req.query, "/users/"));
});

app.post("/api/users/", authenticate, loadUserForRequest, upload.any(), async (req, res) => {
  if (req.user.role !== "admin") {
    return sendError(res, 403, "PERMISSION_DENIED", "You do not have permission to perform this action.");
  }
  const data = req.body ?? {};
  const fullName = String(data.full_name || "").trim();
  if (!fullName) return validationError(res, { full_name: ["This field is required."] });
  const role = data.role || "student";
  const dataAll = await loadData();
  const deptName = String(data.department_name || "");
  const progName = String(data.program_name || "");
  let department = deptName
    ? dataAll.departments.find((d) => d.name.toLowerCase() === deptName.toLowerCase()) ?? null
    : null;
  if (deptName && !department) {
    department = { id: await store.nextId("departments"), name: deptName };
    await store.insert("departments", department);
    dataAll.departments.push(department);
  }
  let program = null;
  if (progName && department) {
    program = dataAll.programs.find((p) => p.name === progName && p.department_id === department.id) ?? null;
    if (!program) {
      program = { id: await store.nextId("programs"), name: progName, department_id: department.id };
      await store.insert("programs", program);
      dataAll.programs.push(program);
    }
  }
  let email = String(data.email || "").trim();
  let studentId = role === "student" ? String(data.student_id || "") : "";
  let staffId = role === "lecturer" ? String(data.staff_id || "") : "";
  if (role === "student" && (!studentId || dataAll.users.some((u) => u.role === "student" && u.student_id === studentId))) {
    studentId = generateStudentId(dataAll.users.filter((u) => u.role === "student"), department, program);
  }
  if (role === "lecturer" && (!staffId || dataAll.users.some((u) => u.role === "lecturer" && u.staff_id === staffId))) {
    staffId = generateStaffId(dataAll.users.filter((u) => u.role === "lecturer"), department);
  }
  if (!email) email = generateUniversityEmail(role === "student" ? studentId : staffId);
  if (dataAll.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return validationError(res, { email: ["A user with that email already exists."] });
  }
  const pictureFile = findFile(req, "profile_picture");
  const profilePicture = pictureFile
    ? await storeFile(req, pictureFile, `avatars/${crypto.randomUUID()}-${pictureFile.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`)
    : null;
  const now = new Date().toISOString();
  const user = {
    id: await store.nextId("users"),
    full_name: fullName,
    email,
    role,
    student_id: role === "student" ? studentId : null,
    staff_id: role === "lecturer" ? staffId : null,
    department_id: department?.id ?? null,
    program_id: program?.id ?? null,
    level: role === "student" ? Number(data.level) || 100 : null,
    semester: role === "student" ? Number(data.semester) || 1 : null,
    phone_number: String(data.phone_number || ""),
    date_of_birth: data.date_of_birth || null,
    gender: String(data.gender || ""),
    nationality: String(data.nationality || ""),
    address: String(data.address || ""),
    profile_picture: profilePicture,
    is_active: data.is_active !== "false" && data.is_active !== false,
    is_staff: false,
    password: hashPassword(String(data.password || "") || generateTempPassword()),
    created_at: now,
    updated_at: now,
  };
  await store.insert("users", user);
  if (role === "student") await syncEnrollments(user);
  const deptById = new Map(dataAll.departments.map((d) => [d.id, d]));
  const progById = new Map(dataAll.programs.map((p) => [p.id, p]));
  return res.status(201).json(
    userOut({
      ...user,
      department_name: deptById.get(user.department_id)?.name ?? null,
      program_name: progById.get(user.program_id)?.name ?? null,
    }),
  );
});

app.get("/api/users/:id/", authenticate, loadUserForRequest, async (req, res) => {
  if (req.user.role !== "admin" && req.user.id !== Number(req.params.id)) {
    return sendError(res, 403, "PERMISSION_DENIED", "You do not have permission to perform this action.");
  }
  const dataAll = await loadData();
  const user = dataAll.users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ detail: "Not found." });
  return res.json(userOut(user));
});

app.put("/api/users/:id/", authenticate, loadUserForRequest, upload.any(), async (req, res) => {
  if (req.user.role !== "admin" && req.user.id !== Number(req.params.id)) {
    return sendError(res, 403, "PERMISSION_DENIED", "You do not have permission to perform this action.");
  }
  const data = req.body ?? {};
  const dataAll = await loadData();
  const user = dataAll.users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ detail: "Not found." });

  const studentId = String(data.student_id || "");
  if (studentId && user.role === "student" && dataAll.users.some((u) => u.role === "student" && u.id !== user.id && u.student_id === studentId)) {
    return validationError(res, { student_id: ["This student ID is already in use."] });
  }
  const staffId = String(data.staff_id || "");
  if (staffId && user.role === "lecturer" && dataAll.users.some((u) => u.role === "lecturer" && u.id !== user.id && u.staff_id === staffId)) {
    return validationError(res, { staff_id: ["This staff ID is already in use."] });
  }

  const update = { ...user, updated_at: new Date().toISOString() };
  if (data.full_name !== undefined) update.full_name = String(data.full_name || "");
  if (data.email !== undefined) {
    const email = String(data.email || "").trim();
    if (dataAll.users.some((u) => u.id !== user.id && u.email.toLowerCase() === email.toLowerCase())) {
      return validationError(res, { email: ["A user with that email already exists."] });
    }
    update.email = email;
  }
  if (data.phone_number !== undefined) update.phone_number = String(data.phone_number || "");
  if (data.date_of_birth !== undefined) update.date_of_birth = data.date_of_birth || null;
  if (data.gender !== undefined) update.gender = String(data.gender || "");
  if (data.nationality !== undefined) update.nationality = String(data.nationality || "");
  if (data.address !== undefined) update.address = String(data.address || "");
  if (data.is_active !== undefined) update.is_active = data.is_active === "true" || data.is_active === true;

  const deptName = String(data.department_name || "");
  if (deptName) {
    let dept = dataAll.departments.find((d) => d.name.toLowerCase() === deptName.toLowerCase());
    if (!dept) {
      dept = { id: await store.nextId("departments"), name: deptName };
      await store.insert("departments", dept);
      dataAll.departments.push(dept);
    }
    update.department_id = dept.id;
  }
  const progName = String(data.program_name || "");
  if (progName && update.department_id) {
    let prog = dataAll.programs.find((p) => p.name === progName && p.department_id === update.department_id);
    if (!prog) {
      prog = { id: await store.nextId("programs"), name: progName, department_id: update.department_id };
      await store.insert("programs", prog);
      dataAll.programs.push(prog);
    }
    update.program_id = prog.id;
  }
  if (user.role === "student") {
    if (studentId) update.student_id = studentId;
    if (data.level !== undefined) update.level = Number(data.level) || 100;
    if (data.semester !== undefined) update.semester = Number(data.semester) || 1;
  }
  if (user.role === "lecturer" && staffId) update.staff_id = staffId;

  const pictureFile = findFile(req, "profile_picture");
  if (pictureFile) {
    update.profile_picture = await storeFile(req, pictureFile, `avatars/${crypto.randomUUID()}-${pictureFile.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  } else if (String(data.remove_profile_picture || "") === "true") {
    update.profile_picture = null;
  }
  if (data.password) update.password = hashPassword(String(data.password));

  const saved = await store.update("users", user.id, update);
  if (saved.role === "student") await syncEnrollments(saved);
  const deptById = new Map(dataAll.departments.map((d) => [d.id, d]));
  const progById = new Map(dataAll.programs.map((p) => [p.id, p]));
  return res.json(
    userOut({
      ...saved,
      department_name: deptById.get(saved.department_id)?.name ?? null,
      program_name: progById.get(saved.program_id)?.name ?? null,
    }),
  );
});

app.delete("/api/users/:id/", authenticate, loadUserForRequest, async (req, res) => {
  if (req.user.role !== "admin" && req.user.id !== Number(req.params.id)) {
    return sendError(res, 403, "PERMISSION_DENIED", "You do not have permission to perform this action.");
  }
  await store.remove("users", Number(req.params.id));
  return res.status(204).send();
});

app.post("/api/users/:id/reset_password/", authenticate, loadUserForRequest, requireRole("admin"), async (req, res) => {
  const user = await store.findById("users", req.params.id);
  if (!user) return res.status(404).json({ detail: "Not found." });
  const password = generateTempPassword();
  await store.update("users", user.id, { password: hashPassword(password), updated_at: new Date().toISOString() });
  return res.json({ password });
});

// ---------------------------------------------------------------- students / lecturers

app.get("/api/students/", authenticate, async (req, res) => {
  const dataAll = await loadData();
  let rows = dataAll.users.filter((u) => u.role === "student");
  const department = String(req.query.department || "");
  const search = String(req.query.search || "");
  if (department) rows = rows.filter((u) => (u.department_name || "").toLowerCase() === department.toLowerCase());
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s) ||
        (u.student_id || "").toLowerCase().includes(s),
    );
  }
  return res.json(paginatedResponse(rows.map(userOut), req.query, "/students/"));
});

app.get("/api/lecturers/", authenticate, loadUserForRequest, async (req, res) => {
  if (req.user.role !== "admin") {
    return sendError(res, 403, "PERMISSION_DENIED", "You do not have permission to perform this action.");
  }
  const dataAll = await loadData();
  let rows = dataAll.users.filter((u) => u.role === "lecturer");
  const department = String(req.query.department || "");
  const search = String(req.query.search || "");
  if (department) rows = rows.filter((u) => (u.department_name || "").toLowerCase() === department.toLowerCase());
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s),
    );
  }
  return res.json(paginatedResponse(rows.map(userOut), req.query, "/lecturers/"));
});

// ---------------------------------------------------------------- materials

async function handleMaterialWrite(req, res, existingId) {
  const data = req.body ?? {};
  const title = String(data.title || "").trim();
  const mtype = String(data.type || "");
  const courseCode = String(data.course_code || "");
  if (!title) return validationError(res, { title: ["This field is required."] });
  if (!courseCode) return validationError(res, { course_code: ["This field is required."] });

  const dataAll = await loadData();
  const course = dataAll.courses.find((c) => c.course_code.toLowerCase() === courseCode.toLowerCase());
  if (!course) return validationError(res, { course_code: ["Invalid pk \"0\" - object does not exist."] });

  let fileUrl = data.file_url || "";
  let fileHash = data.file_hash || "";
  const file = findFile(req, "file");
  if (file) {
    const destPath = `materials/${crypto.randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    fileUrl = await storeFile(req, file, destPath);
    const digest = crypto.createHash("sha256");
    digest.update(file.buffer);
    fileHash = digest.digest("hex");
  }
  const sizeMb = data.size_mb !== undefined ? String(data.size_mb) : file ? (file.size / (1024 * 1024)).toFixed(1) : "0.0";

  const now = new Date().toISOString();

  if (existingId) {
    const existing = dataAll.materials.find((m) => m.id === Number(existingId));
    if (!existing) return res.status(404).json({ detail: "Not found." });
    const saved = await store.update("materials", existing.id, {
      title,
      type: mtype,
      course_id: course.id,
      level: Number(data.level) || existing.level,
      semester: Number(data.semester) || existing.semester,
      file_url: fileUrl || existing.file_url,
      file_hash: fileHash || existing.file_hash,
      file_ext: String(data.file_ext || existing.file_ext || "PDF"),
      size_mb: sizeMb,
      uploaded_by_id: req.user.id,
    });
    return res.json(materialOut({ ...dataAll.materials.find((m) => m.id === saved.id), ...saved }, saved.uploaded_by_id ? dataAll.userById.get(saved.uploaded_by_id)?.full_name ?? "" : ""));
  }

  if (fileHash) {
    const dup = dataAll.materials.find((m) => m.course_id === course.id && m.file_hash === fileHash);
    if (dup) {
      const saved = await store.update("materials", dup.id, {
        title,
        type: mtype,
        level: Number(data.level) || dup.level,
        semester: Number(data.semester) || dup.semester,
        file_url: fileUrl,
        file_hash: fileHash,
        file_ext: String(data.file_ext || dup.file_ext || "PDF"),
        size_mb: sizeMb,
        uploaded_by_id: req.user.id,
      });
      return res.status(201).json(materialOut({ ...dup, ...saved }, dataAll.userById.get(saved.uploaded_by_id)?.full_name ?? ""));
    }
  }

  const material = {
    id: await store.nextId("materials"),
    title,
    type: mtype,
    course_id: course.id,
    level: Number(data.level) || 0,
    semester: Number(data.semester) || 0,
    file_url: fileUrl,
    file_hash: fileHash,
    file_ext: String(data.file_ext || "PDF"),
    size_mb: sizeMb,
    uploaded_by_id: req.user.id,
    download_count: 0,
    created_at: now,
  };
  await store.insert("materials", material);
  return res.status(201).json(materialOut(material, req.user.full_name));
}

app.get("/api/materials/", authenticate, async (req, res) => {
  const dataAll = await loadData();
  let rows = dataAll.materials;
  const q = String(req.query.q || "").trim().toLowerCase();
  const department = String(req.query.department || "");
  const program = String(req.query.program || "");
  const level = String(req.query.level || "");
  const semester = String(req.query.semester || "");
  const courseCode = String(req.query.course_code || "");
  const mtype = String(req.query.type || "");
  const uploadedBy = String(req.query.uploaded_by || "");
  if (q) {
    rows = rows.filter(
      (m) =>
        (m.title || "").toLowerCase().includes(q) ||
        (m.course_code || "").toLowerCase().includes(q) ||
        (m.course_title || "").toLowerCase().includes(q),
    );
  }
  if (department) rows = rows.filter((m) => (m.department_name || "").toLowerCase() === department.toLowerCase());
  if (program) rows = rows.filter((m) => (m.program_name || "").toLowerCase() === program.toLowerCase());
  if (level) rows = rows.filter((m) => String(m.level) === level);
  if (semester) rows = rows.filter((m) => String(m.semester) === semester);
  if (courseCode) rows = rows.filter((m) => (m.course_code || "").toLowerCase() === courseCode.toLowerCase());
  if (mtype) rows = rows.filter((m) => m.type === mtype);
  if (uploadedBy && /^\d+$/.test(uploadedBy)) rows = rows.filter((m) => String(m.uploaded_by_id) === uploadedBy);
  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return res.json(
    paginatedResponse(
      rows.map((m) => materialOut(m, m.uploaded_by_name)),
      req.query,
      "/materials/",
    ),
  );
});

app.post("/api/materials/", authenticate, loadUserForRequest, upload.any(), async (req, res) => {
  if (!["lecturer", "admin"].includes(req.user.role)) {
    return sendError(res, 403, "PERMISSION_DENIED", "You do not have permission to perform this action.");
  }
  return handleMaterialWrite(req, res, null);
});

app.get("/api/materials/:id/", authenticate, async (req, res) => {
  const dataAll = await loadData();
  const material = dataAll.materials.find((m) => m.id === Number(req.params.id));
  if (!material) return res.status(404).json({ detail: "Not found." });
  return res.json(materialOut(material, material.uploaded_by_name));
});

app.put("/api/materials/:id/", authenticate, loadUserForRequest, upload.any(), async (req, res) => {
  if (!["lecturer", "admin"].includes(req.user.role)) {
    return sendError(res, 403, "PERMISSION_DENIED", "You do not have permission to perform this action.");
  }
  return handleMaterialWrite(req, res, req.params.id);
});

app.delete("/api/materials/:id/", authenticate, loadUserForRequest, async (req, res) => {
  if (!["lecturer", "admin"].includes(req.user.role)) {
    return sendError(res, 403, "PERMISSION_DENIED", "You do not have permission to perform this action.");
  }
  await store.remove("materials", Number(req.params.id));
  return res.status(204).send();
});

app.get("/api/materials/:id/download/", authenticate, async (req, res) => {
  const material = await store.findById("materials", req.params.id);
  if (!material) return res.status(404).json({ detail: "Not found." });
  const saved = await store.update("materials", material.id, {
    download_count: (material.download_count || 0) + 1,
  });
  return res.json({ file_url: saved.file_url, download_count: saved.download_count });
});

// ---------------------------------------------------------------- notifications

app.get("/api/notifications/", authenticate, loadUserForRequest, async (req, res) => {
  const dataAll = await loadData();
  const rows = dataAll.notifications
    .filter((n) => (n.recipient_id ? n.recipient_id === req.user.id : true) || n.broadcast)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return res.json(paginatedResponse(rows.map(notificationOut), req.query, "/notifications/"));
});

app.post("/api/notifications/", authenticate, loadUserForRequest, upload.any(), async (req, res) => {
  if (!["lecturer", "admin"].includes(req.user.role)) {
    return sendError(res, 403, "PERMISSION_DENIED", "You do not have permission to perform this action.");
  }
  const data = req.body ?? {};
  const title = String(data.title || "").trim();
  const body = String(data.body || "").trim();
  if (!title) return validationError(res, { title: ["This field is required."] });
  if (!body) return validationError(res, { body: ["This field is required."] });
  const notification = {
    id: await store.nextId("notifications"),
    title,
    body,
    kind: data.kind || "system",
    recipient_id: null,
    broadcast: true,
    read: false,
    created_at: new Date().toISOString(),
  };
  await store.insert("notifications", notification);
  return res.status(201).json(notificationOut(notification));
});

app.put("/api/notifications/:id/read/", authenticate, async (req, res) => {
  const notification = await store.findById("notifications", req.params.id);
  if (!notification) return res.status(404).json({ detail: "Not found." });
  const saved = await store.update("notifications", notification.id, { read: true });
  return res.json(notificationOut(saved));
});

app.post("/api/notifications/read_all/", authenticate, loadUserForRequest, async (req, res) => {
  const dataAll = await loadData();
  const rows = dataAll.notifications.filter((n) => (n.recipient_id ? n.recipient_id === req.user.id : true) || n.broadcast);
  let updated = 0;
  for (const n of rows) {
    if (!n.read) {
      await store.update("notifications", n.id, { read: true });
      updated += 1;
    }
  }
  return res.json({ updated });
});

// ---------------------------------------------------------------- assignments / enrollments

app.get("/api/assignments/", authenticate, async (req, res) => {
  const dataAll = await loadData();
  let rows = dataAll.assignments;
  const lecturer = String(req.query.lecturer || "");
  if (lecturer) rows = rows.filter((a) => String(a.lecturer_id) === lecturer);
  const out = rows
    .map((a) => {
      const course = dataAll.courses.find((c) => c.id === a.course_id);
      const lecturerUser = dataAll.users.find((u) => u.id === a.lecturer_id);
      if (!course || !lecturerUser) return null;
      return assignmentOut(a, course, lecturerUser);
    })
    .filter(Boolean);
  return res.json(paginatedResponse(out, req.query, "/assignments/"));
});

app.post("/api/assignments/", authenticate, loadUserForRequest, requireRole("admin"), async (req, res) => {
  const courseId = Number(req.body?.course_id);
  const lecturerId = Number(req.body?.lecturer_id);
  if (!courseId) return validationError(res, { course_id: ["This field is required."] });
  if (!lecturerId) return validationError(res, { lecturer_id: ["This field is required."] });
  const dataAll = await loadData();
  const course = dataAll.courses.find((c) => c.id === courseId);
  const lecturer = dataAll.users.find((u) => u.id === lecturerId && u.role === "lecturer");
  if (!course) return validationError(res, { course_id: ["Invalid pk \"0\" - object does not exist."] });
  if (!lecturer) return validationError(res, { lecturer_id: ["Invalid pk \"0\" - object does not exist."] });
  const dup = dataAll.assignments.find((a) => a.course_id === courseId && a.lecturer_id === lecturerId);
  if (dup) return validationError(res, { non_field_errors: ["The fields course, lecturer must make a unique set."] });
  const assignment = {
    id: await store.nextId("assignments"),
    course_id: courseId,
    lecturer_id: lecturerId,
    created_at: new Date().toISOString(),
  };
  await store.insert("assignments", assignment);
  return res.status(201).json(assignmentOut(assignment, course, lecturer));
});

app.delete("/api/assignments/:id/", authenticate, loadUserForRequest, requireRole("admin"), async (req, res) => {
  await store.remove("assignments", Number(req.params.id));
  return res.status(204).send();
});

app.get("/api/enrollments/", authenticate, async (req, res) => {
  const dataAll = await loadData();
  let rows = dataAll.enrollments;
  const student = String(req.query.student || "");
  if (student) rows = rows.filter((e) => String(e.student_id) === student);
  const out = rows
    .map((e) => {
      const course = dataAll.courses.find((c) => c.id === e.course_id);
      const studentUser = dataAll.users.find((u) => u.id === e.student_id);
      if (!course || !studentUser) return null;
      return enrollmentOut(e, course, studentUser);
    })
    .filter(Boolean);
  return res.json(paginatedResponse(out, req.query, "/enrollments/"));
});

app.post("/api/enrollments/", authenticate, loadUserForRequest, requireRole("admin"), async (req, res) => {
  const courseId = Number(req.body?.course_id);
  const studentId = Number(req.body?.student_id);
  if (!courseId) return validationError(res, { course_id: ["This field is required."] });
  if (!studentId) return validationError(res, { student_id: ["This field is required."] });
  const dataAll = await loadData();
  const course = dataAll.courses.find((c) => c.id === courseId);
  const student = dataAll.users.find((u) => u.id === studentId && u.role === "student");
  if (!course) return validationError(res, { course_id: ["Invalid pk \"0\" - object does not exist."] });
  if (!student) return validationError(res, { student_id: ["Invalid pk \"0\" - object does not exist."] });
  const dup = dataAll.enrollments.find((e) => e.course_id === courseId && e.student_id === studentId);
  if (dup) return validationError(res, { non_field_errors: ["The fields course, student must make a unique set."] });
  const enrollment = {
    id: await store.nextId("enrollments"),
    course_id: courseId,
    student_id: studentId,
    created_at: new Date().toISOString(),
  };
  await store.insert("enrollments", enrollment);
  return res.status(201).json(enrollmentOut(enrollment, course, student));
});

app.delete("/api/enrollments/:id/", authenticate, loadUserForRequest, requireRole("admin"), async (req, res) => {
  await store.remove("enrollments", Number(req.params.id));
  return res.status(204).send();
});

// ---------------------------------------------------------------- admin stats

app.get("/api/admin/stats/", authenticate, loadUserForRequest, requireRole("admin"), async (req, res) => {
  const dataAll = await loadData();
  const users = dataAll.users;
  const materials = dataAll.materials;
  const storageMb = materials.reduce((sum, m) => sum + (Number(m.size_mb) || 0), 0);
  const byRole = {
    student: users.filter((u) => u.role === "student").length,
    lecturer: users.filter((u) => u.role === "lecturer").length,
    admin: users.filter((u) => u.role === "admin").length,
  };
  const byDept = dataAll.departments.map((dept) => ({
    department: dept.name,
    count: materials.filter((m) => m.department_name === dept.name).length,
  }));
  const recent = [...users]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
  return res.json({
    total_users: users.length,
    total_students: byRole.student,
    total_lecturers: byRole.lecturer,
    total_materials: materials.length,
    storage_mb: storageMb,
    inactive_users: users.filter((u) => !u.is_active).length,
    total_courses: dataAll.courses.length,
    total_assignments: dataAll.assignments.length,
    users_by_role: byRole,
    materials_by_department: byDept,
    recent_users: recent.map(userOut),
  });
});

// ---------------------------------------------------------------- health

app.get("/api/health/", async (req, res) => {
  return res.json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } });
});

// ---------------------------------------------------------------- curriculum

async function syncEnrollments(user) {
  if (user.role !== "student" || !user.program_id) return;
  const dataAll = await loadData();
  const program = dataAll.programs.find((p) => p.id === user.program_id);
  if (!program) return;
  const codes = curriculumCourseCodes(program.name, user.level, user.semester);
  const current = dataAll.enrollments.filter((e) => e.student_id === user.id);
  const keep = [];
  for (const code of codes) {
    const course = dataAll.courses.find((c) => c.course_code === code);
    if (!course) continue;
    let existing = current.find((e) => e.course_id === course.id);
    if (!existing) {
      existing = {
        id: await store.nextId("enrollments"),
        course_id: course.id,
        student_id: user.id,
        created_at: new Date().toISOString(),
      };
      await store.insert("enrollments", existing);
    }
    keep.push(existing.id);
  }
  for (const e of current) {
    if (!keep.includes(e.id)) await store.remove("enrollments", e.id);
  }
}

export default app;