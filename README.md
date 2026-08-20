# StudySphere Hub

CENTRALIZED DIGITAL ACADEMIC REPOSITORY

(CDAR)

System & API Documentation

Version 1.0

Prepared for Development & Integration Teams




 




1. Introduction

University students routinely face difficulty locating essential academic materials, including lecture notes, past examination questions, assignments, practical manuals, project reports, tutorials, and research papers. Materials are typically scattered across lecturer emails, physical handouts, and informal shared drives, making them slow to find and easy to lose.

The Centralized Digital Academic Repository (CDAR) addresses this by providing a single, structured, web- and mobile-accessible platform where academic materials are uploaded, categorized, and retrieved on demand.

2. Problem Statement

Students currently lack a single, reliable source for academic materials, resulting in:

•      Time lost searching multiple informal channels for course materials

•      Inconsistent access to past examination questions and revision resources

•      Loss or unavailability of materials due to reliance on personal devices or ad-hoc file sharing

•      No standardized way to organize materials by department, program, level, semester, or course

3. Proposed Solution

CDAR is a centralized digital repository — accessible via web and mobile — that stores and distributes academic material in an organized, searchable structure. Lecturers upload materials; the system categorizes them; students search, browse, and download instantly.

4. Core Features

•      Login and registration (students and lecturers)

•      Material upload (lecturers/admins)

•      Material download (students)

•      Search and filter by department, program, level, semester, and course code

•      User management (roles, profiles, permissions)

•      Notification system (new material alerts, upload confirmations)

5. System Workflow

Step 1 — Upload

Lecturers upload assignments, lecture notes, past questions, and practical manuals through the lecturer dashboard.

Step 2 — Categorization

The system automatically organizes each upload according to Department, Program, Level, Semester, and Course Code. Example:

Department: ICT Networking Level: 300 Semester: 1 Course: ENTR 301 Materials: Lecture Notes, Past Questions, Assignments

Step 3 — Authentication

Students log in using their Student ID or university email, plus a password. Access tokens are issued on successful login (see Section 8, Authentication).

Step 4 — Search & Download

Students search or browse the categorized catalog and download the material they need instantly.

6. System Architecture

CDAR follows a layered client–server architecture designed for concurrent multi-user access, secure file transmission, and remote availability.

•      Client layer: Web application and mobile app (student and lecturer interfaces)

•      Network layer: Internet/Wi-Fi → Firewall → Load Balancer

•      Application layer: Nginx-fronted application server exposing the REST API described in Section 8

•      Data layer: MySQL database (users, courses, metadata) plus cloud object storage for files (PDF/DOCX/PPTX)

Hosting model: the repository is deployed on a cloud server, allowing multiple simultaneous users, encrypted (HTTPS) file transmission, and remote access from anywhere, with a hybrid on-campus option available if required.

Students (Mobile App / Web App)         │   Internet / Wi-Fi         │      Firewall         │    Load Balancer         │    Nginx (App Server / API)         │   ┌─────┴─────┐   │           │ MySQL DB   Cloud Storage (Users,    (PDFs / DOCx /  Courses,   Project files)  Metadata)

7. Database Schema (Core Entities)

7.1 users

Column

Type

Constraints

Notes

id

BIGINT

PK, AUTO_INCREMENT

Unique user identifier

student_id

VARCHAR(20)

UNIQUE, NULLABLE

Set for students only

full_name

VARCHAR(120)

NOT NULL

 

email

VARCHAR(150)

UNIQUE, NOT NULL

University email

password_hash

VARCHAR(255)

NOT NULL

Bcrypt/Argon2 hash — never plaintext

role

ENUM

NOT NULL

student | lecturer | admin

department_id

BIGINT

FK → departments.id

 

created_at

DATETIME

NOT NULL

 

7.2 materials

Column

Type

Constraints

Notes

id

BIGINT

PK, AUTO_INCREMENT

Unique material identifier

title

VARCHAR(200)

NOT NULL

 

type

ENUM

NOT NULL

lecture_note | past_question | assignment | manual | project | tutorial | research_paper

course_id

BIGINT

FK → courses.id

 

level

INT

NOT NULL

e.g. 100, 200, 300, 400

semester

TINYINT

NOT NULL

1 or 2

file_url

VARCHAR(500)

NOT NULL

Cloud storage object key/URL

uploaded_by

BIGINT

FK → users.id

Lecturer/admin who uploaded it

download_count

INT

DEFAULT 0

 

created_at

DATETIME

NOT NULL

 

7.3 courses

Column

Type

Constraints

Notes

id

BIGINT

PK, AUTO_INCREMENT

 

course_code

VARCHAR(20)

UNIQUE, NOT NULL

e.g. ENTR301

course_title

VARCHAR(150)

NOT NULL

 

department_id

BIGINT

FK → departments.id

 

program_id

BIGINT

FK → programs.id

 

8. API Documentation

CDAR exposes a versioned, JSON-based REST API. All endpoints are prefixed with the base path below.

Base URL: https://api.cdar.edu/v1

All request and response bodies use Content-Type: application/json, except file uploads/downloads which use multipart/form-data and binary streams respectively.

8.1 Authentication

CDAR uses JSON Web Tokens (JWT). Clients authenticate once via /auth/login or /auth/register, then send the access token on every subsequent request:

Authorization: Bearer <access_token>

Access tokens expire after 1 hour; refresh tokens expire after 30 days and are used to obtain a new access token without re-entering credentials.

Method

Endpoint

Description

Auth

POST

/auth/register

Register a new student or lecturer account

No

POST

/auth/login

Authenticate with student ID/email + password; returns tokens

No

POST

/auth/refresh

Exchange a valid refresh token for a new access token

No

POST

/auth/logout

