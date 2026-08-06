"""
URL configuration for cdar_backend project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from core import views

router = DefaultRouter()
router.register("departments", views.DepartmentViewSet, basename="department")
router.register("programs", views.ProgramViewSet, basename="program")
router.register("courses", views.CourseViewSet, basename="course")
router.register("users", views.UserViewSet, basename="user")
router.register("students", views.StudentViewSet, basename="student")
router.register("lecturers", views.LecturerViewSet, basename="lecturer")
router.register("materials", views.MaterialViewSet, basename="material")
router.register("notifications", views.NotificationViewSet, basename="notification")
router.register("assignments", views.CourseAssignmentViewSet, basename="assignment")
router.register("enrollments", views.CourseEnrollmentViewSet, basename="enrollment")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", views.HealthView.as_view(), name="health"),
    path("api/admin/stats/", views.AdminStatsView.as_view(), name="admin-stats"),
    path("api/auth/register/", views.RegisterView.as_view(), name="auth-register"),
    path("api/auth/id-preview/", views.IdPreviewView.as_view(), name="auth-id-preview"),
    path("api/auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("api/auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", views.MeView.as_view(), name="auth-me"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
