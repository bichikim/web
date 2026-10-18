from .models import Report


def create_report(title: str) -> Report:
    return Report(title)
