from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group

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
    User,
)

admin.site.unregister(Group)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("email", "full_name", "role", "is_active", "is_staff")
    ordering = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name",)}),
        ("Status", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "full_name", "password1", "password2")}),
    )


@admin.register(Student)
class StudentAdmin(UserAdmin):
    list_display = ("full_name", "student_id", "email", "department", "level", "semester", "is_active")
    ordering = ("full_name",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name", "student_id", "department", "program", "level", "semester")}),
        ("Status", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "full_name", "password1", "password2")}),
    )


@admin.register(Lecturer)
class LecturerAdmin(UserAdmin):
    list_display = ("full_name", "email", "department", "is_active")
    ordering = ("full_name",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name", "department")}),
        ("Status", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "full_name", "password1", "password2")}),
    )


admin.site.register(Department)
admin.site.register(Program)
admin.site.register(Course)


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "type", "level", "semester", "download_count")
    list_filter = ("type", "level", "semester")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "broadcast", "read")


@admin.register(CourseAssignment)
class CourseAssignmentAdmin(admin.ModelAdmin):
    list_display = ("course", "lecturer", "created_at")
    list_filter = ("course__department",)


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("course", "student", "created_at")
    list_filter = ("course__department",)
