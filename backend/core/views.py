from django.contrib.auth import get_user_model
from django.db.models import Q, Sum
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

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
from .ids import generate_staff_id, generate_student_id, generate_temp_password
from .permissions import IsAdmin, IsAdminOrSelf, IsLecturerOrAdmin, IsOwnerOrAdmin
from .serializers import (
    CourseAssignmentSerializer,
    CourseEnrollmentSerializer,
    CourseSerializer,
    DepartmentSerializer,
    MaterialSerializer,
    MaterialWriteSerializer,
    NotificationSerializer,
    ProgramSerializer,
    RegisterSerializer,
    UserSerializer,
    UserWriteSerializer,
    downcast_user,
)

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access_token": str(refresh.access_token),
                "refresh_token": str(refresh),
                "expires_in": 3600,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class IdPreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = request.query_params.get("role")
        dept_name = request.query_params.get("department", "")
        prog_name = request.query_params.get("program", "")
        department = Department.objects.filter(name=dept_name).first() if dept_name else None
        program = None
        if prog_name and department:
            program = Program.objects.filter(name=prog_name, department=department).first()
        identifier = None
        if role == "student":
            identifier = generate_student_id(department, program)
        elif role == "lecturer":
            identifier = generate_staff_id(department)
        return Response({"id": identifier})


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get("identifier", "").strip()
        password = request.data.get("password", "")
        if not identifier or not password:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "identifier and password are required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.filter(Q(email__iexact=identifier)).first()
        if user is None:
            student = Student.objects.filter(student_id=identifier).first()
            if student is not None:
                user = student
        if user is None or not user.check_password(password):
            return Response(
                {"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid identifier or password."}},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response(
                {"error": {"code": "ACCOUNT_DISABLED", "message": "This account has been deactivated."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access_token": str(refresh.access_token),
                "refresh_token": str(refresh),
                "expires_in": 3600,
                "user": UserSerializer(user).data,
            }
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        instance = downcast_user(request.user)
        data = request.data
        if request.user.role == "student":
            # Self-service for students is limited to their phone number;
            # photo, personal and academic details are admin-managed.
            data = {"phone_number": data.get("phone_number", "")}
        serializer = UserWriteSerializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            from rest_framework_simplejwt.tokens import RefreshToken

            token = RefreshToken(request.data.get("refresh", ""))
            token.blacklist()
        except Exception:
            pass
        return Response({"status": "logged_out"}, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSelf]
    http_method_names = ["get", "post", "put", "patch", "delete"]

    def get_serializer_class(self):
        if self.request.method in ("POST", "PUT", "PATCH"):
            return UserWriteSerializer
        return UserSerializer

    def get_object(self):
        obj = super().get_object()
        return downcast_user(obj) or obj

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        password = generate_temp_password()
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"password": password})

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        department = self.request.query_params.get("department")
        search = self.request.query_params.get("search")
        if role == "student":
            qs = qs.filter(student__isnull=False)
        elif role == "lecturer":
            qs = qs.filter(lecturer__isnull=False)
        elif role == "admin":
            qs = qs.filter(is_staff=True)
        if department:
            qs = qs.filter(
                Q(student__department__name__iexact=department)
                | Q(lecturer__department__name__iexact=department)
            )
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(student__student_id__icontains=search)
            )
        return qs


class StudentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Student.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(department__name__iexact=department)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(student_id__icontains=search)
            )
        return qs


class LecturerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lecturer.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(department__name__iexact=department)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(full_name__icontains=search) | Q(email__icontains=search))
        return qs


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["get"])
    def programs(self, request, pk=None):
        department = self.get_object()
        programs = department.programs.all()
        return Response(ProgramSerializer(programs, many=True).data)


class ProgramViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["get"])
    def courses(self, request, pk=None):
        program = self.get_object()
        courses = program.courses.all()
        return Response(CourseSerializer(courses, many=True).data)


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.select_related("course__department", "course__program", "uploaded_by")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("POST", "PUT", "PATCH"):
            return MaterialWriteSerializer
        return MaterialSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        material = serializer.save()
        return Response(
            MaterialSerializer(material).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        material = serializer.save()
        return Response(MaterialSerializer(material).data)

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsLecturerOrAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        q = params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(course__course_code__icontains=q)
                | Q(course__course_title__icontains=q)
            )
        department = params.get("department")
        if department:
            qs = qs.filter(course__department__name__iexact=department)
        program = params.get("program")
        if program:
            qs = qs.filter(course__program__name__iexact=program)
        level = params.get("level")
        if level:
            qs = qs.filter(level=level)
        semester = params.get("semester")
        if semester:
            qs = qs.filter(semester=semester)
        course_code = params.get("course_code")
        if course_code:
            qs = qs.filter(course__course_code__iexact=course_code)
        mtype = params.get("type")
        if mtype:
            qs = qs.filter(type=mtype)
        uploaded_by = params.get("uploaded_by")
        if uploaded_by:
            try:
                qs = qs.filter(uploaded_by_id=int(uploaded_by))
            except (TypeError, ValueError):
                pass
        return qs

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        material = self.get_object()
        material.download_count += 1
        material.save(update_fields=["download_count"])
        return Response(
            {"file_url": material.file_url, "download_count": material.download_count},
            status=status.HTTP_200_OK,
        )


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = NotificationSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsLecturerOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.filter(Q(recipient=user) | Q(broadcast=True))

    def perform_create(self, serializer):
        serializer.save(broadcast=True)

    @action(detail=True, methods=["put"])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save(update_fields=["read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"])
    def read_all(self, request):
        updated = self.get_queryset().filter(read=False).update(read=True)
        return Response({"updated": updated})


class CourseAssignmentViewSet(viewsets.ModelViewSet):
    queryset = CourseAssignment.objects.select_related("course__department", "course__program", "lecturer")
    serializer_class = CourseAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete"]

    def get_permissions(self):
        if self.request.method in ("POST", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        lecturer = self.request.query_params.get("lecturer")
        if lecturer:
            qs = qs.filter(lecturer_id=lecturer)
        return qs


class CourseEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = CourseEnrollment.objects.select_related("course__department", "course__program", "student")
    serializer_class = CourseEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete"]

    def get_permissions(self):
        if self.request.method in ("POST", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        student = self.request.query_params.get("student")
        if student:
            qs = qs.filter(student_id=student)
        return qs


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.all()
        materials = Material.objects.all()
        storage = materials.aggregate(total=Sum("size_mb"))["total"] or 0
        by_role = {
            "student": Student.objects.count(),
            "lecturer": Lecturer.objects.count(),
            "admin": users.filter(is_staff=True).count(),
        }
        by_dept = [
            {
                "department": dept.name,
                "count": materials.filter(course__department=dept).count(),
            }
            for dept in Department.objects.all()
        ]
        recent = users.order_by("-created_at")[:5]
        return Response(
            {
                "total_users": users.count(),
                "total_students": Student.objects.count(),
                "total_lecturers": Lecturer.objects.count(),
                "total_materials": materials.count(),
                "storage_mb": float(storage),
                "inactive_users": users.filter(is_active=False).count(),
                "total_courses": Course.objects.count(),
                "total_assignments": CourseAssignment.objects.count(),
                "users_by_role": by_role,
                "materials_by_department": by_dept,
                "recent_users": UserSerializer(recent, many=True).data,
            }
        )


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})
