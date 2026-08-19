const DEGREE_PREFIXES = {
  "PROFESSIONAL DIPLOMA": "PD",
  DIPLOMA: "PD",
  HND: "HND",
};

const BACHELOR_MARKERS = ["BSC", "BBA", "BENG", "BTECH", "BA", "B.A.", "BACHELOR"];

const PROGRAM_AREA_CODES = {
  "INFORMATION TECHNOLOGY": "IT",
  "INFORMATION SYSTEMS": "IS",
  "COMPUTER SCIENCE": "CS",
  "NETWORK ENGINEERING": "NET",
  NETWORKING: "NET",
  ACCOUNTING: "ACC",
  ENTREPRENEURSHIP: "ENT",
  ELECTRICAL: "EEE",
  ELECTRONIC: "EEE",
  BUSINESS: "BUS",
};

const STAFF_PREFIX = "LC";

export function generateTempPassword(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password;
  do {
    password = "";
    for (let i = 0; i < length; i += 1) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password));
  return password;
}

export function areaCode(program = null, department = null) {
  let source = "";
  if (program && program.name) source = program.name;
  else if (department && department.name) source = department.name;
  const upper = source.toUpperCase();
  for (const key of Object.keys(PROGRAM_AREA_CODES)) {
    if (upper.includes(key)) return PROGRAM_AREA_CODES[key];
  }
  const words = upper.split(/[^A-Za-z]+/).filter(Boolean);
  if (!words.length) return "GEN";
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3);
}

export function degreePrefix(program = null) {
  const name = (program ? program.name : "").toUpperCase();
  for (const marker of Object.keys(DEGREE_PREFIXES)) {
    if (name.includes(marker)) return DEGREE_PREFIXES[marker];
  }
  if (name && BACHELOR_MARKERS.some((m) => name.includes(m))) return "BC";
  return "BC";
}

export function admissionYear(createdAt = null) {
  const year = (createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear()).toString();
  return year.slice(-2);
}

export function generateUniversityEmail(identifier) {
  let slug = (identifier || "").replace(/\//g, "").toUpperCase();
  if (!slug) slug = `CDAR${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;
  return `${slug}@edu.com`;
}

function nextSequence(rows, field, base) {
  let max = 0;
  for (const row of rows) {
    const value = row[field];
    if (!value || !value.startsWith(`${base}/`)) continue;
    const tail = value.split("/").pop();
    if (/^\d+$/.test(tail)) max = Math.max(max, Number(tail));
  }
  return max + 1;
}

export function generateStudentId(students, department, program, createdAt = null) {
  const prefix = degreePrefix(program);
  const area = areaCode(program, department);
  const year = admissionYear(createdAt);
  const base = `${prefix}/${area}/${year}`;
  const seq = nextSequence(students, "student_id", base);
  return `${base}/${String(seq).padStart(2, "0")}`;
}

export function generateStaffId(lecturers, department) {
  const area = areaCode(null, department);
  const base = `${STAFF_PREFIX}/${area}`;
  const seq = nextSequence(lecturers, "staff_id", base);
  return `${base}/${String(seq).padStart(2, "0")}`;
}