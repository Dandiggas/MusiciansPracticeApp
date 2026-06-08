from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import Take, Track


def _delete_file(field_file):
    if field_file:
        field_file.delete(save=False)


@receiver(post_delete, sender=Track)
def delete_track_file(sender, instance, **kwargs):
    _delete_file(instance.file)


@receiver(post_delete, sender=Take)
def delete_take_file(sender, instance, **kwargs):
    _delete_file(instance.file)
