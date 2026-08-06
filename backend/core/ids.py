import re
import secrets
import string
from datetime import date

from .models import Lecturer, Student

DEGREE_PREFIXES = {
    "PROFESSIONAL DIPLOMA": "PD",
    "DIPLOMA": "PD",
    "HND": "HND",
}

BACHELOR_MARKERS = ("BSC", "BBA", "BENG", "BTECH", "BA", "B.A.", "BACHELOR")

PROGRAM_AREA_CODES = {
    "INFORMATION TECHNOLOGY": "IT",
    "INFORMATION SYSTEMS": "IS",
    "COMPUTER SCIENCE": "CS",
    "NETWORK ENGINEERING": "NET",
    "NETWORKING": "NET",
    "ACCOUNTING": "ACC",
    "ENTREPRENEURSHIP": "ENT",
    "ELECTRICAL": "EEE",
    "ELECTRONIC": "EEE",
    "BUSINESS": "BUS",
}

STAFF_PREFIX = "LC"


def generate_temp_password(length=8):
    chars = string.ascii_letters + string.digits
    while True:
        password = "".join(secrets.choice(chars) for _ in range(length))
        if any(c.isalpha() for c in password) and any(c.isdigit() for c in password):
            return password


def _area_code(program=None, department=None):
    source = ""
    if program is not None and getattr(program, "name", None):
        source = program.name
    elif department is not None and getattr(department, "name", None):
        source = department.name
    upper = source.upper()
    for key, code in PROGRAM_AREA_CODES.items():
        if key in upper:
            return code
    words = [w for w in re.split(r"[^A-Za-z]+", upper) if w]
    if not words:
        return "GEN"
    return "".join(w[0] for w in words)[:3]


def degree_prefix(program=None):
    name = (program.name if program is not None else "").upper()
    for marker, prefix in DEGREE_PREFIXES.items():
        if marker in name:
            return prefix
    if name and any(m in name for m in BACHELOR_MARKERS):
        return "BC"
    return "BC"


def admission_year(created_at=None):
    return str((created_at or date.today()).year)[-2:]


def generate_university_email(identifier):
    slug = (identifier or "").replace("/", "").upper()
    if not slug:
        slug = f"CDAR{secrets.randbelow(1000000):06d}"
    return f"{slug}@edu.com"


def _next_sequence(model, field, base):
    existing = model.objects.filter(**{f"{field}__startswith": base + "/"}).values_list(field, flat=True)
    numbers = []
    for value in existing:
        if not value:
            continue
        tail = value.rsplit("/", 1)[-1]
        if tail.isdigit():
            numbers.append(int(tail))
    return (max(numbers) + 1) if numbers else 1


def generate_student_id(department, program, created_at=None):
    prefix = degree_prefix(program)
    area = _area_code(program, department)
    year = admission_year(created_at)
    base = f"{prefix}/{area}/{year}"
    seq = _next_sequence(Student, "student_id", base)
    return f"{base}/{seq:02d}"


def generate_staff_id(department):
    area = _area_code(department=department)
    base = f"{STAFF_PREFIX}/{area}"
    seq = _next_sequence(Lecturer, "staff_id", base)
    return f"{base}/{seq:02d}"
