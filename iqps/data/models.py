from django.db import models

PAPER_TYPES = [
    ('MA', "Mid-Autumn"),
    ('EA', "End-Autumn"),
    ('MS', "Mid-Spring"),
    ('ES', "End-Spring"),
    ('CT', "Class-test")
]

class Keyword(models.Model):
    text = models.CharField(max_length=50)

    class Meta:
        db_table = 'keywords'

    def __str__(self):
        return str(self.text)

class Department(models.Model):
    code = models.CharField(max_length=200, unique=True)

    class Meta:
        db_table = 'departments'

    def __str__(self):
        return str(self.code)

class Paper(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    link = models.CharField(max_length=2048)
    subject = models.CharField(max_length=500)
    paper_type = models.CharField(max_length=2, choices=PAPER_TYPES)
    year = models.IntegerField()
    added_on = models.DateTimeField(auto_now_add=True)

    keywords = models.ManyToManyField(Keyword, blank=True, related_name="papers")

    class Meta:
        db_table = 'papers'

    def __str__(self):
        return f"{self.department}-{self.subject}-{self.paper_type}{self.year}"

    def serialize_to_json(self):
        keyword_strs = [str(keyword) for keyword in self.keywords.all()]
        return {
        'department': self.department.code,
        'link': self.link,
        'paper_type': self.paper_type,
        'year': self.year,
        'keywords': keyword_strs
        }
