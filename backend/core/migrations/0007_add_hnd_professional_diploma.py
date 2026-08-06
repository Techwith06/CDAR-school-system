from django.db import migrations


def add_programs(apps, schema_editor):
    Department = apps.get_model("core", "Department")
    Program = apps.get_model("core", "Program")
    dept = Department.objects.filter(name="Information Technology").first()
    if dept is None:
        return
    for name in (
        "HND Information Technology",
        "Professional Diploma in Information Technology",
    ):
        Program.objects.get_or_create(name=name, department=dept)


def remove_programs(apps, schema_editor):
    Program = apps.get_model("core", "Program")
    Program.objects.filter(
        name__in=(
            "HND Information Technology",
            "Professional Diploma in Information Technology",
        )
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_lecturer_staff_id"),
    ]

    operations = [
        migrations.RunPython(add_programs, remove_programs),
    ]
