import type { Material, Role } from "@/lib/cdar-data";

const API_BASE = "/api";

const ACCESS_KEY = "cdar-access";
const REFRESH_KEY = "cdar-refresh";

export type ApiUser = {
  id: number;
  student_id: string | null;
  staff_id: string | null;
  full_name: string;
  email: string;
  role: Role;
  department: string | null;
  program: string | null;
  level: number;
  semester: number;
  phone_number: string;
  date_of_birth: string | null;
  gender: string;
  nationality: string;
  address: string;
  profile_picture: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: ApiUser;
};

export type MaterialDto = {
  id: number;
  title: string;
  type: string;
  course_code: string;
  department: string;
  program: string;
  level: number;
  semester: number;
  file_url: string;
  file_ext: string;
  size_mb: string;
  file_hash?: string;
  uploaded_by: string;
  download_count: number;
  created_at: string;
};

export type CourseDto = {
  id: number;
  course_code: string;
  course_title: string;
  department: string;
  program: string;
};

export type NotificationDto = {
  id: number;
  title: string;
  body: string;
  kind: "new_material" | "upload_confirmed" | "system";
  read: boolean;
  created_at: string;
};

export type AssignmentDto = {
  id: number;
  course: CourseDto;
  lecturer: { id: number; full_name: string; email: string };
  created_at: string;
};

export type EnrollmentDto = {
  id: number;
  course: CourseDto;
  student: { id: number; full_name: string; email: string; student_id: string | null };
  created_at: string;
};

export type AdminStatsDto = {
  total_users: number;
  total_materials: number;
  storage_mb: number;
  inactive_users: number;
  total_courses: number;
  total_assignments: number;
  users_by_role: Record<string, number>;
  materials_by_department: { department: string; count: number }[];
  recent_users: ApiUser[];
};

export type MaterialFilters = {
  q?: string | undefined;
  department?: string | undefined;
  program?: string | undefined;
  level?: string | undefined;
  semester?: string | undefined;
  course_code?: string | undefined;
  type?: string | undefined;
  uploaded_by?: string | undefined;
};

export type UserFilters = {
  search?: string | undefined;
  role?: string | undefined;
  department?: string | undefined;
};

export class ApiError extends Error {
  status: number;
  code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function materialFromDto(m: MaterialDto): Material {
  return {
    ...m,
    type: m.type as Material["type"],
    size_mb: Number(m.size_mb),
    file_ext: m.file_ext as Material["file_ext"],
  };
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

type RequestOptions = RequestInit & { auth?: boolean };

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const body = await res.json();
      if (body?.error?.message) {
        message = body.error.message;
        code = body.error.code;
      } else if (body?.message) {
        message = body.message;
      } else if (body?.detail) {
        message = typeof body.detail === "string" ? body.detail : "Request failed";
      } else if (body && typeof body === "object") {
        for (const key of Object.keys(body)) {
          const v = (body as Record<string, unknown>)[key];
          if (Array.isArray(v) && v.length) {
            message = String(v[0]);
            break;
          }
        }
      }
    } catch {
      /* keep default message */
    }
    throw new ApiError(res.status, message, code);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function listRequest<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  let url: string = path;
  while (url) {
    const res = await rawRequest<{ results?: T[]; next?: string | null } | T[]>(url);
    if (Array.isArray(res)) {
      all.push(...res);
      break;
    }
    if (Array.isArray(res?.results)) all.push(...res.results);
    const next = res?.next;
    if (typeof next !== "string" || !next) break;
    url = stripOrigin(next);
  }
  return all;
}

function stripOrigin(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    let p = `${u.pathname}${u.search}`;
    if (p.startsWith(API_BASE)) p = p.slice(API_BASE.length);
    return p;
  } catch {
    return url;
  }
}

export async function apiLogin(identifier: string, password: string): Promise<LoginResponse> {
  return rawRequest<LoginResponse>("/auth/login/", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ identifier, password }),
  });
}

