import hashlib

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .curriculum import sync_enrollments_for_student
from .ids import generate_staff_id, generate_student_id, generate_temp_password, generate_university_email
from .models import (
    Course,
    CourseAssignment,
    CourseEnrollment,
    Department,
    Lecturer,
    Material,
    Notification,
    Program,
    Student,
)

User = get_user_model()


def downcast_user(user):
    """Resolve a base User to its Student/Lecturer subclass when present."""
    if hasattr(user, "student"):
        return user.student
    if hasattr(user, "lecturer"):
        return user.lecturer
    return user


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name"]


class ProgramSerializer(serializers.ModelSerializer):
    department = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Program
        fields = ["id", "name", "department"]


class CourseSerializer(serializers.ModelSerializer):
    department = serializers.CharField(source="department.name", read_only=True)
    program = serializers.CharField(source="program.name", read_only=True)

    class Meta:
        model = Course
        fields = ["id", "course_code", "course_title", "department", "program"]


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    staff_id = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    program = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    semester = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "student_id",
            "staff_id",
            "full_name",
            "email",
            "role",
            "department",
            "program",
            "level",
            "semester",
            "phone_number",
            "date_of_birth",
            "gender",
            "nationality",
            "address",
            "profile_picture",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_role(self, obj):
        return obj.role

    def get_student_id(self, obj):
        return getattr(downcast_user(obj), "student_id", None)

    def get_staff_id(self, obj):
        return getattr(downcast_user(obj), "staff_id", None)

    def get_department(self, obj):
        return getattr(downcast_user(obj), "department", None).name if getattr(downcast_user(obj), "department", None) else None

    def get_program(self, obj):
        program = getattr(downcast_user(obj), "program", None)
        return program.name if program else None

    def get_level(self, obj):
        return getattr(downcast_user(obj), "level", None)

    def get_semester(self, obj):
        return getattr(downcast_user(obj), "semester", None)


class UserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    student_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    staff_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    department_name = serializers.CharField(write_only=True, required=False)
    program_name = serializers.CharField(write_only=True, required=False)
    role = serializers.ChoiceField(choices=["student", "lecturer"], write_only=True, required=False)
    level = serializers.IntegerField(required=False)
    semester = serializers.IntegerField(required=False)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    nationality = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    remove_profile_picture = serializers.BooleanField(required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "student_id",
            "staff_id",
            "full_name",
            "email",
            "password",
            "role",
            "department_name",
            "program_name",
            "level",
            "semester",
            "phone_number",
            "date_of_birth",
            "gender",
            "nationality",
            "address",
            "profile_picture",
            "remove_profile_picture",
            "is_active",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        dept_name = validated_data.pop("department_name", None)
        prog_name = validated_data.pop("program_name", None)
        role = validated_data.pop("role", "student")
        if dept_name:
            department = Department.objects.get_or_create(name=dept_name)[0]
        else:
            department = None
        program = None
        if prog_name and department:
            program = Program.objects.get_or_create(name=prog_name, department=department)[0]
        model = Student if role == "student" else Lecturer
        extra = {
            "full_name": validated_data.pop("full_name"),
            "is_active": validated_data.pop("is_active", True),
        }
        for field in ("phone_number", "date_of_birth", "gender", "nationality", "address", "profile_picture"):
            if field in validated_data:
                extra[field] = validated_data.pop(field)
        if model is Student:
            extra["student_id"] = validated_data.pop("student_id", None)
            extra["department"] = department
            extra["program"] = program
            extra["level"] = validated_data.pop("level", 100)
            extra["semester"] = validated_data.pop("semester", 1)
        else:
            extra["staff_id"] = validated_data.pop("staff_id", None)
            extra["department"] = department
        if model is Student:
            student_id = extra["student_id"] or ""
            if not student_id or Student.objects.filter(student_id=student_id).exists():
                extra["student_id"] = generate_student_id(department, program)
        else:
            staff_id = extra["staff_id"] or ""
            if not staff_id or Lecturer.objects.filter(staff_id=staff_id).exists():
                extra["staff_id"] = generate_staff_id(department)
        email = validated_data.pop("email", "") or ""
        if not email:
            email = generate_university_email(extra.get("student_id") or extra.get("staff_id") or "")
        user = model.objects.create_user(
            email=email,
            password=password or generate_temp_password(),
            **extra,
        )
        if model is Student:
            sync_enrollments_for_student(user)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        dept_name = validated_data.pop("department_name", None)
        prog_name = validated_data.pop("program_name", None)
        remove_picture = validated_data.pop("remove_profile_picture", False)
        student_id = validated_data.get("student_id")
        if (
            student_id
            and hasattr(instance, "student_id")
            and Student.objects.filter(student_id=student_id).exclude(pk=instance.pk).exists()
        ):
            raise serializers.ValidationError({"student_id": "This student ID is already in use."})
        staff_id = validated_data.get("staff_id")
        if (
            staff_id
            and hasattr(instance, "staff_id")
            and Lecturer.objects.filter(staff_id=staff_id).exclude(pk=instance.pk).exists()
        ):
            raise serializers.ValidationError({"staff_id": "This staff ID is already in use."})
        if dept_name:
            instance.department = Department.objects.get_or_create(name=dept_name)[0]
        if prog_name and instance.department:
            instance.program = Program.objects.get_or_create(
                name=prog_name, department=instance.department
            )[0]
        for attr, value in validated_data.items():
            if attr in ("role",):
                continue
            if hasattr(instance, attr):
                setattr(instance, attr, value)
        if remove_picture:
            if instance.profile_picture:
                instance.profile_picture.delete(save=False)
            instance.profile_picture = None
        if password:
            instance.set_password(password)
        instance.save()
        if hasattr(instance, "student"):
            sync_enrollments_for_student(instance.student)
        return instance


class RegisterSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)
    role = serializers.ChoiceField(choices=["student", "lecturer"])
    identifier = serializers.CharField(required=False, allow_blank=True)
    full_name = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True)
    student_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    staff_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    department_name = serializers.CharField(required=False, allow_blank=True)
    program_name = serializers.CharField(required=False, allow_blank=True)
    level = serializers.IntegerField(required=False, default=100)
    semester = serializers.IntegerField(required=False, default=1)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    nationality = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    def create(self, validated_data):
        password = validated_data.pop("password", None) or generate_temp_password()
        identifier = validated_data.pop("identifier", "")
        department_name = validated_data.pop("department_name", "")
        program_name = validated_data.pop("program_name", "")
        role = validated_data.pop("role", "student")
        department = None
        if department_name:
            department = Department.objects.get_or_create(name=department_name)[0]
        program = None
        if program_name and department:
            program = Program.objects.get_or_create(name=program_name, department=department)[0]
        email = validated_data.get("email") or ""
        full_name = validated_data["full_name"]
        profile = {
            "phone_number": validated_data.get("phone_number", ""),
            "date_of_birth": validated_data.get("date_of_birth", None),
            "gender": validated_data.get("gender", ""),
            "nationality": validated_data.get("nationality", ""),
            "address": validated_data.get("address", ""),
            "profile_picture": validated_data.get("profile_picture", None),
        }
        if role == "student":
            student_id = validated_data.get("student_id") or identifier or ""
            if not student_id or Student.objects.filter(student_id=student_id).exists():
                student_id = generate_student_id(department, program)
            if not email:
                email = generate_university_email(student_id)
            student = Student.objects.create_user(
                email=email,
                password=password,
                full_name=full_name,
                student_id=student_id,
                department=department,
                program=program,
                level=validated_data.get("level", 100),
                semester=validated_data.get("semester", 1),
                **profile,
            )
            sync_enrollments_for_student(student)
            return student
        staff_id = validated_data.get("staff_id") or ""
        if not staff_id or Lecturer.objects.filter(staff_id=staff_id).exists():
            staff_id = generate_staff_id(department)
        if not email:
            email = generate_university_email(staff_id)
        return Lecturer.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            staff_id=staff_id,
            department=department,
            **profile,
        )


class MaterialSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.course_code", read_only=True)
    department = serializers.CharField(source="course.department.name", read_only=True)
    program = serializers.CharField(source="course.program.name", read_only=True)
    uploaded_by = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = [
            "id",
            "title",
            "type",
            "course_code",
            "department",
            "program",
            "level",
            "semester",
            "file_url",
            "file",
            "file_ext",
            "size_mb",
            "file_hash",
            "uploaded_by",
            "download_count",
            "created_at",
        ]
        read_only_fields = ["download_count", "created_at"]

    def get_uploaded_by(self, obj):
        return obj.uploaded_by.full_name if obj.uploaded_by else ""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.file:
            data["file_url"] = instance.file.url
        return data


class MaterialWriteSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(write_only=True)

    class Meta:
        model = Material
        fields = [
            "id",
            "title",
            "type",
            "course_code",
            "level",
            "semester",
            "file",
            "file_ext",
            "size_mb",
        ]

    def create(self, validated_data):
        course_code = validated_data.pop("course_code")
        course = Course.objects.get(course_code=course_code)
        user = self.context["request"].user
        file = validated_data.get("file")
        file_hash = ""
        if file:
            try:
                file.seek(0)
                digest = hashlib.sha256()
                for chunk in file.chunks():
                    digest.update(chunk)
                file.seek(0)
                file_hash = digest.hexdigest()
            except Exception:
                file_hash = ""
        if file_hash:
            existing = Material.objects.filter(course=course, file_hash=file_hash).first()
            if existing:
                existing.title = validated_data.get("title", existing.title)
                existing.type = validated_data.get("type", existing.type)
                existing.level = validated_data.get("level", existing.level)
                existing.semester = validated_data.get("semester", existing.semester)
                existing.file_ext = validated_data.get("file_ext", existing.file_ext)
                existing.size_mb = validated_data.get("size_mb", existing.size_mb)
                if file and file.name:
                    existing.file.save(file.name, file, save=False)
                existing.uploaded_by = user
                existing.save()
                return existing
        return Material.objects.create(
            course=course, uploaded_by=user, file_hash=file_hash, **validated_data
        )


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "body", "kind", "read", "created_at"]


class AssignmentCourseSerializer(serializers.ModelSerializer):
    department = serializers.CharField(source="department.name", read_only=True)
    program = serializers.CharField(source="program.name", read_only=True)

    class Meta:
        model = Course
        fields = ["id", "course_code", "course_title", "department", "program"]


class AssignmentLecturerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lecturer
        fields = ["id", "full_name", "email"]


class CourseAssignmentSerializer(serializers.ModelSerializer):
    course = AssignmentCourseSerializer(read_only=True)
    lecturer = AssignmentLecturerSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source="course", write_only=True
    )
    lecturer_id = serializers.PrimaryKeyRelatedField(
        queryset=Lecturer.objects.all(),
        source="lecturer",
        write_only=True,
    )

    class Meta:
        model = CourseAssignment
        fields = ["id", "course", "lecturer", "course_id", "lecturer_id", "created_at"]


class EnrollmentStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ["id", "full_name", "email", "student_id"]


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    course = AssignmentCourseSerializer(read_only=True)
    student = EnrollmentStudentSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source="course", write_only=True
    )
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(),
        source="student",
        write_only=True,
    )

    class Meta:
        model = CourseEnrollment
        fields = ["id", "course", "student", "course_id", "student_id", "created_at"]
