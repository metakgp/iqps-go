from django.http import JsonResponse

from .models import Paper

app_name = "data"


def index(request):
    return JsonResponse({
        "info": "Datalayer of IQPS",
        "message": "Go to /all for all paper listings"
    })


def viewAll(request):
    all_papers = Paper.objects.all()
    serialized = [p.serialize_to_json() for p in all_papers]
    return JsonResponse({
        "papers": serialized
    })
