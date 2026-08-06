import os

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.curriculum import sync_enrollments_for_student
from core.models import (
    Course,
    CourseAssignment,
    Department,
    Lecturer,
    Material,
    Notification,
    Program,
    Student,
    User,
)


class Command(BaseCommand):
    help = "Seed the database with CDAR demo data (mirrors src/lib/cdar-data.ts)."

    def handle(self, *args, **options):
        self.stdout.write("Seeding CDAR database...")

        depts = {}
        for name in [
            "ICT Networking",
            "Computer Science",
            "Electrical Engineering",
            "Business Administration",
            "Information Technology",
        ]:
            depts[name] = Department.objects.get_or_create(name=name)[0]

        programs = {}
        for dept, names in {
            "ICT Networking": ["BTech Network Engineering", "HND Networking"],
            "Computer Science": ["BSc Computer Science", "BSc Information Systems"],
            "Electrical Engineering": ["BEng Electrical & Electronic"],
            "Business Administration": ["BBA Entrepreneurship", "BBA Accounting"],
            "Information Technology": [
                "BTech Information Technology",
                "Bachelor of Science in Information Technology",
                "HND Information Technology",
                "Professional Diploma in Information Technology",
            ],
        }.items():
            for name in names:
                programs[name] = Program.objects.get_or_create(name=name, department=depts[dept])[0]

        course_specs = [
            ("ENTR301", "Entrepreneurship Development", "ICT Networking", "BTech Network Engineering"),
            ("NET305", "Routing & Switching Essentials", "ICT Networking", "BTech Network Engineering"),
            ("NET210", "Network Fundamentals", "ICT Networking", "HND Networking"),
            ("CSC201", "Data Structures & Algorithms", "Computer Science", "BSc Computer Science"),
            ("CSC111", "Introduction to Databases", "Computer Science", "BSc Computer Science"),
            ("CSC112", "Networking Fundamentals", "Computer Science", "BSc Computer Science"),
            ("CSC121", "Software Development Fundamentals", "Computer Science", "BSc Computer Science"),
            ("CSC122", "Computer Hardware Basics", "Computer Science", "BSc Computer Science"),
            ("CSC404", "Machine Learning Foundations", "Computer Science", "BSc Computer Science"),
            ("INF302", "Database Systems Design", "Computer Science", "BSc Information Systems"),
            ("EEE203", "Circuit Analysis II", "Electrical Engineering", "BEng Electrical & Electronic"),
            ("ACC101", "Principles of Accounting", "Business Administration", "BBA Accounting"),
            ("BIT231", "Web-Based Application Development with PHP", "Information Technology", "BTech Information Technology"),
            ("BIT233", "Systems Analysis and Design", "Information Technology", "BTech Information Technology"),
            ("BIT235", "Visual Basic.NET Programming", "Information Technology", "BTech Information Technology"),
            ("BIT237", "Computer Organisation & Architecture", "Information Technology", "BTech Information Technology"),
            ("BIT239", "Database Management System Using Oracle", "Information Technology", "BTech Information Technology"),
            ("BIT241", "Discrete Mathematics", "Information Technology", "BTech Information Technology"),
            ("BIT243", "Data Communications", "Information Technology", "BTech Information Technology"),
            ("BIT245", "Mini Project II", "Information Technology", "BTech Information Technology"),
            ("BIT230", "Java Programming", "Information Technology", "BTech Information Technology"),
            ("BIT232", "Human Computer Interaction", "Information Technology", "BTech Information Technology"),
            ("BIT236", "Software Engineering", "Information Technology", "BTech Information Technology"),
            ("BIT238", "Computer Networks", "Information Technology", "BTech Information Technology"),
            ("BIT240", "E-Commerce", "Information Technology", "BTech Information Technology"),
            ("BIT242", "Operating System Concepts", "Information Technology", "BTech Information Technology"),
            ("BMS208", "Mini Project III", "Information Technology", "BTech Information Technology"),
            ("DIA201", "Industrial Attachment II", "Information Technology", "BTech Information Technology"),
            ("DTM202", "Principles of Management", "Information Technology", "BTech Information Technology"),
            ("BIT311", "IT Professional Ethics", "Information Technology", "BTech Information Technology"),
            ("BIT323", "Advance Excel", "Information Technology", "BTech Information Technology"),
            ("BIT345", "Mini Project IV", "Information Technology", "BTech Information Technology"),
            ("BIT363", "Statistics for Data Science and Analytics", "Information Technology", "BTech Information Technology"),
            ("BIT365", "Advanced Web Tech", "Information Technology", "BTech Information Technology"),
            ("BIT367", "Database Design", "Information Technology", "BTech Information Technology"),
            # HND Networking
            ("NET101", "Computer Fundamentals", "ICT Networking", "HND Networking"),
            ("NET102", "Network Cabling & Infrastructure", "ICT Networking", "HND Networking"),
            ("NET110", "LAN Technologies", "ICT Networking", "HND Networking"),
            ("NET111", "PC Maintenance & Support", "ICT Networking", "HND Networking"),
            ("NET211", "Routing Basics", "ICT Networking", "HND Networking"),
            ("NET212", "IT Security Essentials", "ICT Networking", "HND Networking"),
            ("NET220", "WAN Technologies", "ICT Networking", "HND Networking"),
            ("NET221", "Wireless Networking", "ICT Networking", "HND Networking"),
            # HND Information Technology
            ("HTI101", "Computer Applications", "Information Technology", "HND Information Technology"),
            ("HTI102", "Computer Fundamentals & Hardware", "Information Technology", "HND Information Technology"),
            ("HTI103", "Programming in C", "Information Technology", "HND Information Technology"),
            ("HTI104", "Mathematics for Computing", "Information Technology", "HND Information Technology"),
            ("HTI105", "Web Development Fundamentals", "Information Technology", "HND Information Technology"),
            ("HTI106", "Introduction to Databases", "Information Technology", "HND Information Technology"),
            ("HTI107", "Communication & Study Skills", "Information Technology", "HND Information Technology"),
            ("HTI108", "Statistics for Business", "Information Technology", "HND Information Technology"),
            ("HTI201", "Systems Analysis & Design", "Information Technology", "HND Information Technology"),
            ("HTI202", "Networking Fundamentals", "Information Technology", "HND Information Technology"),
            ("HTI203", "Object-Oriented Programming with Java", "Information Technology", "HND Information Technology"),
            ("HTI204", "Multimedia Technology", "Information Technology", "HND Information Technology"),
            ("HTI205", "Web Application Development", "Information Technology", "HND Information Technology"),
            ("HTI206", "Database Systems Management", "Information Technology", "HND Information Technology"),
            ("HTI207", "Entrepreneurship & Small Business", "Information Technology", "HND Information Technology"),
            ("HTI208", "Industrial Attachment I", "Information Technology", "HND Information Technology"),
            # Professional Diploma in Information Technology
            ("PDT101", "Introduction to Information Technology", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT102", "Computer Applications & Office Tools", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT103", "Introduction to Programming", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT104", "IT Mathematics", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT105", "Web Design Essentials", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT106", "Database Fundamentals", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT107", "Networking Basics", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT108", "Business Communication", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT201", "Systems Analysis & Design", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT202", "Python Programming", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT203", "Database Design & Administration", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT204", "Project Management Fundamentals", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT205", "Web Applications Development", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT206", "IT Support & Maintenance", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT207", "E-Commerce Essentials", "Information Technology", "Professional Diploma in Information Technology"),
            ("PDT208", "Capstone Project", "Information Technology", "Professional Diploma in Information Technology"),
        ]
        courses = {}
        for code, title, dept, prog in course_specs:
            courses[code] = Course.objects.get_or_create(
                course_code=code,
                defaults={
                    "course_title": title,
                    "department": depts[dept],
                    "program": programs[prog],
                },
            )[0]

        user_specs = [
            ("UG20231024", "Ama Owusu", "ama.owusu@st.cdar.edu", "student", "ICT Networking", "BTech Network Engineering", 300, 1, True, "2025-09-14T10:00:00Z", "student123"),
            ("UG20231025", "Kwame Asante", "kwame.asante@st.cdar.edu", "student", "Computer Science", "BSc Computer Science", 200, 1, True, "2025-09-14T10:20:00Z", "student123"),
            ("UG20231088", "Efua Danquah", "efua.danquah@st.cdar.edu", "student", "Business Administration", "BBA Accounting", 100, 1, True, "2025-10-02T08:30:00Z", "student123"),
            (None, "Dr. K. Mensah", "k.mensah@cdar.edu", "lecturer", "ICT Networking", "BTech Network Engineering", 300, 1, True, "2024-08-01T09:00:00Z", "lecturer123"),
            (None, "Eng. A. Boateng", "a.boateng@cdar.edu", "lecturer", "ICT Networking", "BTech Network Engineering", 300, 1, True, "2024-08-01T09:05:00Z", "lecturer123"),
            (None, "Prof. L. Danso", "l.danso@cdar.edu", "lecturer", "Computer Science", "BSc Computer Science", 400, 2, True, "2023-07-11T09:00:00Z", "lecturer123"),
            (None, "Repository Administrator", "admin", "admin", "ICT Networking", "BTech Network Engineering", 300, 1, True, "2023-06-01T09:00:00Z", "admin"),
            ("UG20221001", "Yaw Frimpong", "yaw.frimpong@st.cdar.edu", "student", "Electrical Engineering", "BEng Electrical & Electronic", 200, 1, False, "2024-09-20T11:00:00Z", "student123"),
            ("UG20251099", "Nana A. Sarpong", "nana.sarpong@st.cdar.edu", "student", "Information Technology", "BTech Information Technology", 300, 1, True, "2025-09-15T09:00:00Z", "student123"),
            (None, "Mr. K. Ofori", "k.ofori@cdar.edu", "lecturer", "Information Technology", "BTech Information Technology", 300, 1, True, "2024-09-01T09:00:00Z", "lecturer123"),
            (None, "Mrs. A. Acheampong", "a.acheampong@cdar.edu", "lecturer", "Information Technology", "BTech Information Technology", 300, 1, True, "2024-09-01T09:05:00Z", "lecturer123"),
        ]
        users = {}
        for sid, name, email, role, dept, prog, level, sem, active, created, password in user_specs:
            if role == "admin":
                user, _ = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "full_name": name,
                        "is_active": active,
                        "is_staff": True,
                        "is_superuser": True,
                    },
                )
            elif role == "student":
                user, _ = Student.objects.get_or_create(
                    email=email,
                    defaults={
                        "student_id": sid,
                        "full_name": name,
                        "department": depts[dept],
                        "program": programs[prog],
                        "level": level,
                        "semester": sem,
                        "is_active": active,
                    },
                )
            else:
                user, _ = Lecturer.objects.get_or_create(
                    email=email,
                    defaults={
                        "full_name": name,
                        "department": depts[dept],
                        "is_active": active,
                    },
                )
            user.created_at = timezone.datetime.fromisoformat(created.replace("Z", "+00:00"))
            user.set_password(password)
            user.save()
            users[email] = user

        profile_specs = {
            "ama.owusu@st.cdar.edu": ("0244 100 234", "2003-04-12", "Female", "Ghanaian", "Accra, Ghana"),
            "kwame.asante@st.cdar.edu": ("0205 201 031", "2002-11-03", "Male", "Ghanaian", "Kumasi, Ghana"),
            "efua.danquah@st.cdar.edu": ("0263 108 409", "2005-07-19", "Female", "Ghanaian", "Takoradi, Ghana"),
            "yaw.frimpong@st.cdar.edu": ("0244 870 112", "2002-01-25", "Male", "Ghanaian", "Tamale, Ghana"),
            "nana.sarpong@st.cdar.edu": ("0248 660 355", "2004-09-30", "Male", "Ghanaian", "Accra, Ghana"),
            "k.mensah@cdar.edu": ("0244 555 001", "1978-03-08", "Male", "Ghanaian", "Accra, Ghana"),
            "a.boateng@cdar.edu": ("0205 444 222", "1982-06-21", "Male", "Ghanaian", "Cape Coast, Ghana"),
            "l.danso@cdar.edu": ("0243 908 117", "1970-12-05", "Male", "Ghanaian", "Kumasi, Ghana"),
            "k.ofori@cdar.edu": ("0264 228 905", "1985-02-14", "Male", "Ghanaian", "Tema, Ghana"),
            "a.acheampong@cdar.edu": ("0246 772 013", "1988-08-17", "Female", "Ghanaian", "Sunyani, Ghana"),
            "admin": ("0244 000 123", "1980-01-01", "Male", "Ghanaian", "Accra, Ghana"),
        }
        for email, (phone, dob, gender, nationality, address) in profile_specs.items():
            user = users.get(email)
            if user is None:
                continue
            user.phone_number = phone
            user.date_of_birth = timezone.datetime.strptime(dob, "%Y-%m-%d").date()
            user.gender = gender
            user.nationality = nationality
            user.address = address
            user.save()
            users[email] = user

        profile_images = {
            "ama.owusu@st.cdar.edu": "avatars/ama-owusu.jpg",
            "kwame.asante@st.cdar.edu": "avatars/kwame-asante.jpg",
            "efua.danquah@st.cdar.edu": "avatars/efua-danquah.jpg",
            "yaw.frimpong@st.cdar.edu": "avatars/yaw-frimpong.jpg",
            "nana.sarpong@st.cdar.edu": "avatars/nana-sarpong.jpg",
            "k.mensah@cdar.edu": "avatars/k-mensah.jpg",
            "a.boateng@cdar.edu": "avatars/a-boateng.jpg",
            "l.danso@cdar.edu": "avatars/l-danso.jpg",
            "k.ofori@cdar.edu": "avatars/k-ofori.jpg",
            "a.acheampong@cdar.edu": "avatars/a-acheampong.jpg",
            "admin": "avatars/admin.jpg",
        }
        for email, pic in profile_images.items():
            user = users.get(email)
            if user is None or not os.path.exists(os.path.join(settings.MEDIA_ROOT, pic)):
                continue
            user.profile_picture = pic
            user.save()

        material_specs = [
            ("ENTR 301 — Lecture Note 3: Market Entry Strategy", "lecture_note", "ENTR301", 300, 1, "PDF", 2.4, "k.mensah@cdar.edu", 214, "2026-02-10T09:15:00Z"),
            ("ENTR 301 — End of Semester Past Questions (2021–2025)", "past_question", "ENTR301", 300, 1, "PDF", 5.1, "k.mensah@cdar.edu", 692, "2026-02-12T11:02:00Z"),
            ("ENTR 301 — Group Assignment 2: Business Model Canvas", "assignment", "ENTR301", 300, 1, "DOCX", 0.6, "k.mensah@cdar.edu", 121, "2026-02-18T08:40:00Z"),
            ("NET 305 — OSPF & EIGRP Configuration Lab Manual", "manual", "NET305", 300, 1, "PDF", 8.9, "a.boateng@cdar.edu", 431, "2026-01-28T14:20:00Z"),
            ("NET 305 — Lecture Slides: VLANs and Trunking", "lecture_note", "NET305", 300, 1, "PPTX", 12.3, "a.boateng@cdar.edu", 288, "2026-02-02T10:05:00Z"),
            ("NET 305 — Mid-Semester Past Questions", "past_question", "NET305", 300, 1, "PDF", 1.8, "a.boateng@cdar.edu", 517, "2026-02-20T16:12:00Z"),
            ("NET 210 — Packet Tracer Tutorial: Building Your First LAN", "tutorial", "NET210", 200, 2, "PDF", 3.2, "a.boateng@cdar.edu", 356, "2026-01-15T09:00:00Z"),
            ("NET 210 — Cabling & Topology Practical Manual", "manual", "NET210", 200, 2, "PDF", 6.7, "a.boateng@cdar.edu", 199, "2026-01-22T13:35:00Z"),
            ("CSC 201 — Balanced Trees and Heaps (Notes 6)", "lecture_note", "CSC201", 200, 1, "PDF", 4.4, "l.danso@cdar.edu", 604, "2026-02-05T07:45:00Z"),
            ("CSC 201 — Past Questions Compilation", "past_question", "CSC201", 200, 1, "PDF", 3.9, "l.danso@cdar.edu", 812, "2026-02-09T12:10:00Z"),
            ("CSC 404 — Gradient Descent Tutorial Notebook Pack", "tutorial", "CSC404", 400, 2, "ZIP", 22.5, "l.danso@cdar.edu", 143, "2026-03-01T15:25:00Z"),
            ("CSC 404 — Final Year Project Report Template", "project", "CSC404", 400, 2, "DOCX", 1.1, "l.danso@cdar.edu", 977, "2026-03-04T09:30:00Z"),
            ("CSC 404 — Research Paper: Transformers in Low-Resource NLP", "research_paper", "CSC404", 400, 2, "PDF", 7.8, "l.danso@cdar.edu", 265, "2026-03-07T18:00:00Z"),
            ("INF 302 — Normalization Workshop (1NF → BCNF)", "lecture_note", "INF302", 300, 2, "PDF", 2.9, "l.danso@cdar.edu", 388, "2026-02-14T10:50:00Z"),
            ("INF 302 — SQL Practical Manual with Sample Schemas", "manual", "INF302", 300, 2, "PDF", 9.4, "l.danso@cdar.edu", 452, "2026-02-16T11:15:00Z"),
            ("EEE 203 — Thevenin & Norton Assignment Set", "assignment", "EEE203", 200, 1, "PDF", 1.3, "l.danso@cdar.edu", 176, "2026-01-19T08:20:00Z"),
            ("EEE 203 — Past Questions with Worked Solutions", "past_question", "EEE203", 200, 1, "PDF", 6.2, "l.danso@cdar.edu", 641, "2026-01-26T17:05:00Z"),
            ("ACC 101 — Trial Balance Lecture Notes", "lecture_note", "ACC101", 100, 1, "PDF", 2.1, "l.danso@cdar.edu", 523, "2026-01-10T09:10:00Z"),
            ("ACC 101 — Ledger Posting Tutorial Sheets", "tutorial", "ACC101", 100, 1, "DOCX", 0.9, "l.danso@cdar.edu", 310, "2026-01-13T14:00:00Z"),
            ("ACC 101 — Semester Past Questions Bundle", "past_question", "ACC101", 100, 1, "ZIP", 11.6, "l.danso@cdar.edu", 738, "2026-01-30T15:45:00Z"),
            ("BIT 231 — PHP & MySQL: Getting Started Lecture Notes", "lecture_note", "BIT231", 200, 1, "PDF", 3.1, "k.ofori@cdar.edu", 402, "2026-02-04T10:10:00Z"),
            ("BIT 231 — Session Management & Forms Assignment", "assignment", "BIT231", 200, 1, "DOCX", 0.8, "k.ofori@cdar.edu", 186, "2026-02-11T09:30:00Z"),
            ("BIT 233 — Use-Case & Class Diagram Tutorial Sheets", "tutorial", "BIT233", 200, 1, "PDF", 2.2, "a.acheampong@cdar.edu", 253, "2026-02-06T14:00:00Z"),
            ("BIT 235 — Object-Oriented Programming in Visual Basic .NET", "lecture_note", "BIT235", 200, 1, "PDF", 4.0, "k.ofori@cdar.edu", 331, "2026-02-08T11:20:00Z"),
            ("BIT 237 — Processor Datapath & Control Past Questions", "past_question", "BIT237", 200, 1, "PDF", 2.9, "a.acheampong@cdar.edu", 471, "2026-02-13T16:40:00Z"),
            ("BIT 239 — Oracle SQL: DDL & DML Practical Manual", "manual", "BIT239", 200, 1, "PDF", 5.4, "a.acheampong@cdar.edu", 519, "2026-02-05T13:10:00Z"),
            ("BIT 239 — PL/SQL Block Programming Past Questions", "past_question", "BIT239", 200, 1, "PDF", 3.3, "a.acheampong@cdar.edu", 388, "2026-02-15T10:05:00Z"),
            ("BIT 241 — Set Theory & Propositional Logic Exercise Pack", "assignment", "BIT241", 200, 1, "PDF", 1.6, "k.ofori@cdar.edu", 217, "2026-02-09T08:50:00Z"),
            ("BIT 243 — OSI Model & Transmission Media Lecture Notes", "lecture_note", "BIT243", 200, 1, "PDF", 3.7, "k.ofori@cdar.edu", 294, "2026-02-03T09:25:00Z"),
            ("BIT 230 — Java Collections & Exception Handling Tutorial", "tutorial", "BIT230", 200, 2, "PDF", 3.0, "k.ofori@cdar.edu", 366, "2026-07-08T10:30:00Z"),
            ("BIT 230 — Object-Oriented Programming in Java Notes", "lecture_note", "BIT230", 200, 2, "PDF", 4.5, "k.ofori@cdar.edu", 421, "2026-07-05T09:00:00Z"),
            ("BIT 238 — Subnetting Practice Past Questions", "past_question", "BIT238", 200, 2, "PDF", 2.4, "a.acheampong@cdar.edu", 534, "2026-07-11T15:20:00Z"),
            ("BIT 240 — E-Commerce Architecture Assignment", "assignment", "BIT240", 200, 2, "PDF", 1.2, "k.ofori@cdar.edu", 143, "2026-07-09T12:45:00Z"),
            ("BIT 367 — ER Modelling & Normalization Lecture Notes", "lecture_note", "BIT367", 300, 1, "PDF", 3.9, "a.acheampong@cdar.edu", 456, "2026-02-16T09:35:00Z"),
            ("BIT 367 — Database Design Past Questions (2022–2026)", "past_question", "BIT367", 300, 1, "PDF", 4.7, "a.acheampong@cdar.edu", 512, "2026-02-18T11:15:00Z"),
            ("BIT 365 — REST APIs & Frontend Integration Lab Manual", "manual", "BIT365", 300, 1, "PDF", 6.8, "k.ofori@cdar.edu", 347, "2026-02-14T14:55:00Z"),
            ("BIT 245 — Mini Project II Report Template", "project", "BIT245", 200, 1, "DOCX", 1.4, "a.acheampong@cdar.edu", 198, "2026-02-10T08:20:00Z"),
            ("BIT 236 — Agile & Scrum in Software Engineering", "lecture_note", "BIT236", 200, 2, "PDF", 3.5, "k.ofori@cdar.edu", 289, "2026-07-06T13:40:00Z"),
            ("BIT 311 — Professional Ethics Case Study Pack", "lecture_note", "BIT311", 300, 1, "PDF", 2.8, "k.ofori@cdar.edu", 244, "2026-02-07T10:40:00Z"),
            # HND Networking materials
            ("NET 101 — Computer Fundamentals Lecture Notes", "lecture_note", "NET101", 100, 1, "PDF", 2.2, "a.boateng@cdar.edu", 176, "2026-01-12T09:00:00Z"),
            ("NET 102 — Structured Cabling Practice Manual", "manual", "NET102", 100, 1, "PDF", 5.8, "a.boateng@cdar.edu", 143, "2026-01-18T11:30:00Z"),
            ("NET 110 — Building a LAN in Packet Tracer Tutorial", "tutorial", "NET110", 100, 2, "PDF", 3.4, "a.boateng@cdar.edu", 121, "2026-01-20T14:00:00Z"),
            ("NET 211 — Static & Default Routing Past Questions", "past_question", "NET211", 200, 1, "PDF", 2.1, "a.boateng@cdar.edu", 168, "2026-02-17T10:20:00Z"),
            ("NET 212 — Security Hardening Checklist Manual", "manual", "NET212", 200, 1, "PDF", 4.6, "a.boateng@cdar.edu", 132, "2026-02-21T09:45:00Z"),
            # HND Information Technology materials
            ("HTI 101 — Word & Spreadsheet Practical Sheets", "manual", "HTI101", 100, 1, "PDF", 3.0, "k.ofori@cdar.edu", 254, "2026-01-11T08:30:00Z"),
            ("HTI 103 — C Programming Basics Tutorial Pack", "tutorial", "HTI103", 100, 1, "PDF", 2.7, "k.ofori@cdar.edu", 289, "2026-01-14T10:00:00Z"),
            ("HTI 105 — HTML/CSS Getting Started Lecture Notes", "lecture_note", "HTI105", 100, 2, "PDF", 3.3, "k.ofori@cdar.edu", 214, "2026-01-21T13:15:00Z"),
            ("HTI 202 — OSI Model & Topologies Lecture Notes", "lecture_note", "HTI202", 200, 1, "PDF", 3.6, "a.acheampong@cdar.edu", 187, "2026-02-04T09:10:00Z"),
            ("HTI 205 — PHP Forms & Sessions Assignment", "assignment", "HTI205", 200, 2, "DOCX", 0.9, "k.ofori@cdar.edu", 156, "2026-07-10T09:00:00Z"),
            ("HTI 206 — SQL DDL/DML Practical Manual", "manual", "HTI206", 200, 2, "PDF", 5.1, "a.acheampong@cdar.edu", 143, "2026-07-12T10:30:00Z"),
            # Professional Diploma in Information Technology materials
            ("PDT 101 — Introduction to IT Lecture Notes", "lecture_note", "PDT101", 100, 1, "PDF", 2.5, "k.ofori@cdar.edu", 198, "2026-01-10T08:00:00Z"),
            ("PDT 103 — Python Basics Tutorial Pack", "tutorial", "PDT103", 100, 1, "PDF", 3.1, "k.ofori@cdar.edu", 165, "2026-01-15T09:20:00Z"),
            ("PDT 105 — Responsive Web Design Past Questions", "past_question", "PDT105", 100, 2, "PDF", 2.3, "a.acheampong@cdar.edu", 142, "2026-01-22T12:00:00Z"),
            ("PDT 202 — Python Data Structures Assignment", "assignment", "PDT202", 200, 1, "PDF", 1.2, "k.ofori@cdar.edu", 128, "2026-02-09T08:40:00Z"),
            ("PDT 204 — Project Charter Template Pack", "project", "PDT204", 200, 1, "DOCX", 1.0, "a.acheampong@cdar.edu", 117, "2026-02-13T11:50:00Z"),
            ("PDT 205 — Full-Stack CRUD Lab Manual", "manual", "PDT205", 200, 2, "PDF", 6.2, "k.ofori@cdar.edu", 134, "2026-07-11T14:20:00Z"),
            ("PDT 206 — PC Diagnostics & Troubleshooting Manual", "manual", "PDT206", 200, 2, "PDF", 4.9, "a.acheampong@cdar.edu", 121, "2026-07-13T09:35:00Z"),
        ]
        for title, mtype, code, level, sem, ext, size, uploader, dl, created in material_specs:
            material, _ = Material.objects.get_or_create(
                title=title,
                defaults={
                    "type": mtype,
                    "course": courses[code],
                    "level": level,
                    "semester": sem,
                    "file_url": f"https://cdn.cdar.edu/files/{code.lower()}-{title.split()[0]}{ext.lower()}",
                    "file_ext": ext,
                    "size_mb": size,
                    "uploaded_by": users[uploader],
                    "download_count": dl,
                },
            )
            material.created_at = timezone.datetime.fromisoformat(created.replace("Z", "+00:00"))
            material.save()

        notification_specs = [
            ("New past questions for NET 305", "Eng. A. Boateng uploaded “Mid-Semester Past Questions” to NET305, Level 300, Semester 1.", "new_material", False, "2026-02-20T16:12:00Z"),
            ("Upload confirmed", "Your file “ENTR 301 — Group Assignment 2” was published successfully and is now downloadable.", "upload_confirmed", False, "2026-02-18T08:41:00Z"),
            ("New lecture notes for INF 302", "Dr. G. Appiah added “Normalization Workshop (1NF → BCNF)”.", "new_material", False, "2026-02-14T10:52:00Z"),
            ("Scheduled maintenance", "The repository will be read-only on Sunday 02:00–03:00 GMT for planned storage maintenance.", "system", True, "2026-02-11T07:00:00Z"),
            ("New research paper in CSC 404", "Prof. L. Danso shared “Transformers in Low-Resource NLP”.", "new_material", True, "2026-03-07T18:02:00Z"),
        ]
        for title, body, kind, read, created in notification_specs:
            notif, _ = Notification.objects.get_or_create(
                title=title,
                defaults={"body": body, "kind": kind, "broadcast": True, "read": read},
            )
            notif.created_at = timezone.datetime.fromisoformat(created.replace("Z", "+00:00"))
            notif.save()

        assignment_specs = [
            ("ENTR301", "k.mensah@cdar.edu"),
            ("NET305", "a.boateng@cdar.edu"),
            ("NET210", "a.boateng@cdar.edu"),
            ("CSC201", "l.danso@cdar.edu"),
            ("CSC404", "l.danso@cdar.edu"),
            ("INF302", "l.danso@cdar.edu"),
            ("EEE203", "l.danso@cdar.edu"),
            ("ACC101", "l.danso@cdar.edu"),
            ("BIT231", "k.ofori@cdar.edu"),
            ("BIT233", "a.acheampong@cdar.edu"),
            ("BIT235", "k.ofori@cdar.edu"),
            ("BIT239", "a.acheampong@cdar.edu"),
            ("BIT241", "k.ofori@cdar.edu"),
            ("BIT230", "k.ofori@cdar.edu"),
            ("BIT238", "a.acheampong@cdar.edu"),
            ("BIT240", "k.ofori@cdar.edu"),
            ("BIT367", "a.acheampong@cdar.edu"),
            ("BIT365", "k.ofori@cdar.edu"),
        ]
        for code, email in assignment_specs:
            CourseAssignment.objects.get_or_create(
                course=courses[code],
                lecturer=users[email],
            )

        for student in Student.objects.all():
            sync_enrollments_for_student(student)

        self.stdout.write(self.style.SUCCESS("Seed complete."))
