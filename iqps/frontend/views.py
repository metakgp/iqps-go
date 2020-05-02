from django.shortcuts import render
from .forms import FilterForm

def index(request):
    return render(request, "index.html", {'filter_form': FilterForm()})
