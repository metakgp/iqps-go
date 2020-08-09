from bs4 import BeautifulSoup
import requests
import concurrent.futures
import json

courses = {}
branches = []

def get_links_of_branches(grad_type):
    source = requests.get("https://erp.iitkgp.ac.in/ERPWebServices/curricula/specialisationList.jsp?stuType={}".format(grad_type)).text
    soupObject = BeautifulSoup(source,'lxml')
    global branches
    links = soupObject.find_all('a')
    for link in links:
        branches.append("https://erp.iitkgp.ac.in/ERPWebServices/curricula/"+link["href"])

grad_types = ["UG", "PG"]
with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    executor.map(get_links_of_branches, grad_types)

def get_subjs(branch):
    global courses
    source = requests.get(branch).text
    soupObject = BeautifulSoup(source, 'lxml')
    trs = soupObject.find_all('tr')
    trs = trs[2:]
    for tr in trs:
        try:    
            tds = tr.find_all('td')
            courses[tds[2].text] = tds[3].text
        except:
            pass

with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    executor.map(get_subjs, branches)

code_subject = []
for item in courses.items():
    code_subject.append("{}-{}".format(item[0], item[1]))

data = { "code_subject" : code_subject}

with open('code_subjects.json', 'w') as outfile:
    json.dump(data, outfile)