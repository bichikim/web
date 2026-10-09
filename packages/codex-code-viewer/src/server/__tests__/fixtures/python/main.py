import helpers
from helpers import greet as welcome
from reports import Report
from reports.factory import create_report


def main():
    message = welcome("한글")
    report = Report(message)
    generated = create_report("미리보기")
    return helpers.greet(report.title), generated.render()
