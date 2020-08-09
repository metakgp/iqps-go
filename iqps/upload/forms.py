import json
import logging
import os
import re
from filelock import Timeout, FileLock
from django import forms
from django_select2.forms import ModelSelect2TagWidget, Select2Widget
from captcha.fields import CaptchaField
from django.core.exceptions import ValidationError
from django_select2 import forms as s2forms

from data.models import Paper, Keyword, Department
from utils.timeutil import current_year

LOG = logging.getLogger(__name__)


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE_PATH = os.path.join(BASE_DIR, "static/files/code_subjects.json")
LOCK_PATH = os.path.join(BASE_DIR, "static/files/code_subjects.json.lock")
lock = FileLock(LOCK_PATH, timeout=3)


def year_choices():
    return [(r, r) for r in range(current_year(), 1950, -1)]


def subject_choices():
    with open(FILE_PATH) as f:
        data = json.load(f)
    code_subjects = data["code_subject"]
    return [(i, i) for i in code_subjects] + [("", "")]


def validate_custom_subject(value):
    try:
        subject_code = value.split("-")[0].rstrip()
        pattern = "[A-Z][A-Z]\d{5}"
        result = re.match(pattern, subject_code)
        if result:
            return value
        raise ValidationError("Please Enter a proper Subject Code")
    except:
        raise ValidationError("Please Enter in the format of CODE-SUBJECT NAME")


class TextSearchFieldMixin:
    search_fields = ["text__icontains"]


class KeywordSelect2TagWidget(TextSearchFieldMixin, ModelSelect2TagWidget):
    model = Keyword

    def create_value(self, value):
        LOG.info("New Keyword: {}".format(value))
        self.get_queryset().create(text=value)

    def value_from_datadict(self, data, files, name):
        values = ModelSelect2TagWidget.value_from_datadict(self, data, files, name)
        pks = []
        for val in values:
            key_id = None
            try:
                key_id = int(val)
                word = Keyword.objects.get(id=key_id)
            except Exception:
                word = Keyword.objects.get_or_create(text=val)
                key_id = word[0].pk
            finally:
                pks.append(key_id)
        return pks


class BulkUploadForm(forms.Form):
    bulk_file = forms.FileField(
        widget=forms.ClearableFileInput, label="Upload json file (within 30MB)"
    )

    def clean(self, *args, **kwargs):
        try:
            f = self.files.get("bulk_file")
            assert f is not None
            assert "json" in f.content_type
            assert f.size <= 30 * 1024 * 1024
        except Exception:
            raise forms.ValidationError("Invalid file")
        finally:
            super(BulkUploadForm, self).clean(*args, **kwargs)

class UploadForm(forms.ModelForm):
    file = forms.FileField(widget=forms.ClearableFileInput, label="Upload pdf")
    year = forms.TypedChoiceField(
        coerce=int, choices=year_choices, initial=current_year
    )
    subject = forms.TypedChoiceField(
        choices=subject_choices, initial="", label="Subject", widget=Select2Widget,
        required=False
    )
    custom_subject = forms.CharField(
        required=False,
        label="Subject(Enter here if not found in the above list)",
        validators=[validate_custom_subject],
        widget=forms.TextInput(attrs={"placeholder": "CODE-SUBJECT NAME"}),
    )
    captcha = CaptchaField()
    del_key = forms.IntegerField(
        label="Id (see Request Paper) resolved \
                                 by this upload (Optional)",
        required=False,
    )
    
    department = forms.ModelChoiceField(queryset=Department.objects.all(),
                                        widget=Select2Widget)
    class Meta:
        model = Paper
        fields = [
            "department",
            "subject",
            "custom_subject",
            "year",
            "paper_type",
            "file",
            "keywords",
        ]

        widgets = {
            "keywords": KeywordSelect2TagWidget,
        }
        labels = {
            "department": "Department (Prefer 2 letter codes. \
                          Select Others if not found)"
        }

    def clean(self, *args, **kwargs):
        try:
            f = self.files.get("file")
            assert f is not None
            assert "pdf" in f.content_type
            # writting to file if a new subject
            if self.cleaned_data['custom_subject'] is not "":
                try:
                    with lock:
                        with open(FILE_PATH, "r") as f:
                            data = json.load(f)
                        code_subjects = data["code_subject"]
                        code_subjects.append(self.cleaned_data['custom_subject'])
                        data = {"code_subject": list(set(code_subjects))}
                        with open(FILE_PATH, "w") as f:
                            json.dump(data, f)
                        LOG.info("New subject added {}".format(self.cleaned_data['custom_subject']))
                except Exception as e:
                    lock.release()
                    LOG.error("Error while adding a new subject {}".format(e))
        except Exception:
            raise forms.ValidationError("Invalid File")
        finally:
            super(UploadForm, self).clean(*args, **kwargs)
