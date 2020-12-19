from django.shortcuts import render
from .forms import FilterForm
import os

def index(request):
    return render(request, "index.html", {'filter_form': FilterForm(), 'login_req': os.environ['LOGIN_REQUIRED']})
