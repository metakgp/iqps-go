import json
import logging
import uuid
import os
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages

from data.models import Paper, Keyword, Department
from request.models import PaperRequest
from iqps.settings import STATICFILES_DIRS, GDRIVE_DIRNAME
from .forms import BulkUploadForm, UploadForm
from .google_connect import upload_file, get_or_create_folder

GDRIVE_DIR_ID = None
LOG = logging.getLogger(__name__)

#@login_required
def index(request):
    global GDRIVE_DIR_ID

    bulk = BulkUploadForm()
    upl = UploadForm()
    if request.method == "POST":
        try:
            assert request.FILES.get('file', None) is not None
            #UploadForm is submitted
            upl = UploadForm(request.POST, request.FILES)
            if upl.is_valid():
                path = STATICFILES_DIRS[0]
                uid = uuid.uuid4()
                path = os.path.join(path, "files", "{}.pdf".format(uid))
                file = request.FILES.get('file')
                with open(path, 'wb+') as dest:
                    for chunk in file.chunks():
                        dest.write(chunk)
                if not GDRIVE_DIR_ID:
                    GDRIVE_DIR_ID = get_or_create_folder(GDRIVE_DIRNAME, public=True)
                paper = upl.save(commit=False)
                paper.link = upload_file(path, "{}.pdf".format(uid),
                                        folderId=GDRIVE_DIR_ID)
                keys_tmp = upl.cleaned_data.get("keywords")

                paper.save()

                for key in keys_tmp:
                    paper.keywords.add(key)

                paper.save()
                LOG.info("New file uploaded: {}.pdf".format(uid))
                messages.success(request, "File Upload Successful")
                try:
                    del_key = request.POST.get('del_key', 0)
                    key = int(del_key)
                    if key > 0:
                        PaperRequest.objects.filter(pk=key).delete()
                    LOG.info("Request {} cleared".format(key))
                except Exception as e:
                    LOG.warning(e)

                os.remove(path)

        except AssertionError:
            if request.user.is_staff:
                #BulkUploadForm has been submitted
                bulk = BulkUploadForm(request.POST, request.FILES)
                processed = 0
                saved = 0
                if bulk.is_valid():
                    raw_papers = json.load(request.FILES.get('bulk_file'))
                    for paper in raw_papers:
                        processed += 1
                        dep_code = str(paper.get("Department", "Other"))
                        if dep_code == "":
                            dep_code = "Other"

                        dep, _ = Department.objects.get_or_create(code=dep_code)

                        p = Paper(\
                        department=dep,
                        year=paper.get("Year", None),
                        subject=paper.get("Paper", None),
                        link=paper.get("Link", None),
                        paper_type=paper.get("Semester", None)
                        )
                        try:
                            p.save()
                            saved += 1
                        except Exception as e:
                            LOG.warning(e)

                        LOG.info("%d entries processed, %d entries saved" % (processed, saved))
                    messages.success(request, "Bulk upload successful: {} entries saved".format(saved))



    return render(request, "upload.html", {
                                        "bulk_form": bulk,
                                        "crowd_form": upl
                                        })



