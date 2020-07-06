import logging
from django import forms
from django_select2.forms import ModelSelect2TagWidget, Select2Widget
from captcha.fields import CaptchaField

from data.models import Paper, Keyword
from utils.timeutil import current_year

LOG = logging.getLogger(__name__)


def year_choices():
    return [(r, r) for r in range(current_year(), 1950, -1)]


class TextSearchFieldMixin:
    search_fields = ['text__icontains']

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
            except:
                word = Keyword.objects.get_or_create(text=val)
                key_id = word[0].pk
            finally:
                pks.append(key_id)
        return pks


class BulkUploadForm(forms.Form):
    bulk_file = forms.FileField(widget=forms.ClearableFileInput,
                            label="Upload json file (within 30MB)")

    def clean(self, *args, **kwargs):
        try:
            f = self.files.get("bulk_file")
            assert f is not None
            assert "json" in f.content_type
            assert f.size <= 30 * 1024 * 1024
        except:
            raise forms.ValidationError("Invalid file")
        finally:
            super(BulkUploadForm, self).clean(*args, **kwargs)

class UploadForm(forms.ModelForm):
    file = forms.FileField(widget=forms.ClearableFileInput,
                            label="Upload pdf")
    year = forms.TypedChoiceField(coerce=int, choices=year_choices,
                                  initial=current_year)
    captcha = CaptchaField()
    del_key = forms.IntegerField(label='Id (see Request Paper) resolved by this upload (Optional)', required=False)
    class Meta:
        model = Paper
        fields = [
            'department',
            'subject',
            'year',
            'paper_type',
            'file',
            'keywords'
        ]

        widgets = {
            'keywords': KeywordSelect2TagWidget,
            'department': Select2Widget
            }
        labels = {
            'department': 'Department (Prefer 2 letter codes. Select Others if not found)'
            }


    def clean(self, *args, **kwargs):
        try:
            f = self.files.get("file")
            assert f is not None
            assert "pdf" in f.content_type
        except:
            raise forms.ValidationError("Invalid File")
        finally:
            super(UploadForm, self).clean(*args, **kwargs)


