import hashlib

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Program(models.Model):
    name = models.CharField(max_length=150)
    department = models.ForeignKey(Department, related_name="programs", on_delete=models.CASCADE)

    class Meta:
        ordering = ["name"]
        unique_together = ("name", "department")

    def __str__(self):
        return self.name


class Course(models.Model):
    course_code = models.CharField(max_length=20, unique=True)
    course_title = models.CharField(max_length=150)
    department = models.ForeignKey(Department, related_name="courses", on_delete=models.PROTECT)
    program = models.ForeignKey(Program, related_name="courses", on_delete=models.PROTECT, null=True, blank=True)

    class Meta:
        ordering = ["course_code"]

    def __str__(self):
        return f"{self.course_code} — {self.course_title}"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Base auth record. Every student/lecturer is a User; admins are plain Users."""

    full_name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True, default="")
    nationality = models.CharField(max_length=100, blank=True, default="")
    address = models.CharField(max_length=200, blank=True, default="")
    profile_picture = models.ImageField(upload_to="avatars/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    @property
    def role(self):
        if hasattr(self, "student"):
            return "student"
        if hasattr(self, "lecturer"):
            return "lecturer"
        return "admin"

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Student(User):
    student_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    department = models.ForeignKey(
        Department, related_name="students", on_delete=models.SET_NULL, null=True, blank=True
    )
    program = models.ForeignKey(
        Program, related_name="students", on_delete=models.SET_NULL, null=True, blank=True
    )
    level = models.PositiveSmallIntegerField(default=100)
    semester = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Lecturer(User):
    staff_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    department = models.ForeignKey(
        Department, related_name="lecturers", on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Material(models.Model):
    class Type(models.TextChoices):
        LECTURE_NOTE = "lecture_note", "Lecture Note"
        PAST_QUESTION = "past_question", "Past Question"
        ASSIGNMENT = "assignment", "Assignment"
        MANUAL = "manual", "Practical Manual"
        PROJECT = "project", "Project Report"
        TUTORIAL = "tutorial", "Tutorial"
        RESEARCH_PAPER = "research_paper", "Research Paper"

    title = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=Type.choices)
    course = models.ForeignKey(Course, related_name="materials", on_delete=models.PROTECT)
    level = models.PositiveSmallIntegerField()
    semester = models.PositiveSmallIntegerField()
    file_url = models.CharField(max_length=500, blank=True, default="")
    file = models.FileField(upload_to="materials/", null=True, blank=True)
    file_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)
    file_ext = models.CharField(max_length=4, default="PDF")
    size_mb = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    uploaded_by = models.ForeignKey(
        User, related_name="materials", on_delete=models.SET_NULL, null=True, blank=True
    )
    download_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def compute_file_hash(self):
        if not self.file:
            return ""
        try:
            self.file.seek(0)
            digest = hashlib.sha256()
            for chunk in self.file.chunks():
                digest.update(chunk)
            self.file.seek(0)
            return digest.hexdigest()
        except Exception:
            return ""

    def save(self, *args, **kwargs):
        if self.file and (not self.file_hash or "update_fields" not in kwargs):
            self.file_hash = self.compute_file_hash()
        super().save(*args, **kwargs)


class Notification(models.Model):
    class Kind(models.TextChoices):
        NEW_MATERIAL = "new_material", "New Material"
        UPLOAD_CONFIRMED = "upload_confirmed", "Upload Confirmed"
        SYSTEM = "system", "System"

    title = models.CharField(max_length=200)
    body = models.TextField()
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.SYSTEM)
    recipient = models.ForeignKey(User, related_name="notifications", on_delete=models.CASCADE, null=True, blank=True)
    broadcast = models.BooleanField(default=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class CourseAssignment(models.Model):
    course = models.ForeignKey(Course, related_name="assignments", on_delete=models.CASCADE)
    lecturer = models.ForeignKey(User, related_name="course_assignments", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["course__course_code"]
        unique_together = ("course", "lecturer")

    def __str__(self):
        return f"{self.lecturer.full_name} → {self.course.course_code}"


class CourseEnrollment(models.Model):
    student = models.ForeignKey(
        Student, related_name="enrollments", on_delete=models.CASCADE
    )
    course = models.ForeignKey(Course, related_name="enrollments", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["course__course_code"]
        unique_together = ("course", "student")

    def __str__(self):
        return f"{self.student.full_name} → {self.course.course_code}"
