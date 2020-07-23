from django import forms
from django_select2.forms import Select2MultipleWidget, Select2Widget
from data.models import PAPER_TYPES, Department, Keyword
from utils.timeutil import current_year


def year_choices():
    base_choices = [(r, r) for r in range(current_year(), 1950, -1)]
    return [('', '')] + base_choices


class FilterForm(forms.Form):
    DEPARTMENT_TYPES = list(map(lambda x: (x.code, x.code),
                                Department.objects.all()))
    KEYWORDS = map(lambda x: (x.text, x.text), Keyword.objects.all())

    year = forms.TypedChoiceField(coerce=int, choices=year_choices,
                                  initial='', label="Year",
                                  widget=Select2Widget)
    department = forms.ChoiceField(label="Department",
                                   choices=[('', '------')] + DEPARTMENT_TYPES,
                                   widget=Select2Widget)
    paper_type = forms.ChoiceField(choices=[('', '------')] + PAPER_TYPES,
                                   label="Paper Type",
                                   widget=Select2Widget)
    # keywords = forms.ChoiceField(widget=Select2MultipleWidget,
    #                              choices=KEYWORDS)
