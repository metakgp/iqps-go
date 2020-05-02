from django import forms
from django_select2.forms import Select2MultipleWidget, Select2Widget
from data.models import PAPER_TYPES, Department, Keyword

class FilterForm(forms.Form):
    DEPARTMENT_TYPES = list(map(lambda x: (x.code, x.code), Department.objects.all()))
    KEYWORDS = map(lambda x: (x.text, x.text), Keyword.objects.all())

    year = forms.IntegerField(label="Year")
    department = forms.ChoiceField(label="Department", choices=[('', '------')] + DEPARTMENT_TYPES, widget=Select2Widget)
    paper_type = forms.ChoiceField(choices=[('', '------')] + PAPER_TYPES, label="Paper Type")
    keywords = forms.ChoiceField(widget=Select2MultipleWidget, choices=KEYWORDS)
