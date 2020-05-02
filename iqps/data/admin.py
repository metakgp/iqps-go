from django.contrib import admin

from .models import Paper, Keyword, Department

class PaperAdmin(admin.ModelAdmin):
    model = Paper
    filter_horizontal = ('keywords',)

admin.site.register(Paper, PaperAdmin)
admin.site.register(Keyword)
admin.site.register(Department)
