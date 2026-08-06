"""Automatic course enrolment by program + level + semester.

Every programme runs a fixed repeating curriculum: each (program, level,
semester) combination has its own set of courses. A new Level 100 in Semester 1
studies the same courses the previous Level 100 cohort studied in Semester 1,
and so on for every level and semester.
"""

from .models import Course, CourseEnrollment

# (program name, level, semester) -> [course codes]
CURRICULUM = {
    # BSc Computer Science
    ("BSc Computer Science", 100, 1): ["CSC111", "CSC112"],
    ("BSc Computer Science", 100, 2): ["CSC121", "CSC122"],
    ("BSc Computer Science", 200, 1): ["CSC201"],
    ("BSc Computer Science", 400, 2): ["CSC404"],
    # BSc Information Systems
    ("BSc Information Systems", 300, 2): ["INF302"],
    # ICT Networking
    ("BTech Network Engineering", 300, 1): ["NET305", "ENTR301"],
    ("HND Networking", 100, 1): ["NET101", "NET102"],
    ("HND Networking", 100, 2): ["NET110", "NET111"],
    ("HND Networking", 200, 1): ["NET210", "NET211", "NET212"],
    ("HND Networking", 200, 2): ["NET220", "NET221"],
    # Electrical Engineering
    ("BEng Electrical & Electronic", 200, 1): ["EEE203"],
    # Business Administration
    ("BBA Accounting", 100, 1): ["ACC101"],
    # HND Information Technology
    ("HND Information Technology", 100, 1): ["HTI101", "HTI102", "HTI103", "HTI104"],
    ("HND Information Technology", 100, 2): ["HTI105", "HTI106", "HTI107", "HTI108"],
    ("HND Information Technology", 200, 1): ["HTI201", "HTI202", "HTI203", "HTI204"],
    ("HND Information Technology", 200, 2): ["HTI205", "HTI206", "HTI207", "HTI208"],
    # Professional Diploma in Information Technology
    ("Professional Diploma in Information Technology", 100, 1): ["PDT101", "PDT102", "PDT103", "PDT104"],
    ("Professional Diploma in Information Technology", 100, 2): ["PDT105", "PDT106", "PDT107", "PDT108"],
    ("Professional Diploma in Information Technology", 200, 1): ["PDT201", "PDT202", "PDT203", "PDT204"],
    ("Professional Diploma in Information Technology", 200, 2): ["PDT205", "PDT206", "PDT207", "PDT208"],
    # Information Technology
    ("BTech Information Technology", 200, 1): [
        "BIT231",
        "BIT233",
        "BIT235",
        "BIT237",
        "BIT239",
        "BIT241",
        "BIT243",
        "BIT245",
    ],
    ("BTech Information Technology", 200, 2): [
        "BIT230",
        "BIT232",
        "BIT236",
        "BIT238",
        "BIT240",
        "BIT242",
    ],
    ("BTech Information Technology", 300, 1): [
        "BIT311",
        "BIT323",
        "BIT363",
        "BIT367",
    ],
    ("BTech Information Technology", 300, 2): [
        "BIT345",
        "BIT365",
        "BMS208",
        "DTM202",
        "DIA201",
    ],
}


def curriculum_course_codes(student):
    """Return the list of course codes a student should be studying right now."""
    if student.program is None:
        return []
    return list(CURRICULUM.get((student.program.name, student.level, student.semester), []))


def sync_enrollments_for_student(student):
    """Replace a student's enrollments with their current term's curriculum.

    This is additive for the courses of the current (program, level, semester)
    and removes any courses from previous terms, so every student studies only
    the courses for the semester they are in right now.
    """
    if student is None:
        return
    codes = curriculum_course_codes(student)
    courses = {
        course.course_code: course
        for course in Course.objects.filter(course_code__in=codes)
    }
    for code in codes:
        course = courses.get(code)
        if course is not None:
            CourseEnrollment.objects.get_or_create(student=student, course=course)
    CourseEnrollment.objects.filter(student=student).exclude(
        course__course_code__in=codes
    ).delete()
