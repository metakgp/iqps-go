from django.urls import path

from . import views

urlpatterns = [
    path('<int:paperId>', views.reportPaper),
]
