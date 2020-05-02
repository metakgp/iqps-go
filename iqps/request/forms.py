from django import forms
from captcha.fields import CaptchaField
from .models import PaperRequest

class RequestForm(forms.ModelForm):
    captcha = CaptchaField()
    class Meta:
        model = PaperRequest
        fields = ['subject', 'paper_type', 'year']

    def clean(self, *args, **kwargs):
        super(RequestForm, self).clean(*args, **kwargs)
