from django.shortcuts import render
from django.db import connection
from django.http import JsonResponse

from iqps.settings import DATABASES
#from .processors import SearchCursor
#Use this with sqlite

#db_name = DATABASES['default']['NAME']

def sqlite_search(subject, year=0, department="", paper_type=""):
    year_filter = "AND p.year = {}".format(year) if year > 0 else ""
    dep_filter = "AND d.code = '{}'".format(department) if department != "" else ""
    type_filter = "AND p.paper_type = '{}'".format(paper_type) if paper_type != "" else ""

    if subject == "":
        return []

    query =\
    """SELECT p.subject, p.year, p.department_id, d.id, d.code, p.paper_type, p.link, SIMILARITYSCORE(p.subject, '{}') AS s
       FROM papers p JOIN departments d ON p.department_id = d.id
       WHERE s > 70 {} {} {} ORDER BY s DESC;""".format(subject, year_filter, dep_filter, type_filter)

    results = []
    with SearchCursor(db_name) as c:
        c.execute(query)
        for row in c.fetchall():
            results.append(row)

    return results

def _search(subject, year=0, department="", paper_type="", keywords=""):
    year_filter = "AND p.year = {}".format(year) if year > 0 else ""
    dep_filter = "AND d.code = '{}'".format(department) if department != "" else ""
    type_filter = "AND p.paper_type = '{}'".format(paper_type) if paper_type != "" else ""
    keyword_filter = "AND kt.text IN {}".format(keywords) if keywords != "" else ""

    if subject == "":
        return []
    
    if keyword_filter == "":
        query =\
        """SELECT p.subject, p.year, d.code, p.paper_type, p.link, p.id
           FROM papers p JOIN departments d ON p.department_id = d.id
           WHERE SOUNDEX(SUBSTRING(p.subject, 1, LENGTH('{}'))) = SOUNDEX('{}') {} {} {} ORDER BY year DESC LIMIT 30;""".format(subject, subject, year_filter, dep_filter, type_filter)
    else:
        query =\
        """SELECT p.subject, p.year, d.code, p.paper_type, p.link, p.id, GROUP_CONCAT(kt.text) AS keywords
    FROM papers AS p JOIN departments AS d ON p.department_id = d.id
    LEFT OUTER JOIN (
        SELECT pk.paper_id, k.text FROM papers_keywords AS pk JOIN keywords AS k ON pk.keyword_id = k.id
    ) AS kt
    ON p.id = kt.paper_id
    WHERE SOUNDEX(SUBSTRING(p.subject, 1, LENGTH('{}'))) = SOUNDEX('{}')
    {} {} {} {}
    ORDER BY p.year DESC LIMIT 30;
    """.format(subject, subject, year_filter, dep_filter, type_filter, keyword_filter)

    results = []
    with connection.cursor() as c:
        c.execute(query)
        for row in c.fetchall():
            results.append(row)

    return results


def hitSearch(request):
    """
    Meant to be an independent API.
    Request args:
        q -> subject name
        year -> year filter
        dep -> department filter
        typ -> paper_type filter
    """
    q = request.GET.get('q', "")
    year = request.GET.get('year', 0)
    dep = request.GET.get('dep', "")
    typ = request.GET.get('typ', "")
    keywords = request.GET.get('keys', "")

    try:
        year = int(year)
    except:
        year = 0

    results = _search(q, year=year, department=dep, paper_type=typ, keywords=keywords)
    response = JsonResponse({"papers": results})
    response["Access-Control-Allow-Origin"] = "*"    #For CORS

    return response

