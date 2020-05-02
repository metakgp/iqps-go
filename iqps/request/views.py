import logging

from django.shortcuts import render
from django.contrib import messages

from .forms import RequestForm
from .models import PaperRequest

LOG = logging.getLogger(__name__)

def paperRequest(request):
    if request.method == "POST":
        req = RequestForm(request.POST)
        if req.is_valid():
            req.save(commit=True)
            LOG.info("New request added")
            messages.success(request, "Request Addition Successful")
        else:
            messages.error(request, "Invalid Captcha")

    reqs = PaperRequest.objects.all().order_by('-pk')
    reqarr = [dict(x) for x in reqs]
    return render(request, "requestpage.html", {'form': RequestForm(), 'reqs': reqarr})

