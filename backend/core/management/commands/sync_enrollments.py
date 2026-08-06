from django.core.management.base import BaseCommand

from core.curriculum import sync_enrollments_for_student
from core.models import Student


class Command(BaseCommand):
    help = "Re-sync every student's enrollments to their program + level + semester curriculum."

    def handle(self, *args, **options):
        count = 0
        for student in Student.objects.all():
            sync_enrollments_for_student(student)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Synced enrollments for {count} students."))