export async function apiRegister(payload: FormData): Promise<LoginResponse> {
  return rawRequest<LoginResponse>("/auth/register/", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

export async function apiIdPreview(payload: {
  role: "student" | "lecturer";
  department?: string;
  program?: string;
}): Promise<{ id: string | null }> {
  const params = new URLSearchParams();
  params.set("role", payload.role);
  if (payload.department) params.set("department", payload.department);
  if (payload.program) params.set("program", payload.program);
  return rawRequest<{ id: string | null }>(`/auth/id-preview/?${params.toString()}`);
}

export async function apiMe(): Promise<ApiUser> {
  return rawRequest<ApiUser>("/auth/me/");
}

export async function apiGetUser(id: number): Promise<ApiUser> {
  return rawRequest<ApiUser>(`/users/${id}/`);
}

export async function apiUpdateMe(payload: FormData): Promise<ApiUser> {
  return rawRequest<ApiUser>("/auth/me/", {
    method: "PUT",
    body: payload,
  });
}

export async function apiLogout(refresh?: string | null): Promise<void> {
  try {
    await rawRequest<void>("/auth/logout/", {
      method: "POST",
      body: JSON.stringify({ refresh }),
    });
  } catch {
    /* best-effort logout */
  }
}

export async function apiRefresh(refresh: string): Promise<{ access: string }> {
  return rawRequest<{ access: string }>("/auth/refresh/", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ refresh }),
  });
}

export async function apiDepartments(): Promise<{ id: number; name: string }[]> {
  return listRequest<{ id: number; name: string }>("/departments/");
}

export async function apiPrograms(): Promise<{ id: number; name: string; department: string }[]> {
  return listRequest("/programs/");
}

export async function apiCourses(): Promise<CourseDto[]> {
  return listRequest<CourseDto>("/courses/");
}

export async function apiListMaterials(filters: MaterialFilters = {}): Promise<MaterialDto[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return listRequest<MaterialDto>(`/materials/${query ? `?${query}` : ""}`);
}

export async function apiListUsers(filters: UserFilters = {}): Promise<ApiUser[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return listRequest<ApiUser>(`/users/${query ? `?${query}` : ""}`);
}

export async function apiListStudents(filters: UserFilters = {}): Promise<ApiUser[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return listRequest<ApiUser>(`/students/${query ? `?${query}` : ""}`);
}

export async function apiListLecturers(filters: UserFilters = {}): Promise<ApiUser[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return listRequest<ApiUser>(`/lecturers/${query ? `?${query}` : ""}`);
}

export async function apiUpdateUser(id: number, payload: FormData): Promise<ApiUser> {
  return rawRequest(`/users/${id}/`, { method: "PUT", body: payload });
}

export async function apiResetPassword(id: number): Promise<{ password: string }> {
  return rawRequest(`/users/${id}/reset_password/`, { method: "POST" });
}

export async function apiListNotifications(): Promise<NotificationDto[]> {
  return listRequest<NotificationDto>("/notifications/");
}

export async function apiMarkNotificationRead(id: number): Promise<NotificationDto> {
  return rawRequest(`/notifications/${id}/read/`, { method: "PUT" });
}

export async function apiMarkAllNotificationsRead(): Promise<{ updated: number }> {
  return rawRequest("/notifications/read_all/", { method: "POST" });
}

export async function apiAdminStats(): Promise<AdminStatsDto> {
  return rawRequest("/admin/stats/");
}

export async function apiListAssignments(lecturer?: string): Promise<AssignmentDto[]> {
  const query = lecturer ? `?lecturer=${lecturer}` : "";
  return listRequest<AssignmentDto>(`/assignments/${query}`);
}

export async function apiCreateAssignment(
  courseId: number,
  lecturerId: number,
): Promise<AssignmentDto> {
  return rawRequest("/assignments/", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId, lecturer_id: lecturerId }),
  });
}

export async function apiDeleteAssignment(id: number): Promise<void> {
  return rawRequest(`/assignments/${id}/`, { method: "DELETE" });
}

export async function apiListEnrollments(student?: number): Promise<EnrollmentDto[]> {
  const query = student ? `?student=${student}` : "";
  return listRequest<EnrollmentDto>(`/enrollments/${query}`);
}

export async function apiCreateEnrollment(
  courseId: number,
  studentId: number,
): Promise<EnrollmentDto> {
  return rawRequest("/enrollments/", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId, student_id: studentId }),
  });
}

export async function apiDeleteEnrollment(id: number): Promise<void> {
  return rawRequest(`/enrollments/${id}/`, { method: "DELETE" });
}

export async function apiUploadMaterial(formData: FormData): Promise<MaterialDto> {
  return rawRequest<MaterialDto>("/materials/", {
    method: "POST",
    auth: true,
    body: formData,
  });
}
