from django.core.management.base import BaseCommand

from core.models import Notification, User


class Command(BaseCommand):
    help = "Create a demo user with a known password."

    def add_arguments(self, parser):
        parser.add_argument("email", nargs="?", default="demo@cdar.edu")
        parser.add_argument("--role", default="student")
        parser.add_argument("--password", default="demo1234")

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            email=options["email"],
            defaults={
                "full_name": "Demo User",
                "role": options["role"],
                "is_staff": options["role"] in ("admin",),
                "is_superuser": options["role"] == "admin",
            },
        )
        user.set_password(options["password"])
        user.save()
        self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} {user.email} ({user.role})"))
