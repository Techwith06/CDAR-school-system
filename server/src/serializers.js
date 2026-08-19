export function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

export function departmentOut(d) {
  return { id: d.id, name: d.name };
}

export function programOut(p) {
  return { id: p.id, name: p.name, department: p.department_name ?? null };
}

export function courseOut(c) {
  return {
    id: c.id,
    course_code: c.course_code,
    course_title: c.course_title,
    department: c.department_name ?? null,
    program: c.program_name ?? null,
  };
}

export function userOut(u) {
  return {
    id: u.id,
    student_id: u.role === "student" ? (u.student_id ?? null) : null,
    staff_id: u.role === "lecturer" ? (u.staff_id ?? null) : null,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    department: u.department_name ?? null,
    program: u.program_name ?? null,
    level: u.level ?? null,
    semester: u.semester ?? null,
    phone_number: u.phone_number ?? "",
    date_of_birth: u.date_of_birth ?? null,
    gender: u.gender ?? "",
    nationality: u.nationality ?? "",
    address: u.address ?? "",
    profile_picture: u.profile_picture ?? null,
    is_active: Boolean(u.is_active),
    created_at: formatDate(u.created_at),
    updated_at: formatDate(u.updated_at),
  };
}

export function materialOut(m, uploadedByName) {
  return {
    id: m.id,
    title: m.title,
    type: m.type,
    course_code: m.course_code ?? null,
    department: m.department_name ?? null,
    program: m.program_name ?? null,
    level: m.level,
    semester: m.semester,
    file_url: m.file_url || "",
    file: m.file_url || null,
    file_ext: m.file_ext,
    size_mb: m.size_mb,
    file_hash: m.file_hash ?? "",
    uploaded_by: uploadedByName ?? "",
    download_count: m.download_count,
    created_at: formatDate(m.created_at),
  };
}

export function assignmentOut(a, course, lecturer) {
  return {
    id: a.id,
    course: courseOut(course),
    lecturer: { id: lecturer.id, full_name: lecturer.full_name, email: lecturer.email },
    created_at: formatDate(a.created_at),
  };
}

export function enrollmentOut(e, course, student) {
  return {
    id: e.id,
    course: courseOut(course),
    student: {
      id: student.id,
      full_name: student.full_name,
      email: student.email,
      student_id: student.student_id ?? null,
    },
    created_at: formatDate(e.created_at),
  };
}

export function notificationOut(n) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    kind: n.kind,
    read: Boolean(n.read),
    created_at: formatDate(n.created_at),
  };
}

export function paginate(rows, query = {}, route = "/") {
  const pageSize = 20;
  const page = Math.max(1, Number(query.page) || 1);
  const count = rows.length;
  const start = (page - 1) * pageSize;
  const results = rows.slice(start, start + pageSize);
  const next = start + pageSize < count ? `/api${route}?page=${page + 1}` : null;
  const previous = page > 1 ? `/api${route}?page=${page - 1}` : null;
  return { count, next, previous, results };
}