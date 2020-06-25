from django import forms
from captcha.fields import CaptchaField
from .models import Report

class ReportForm(forms.ModelForm):
    captcha = CaptchaField()
    class Meta:
        model = Report

        fields = [
            "reason"
        ]

        labels = {
            "reason": "Give a reason for Reporting this paper (max 1024 characters)"
        }