Invalidate the current refresh token

Yes

GET

/auth/me

Return the currently authenticated user's profile

Yes

POST /auth/login — Request Body

Field

Type

Description

identifier

string

Student ID or university email

password

string

Account password

POST /auth/login — Response 200

{   "access_token": "eyJhbGciOi...",   "refresh_token": "d41d8cd98f...",   "expires_in": 3600,   "user": {     "id": 1024,     "full_name": "Ama Owusu",     "role": "student",     "department": "ICT Networking"   } }

8.2 Materials

Method

Endpoint

Description

Auth

GET

/materials

List materials with optional filters (see query params below)

Yes

GET

/materials/search?q=

Full-text search across titles and course codes

Yes

GET

/materials/{id}

Retrieve metadata for a single material

Yes

POST

/materials

Upload a new material (multipart/form-data)

Yes — Lecturer/Admin

PUT

/materials/{id}

Update material metadata

Yes — Owner/Admin

DELETE

/materials/{id}

Remove a material

Yes — Owner/Admin

GET

/materials/{id}/download

Stream/download the file; increments download_count

Yes

GET /materials — Query Parameters

Parameter

Type

Description

department

string

Filter by department name or ID

program

string

Filter by program

level

integer

e.g. 100, 200, 300, 400

semester

integer

1 or 2

course_code

string

e.g. ENTR301

type

string

lecture_note | past_question | assignment | manual | project | tutorial | research_paper

page / page_size

integer

Pagination controls (defaults: page=1, page_size=20)

POST /materials — Request Body (multipart/form-data)

Field

Type

Description

title

string

Material title

type

string

One of the material type enum values

course_code

string

Associated course code

level

integer

Academic level

semester

integer

1 or 2

file

file

PDF, DOCX, PPTX, or ZIP — max size configured server-side

Example Response — GET /materials/482

{   "id": 482,   "title": "ENTR 301 — Lecture Note 3: Market Entry Strategy",   "type": "lecture_note",   "course_code": "ENTR301",   "department": "ICT Networking",   "level": 300,   "semester": 1,   "file_url": "https://cdn.cdar.edu/files/entr301-note3.pdf",   "uploaded_by": "Dr. K. Mensah",   "download_count": 214,   "created_at": "2026-02-10T09:15:00Z" }

8.3 Categories (Departments, Programs, Courses)

Method

Endpoint

Description

Auth

GET

/departments

List all departments

Yes

GET

/departments/{id}/programs

List programs under a department

Yes

GET

/programs/{id}/courses

List courses under a program

Yes

GET

/courses/{id}

Retrieve a single course's details

Yes

8.4 User Management

Method

Endpoint

Description

Auth

GET

/users

List users (paginated, filterable by role/department)

Yes — Admin

GET

/users/{id}

Retrieve a single user's profile

Yes — Self/Admin

PUT

/users/{id}

Update profile details

Yes — Self/Admin

DELETE

/users/{id}

Deactivate/remove a user account

Yes — Admin

8.5 Notifications

Method

Endpoint

Description

Auth

GET

/notifications

List notifications for the current user

Yes

POST

/notifications

Create a notification (e.g. new-material broadcast)

Yes — Lecturer/Admin

PUT

/notifications/{id}/read

Mark a notification as read

Yes

8.6 Standard Response Envelope

Successful list endpoints wrap results with pagination metadata:

{   "data": [ { "...": "..." } ],   "meta": {     "page": 1,     "page_size": 20,     "total_items": 137,     "total_pages": 7   } }

Errors follow a consistent shape:

{   "error": {     "code": "VALIDATION_ERROR",     "message": "The 'course_code' field is required.",     "details": { "field": "course_code" }   } }

8.7 HTTP Status Codes

Code

Status

Meaning

200

OK

Request succeeded.

201

Created

Resource created successfully (e.g. material uploaded).

400

Bad Request

Validation failed — missing/invalid fields.

401

Unauthorized

Missing or invalid/expired access token.

403

Forbidden

Authenticated but not permitted to perform this action (role restriction).

404

Not Found

Resource does not exist.

409

Conflict

Duplicate resource (e.g. email already registered).

413

Payload Too Large

Uploaded file exceeds the configured size limit.

422

Unprocessable Entity

Well-formed request but semantically invalid (e.g. unsupported file type).

429

Too Many Requests

Rate limit exceeded.

500

Internal Server Error

Unexpected server-side failure.

9. Security Considerations

•      Passwords stored using a salted hash (bcrypt or Argon2) — never plaintext

•      All traffic served over HTTPS/TLS; the architecture terminates TLS at the load balancer/Nginx layer

•      JWT access tokens short-lived (1 hour); refresh tokens revocable server-side on logout

•      Role-based access control: student, lecturer, admin — enforced on every write endpoint

•      File uploads validated by type and size before being written to cloud storage

•      Rate limiting on authentication endpoints to mitigate brute-force attempts

10. Non-Functional Requirements

•      Support concurrent access from multiple simultaneous users without degradation

•      Remote access from any location with internet connectivity

•      Horizontal scalability via the load balancer in front of the application server

•      Target uptime: 99.5% or better for the cloud-hosted deployment

11. Conclusion

CDAR consolidates academic materials into a single, categorized, and searchable repository, removing the friction students currently face locating lecture notes, past questions, and related resources. The REST API defined in Section 8 gives the web and mobile clients — and any future integrations — a consistent, versioned contract for authentication, material management, and search.



logo 

the site should contain the colors of the logo as well 

add a theme switcher 
note: all should be fully ui no backend

This project is a TanStack Start (React) + Nitro app deployed on Vercel, with an
embedded Express API server (`server/`) bridged into the app via srvx
`fetchNodeHandler` in `src/server.ts`.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
