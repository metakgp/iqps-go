import logging
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout

from .forms import UserLoginForm, UserRegisterForm

app_name = "accounts"
LOG = logging.getLogger(__name__)


def loginView(request):
    next = request.GET.get('next')
    if request.user.is_authenticated:
        return redirect(next or '/')

    form = UserLoginForm(request.POST or None)
    if form.is_valid():
        username = form.cleaned_data.get('username')
        password = form.cleaned_data.get('password')
        user = authenticate(username=username, password=password)
        login(request, user)
        LOG.info("{} logged in.".format(username))
        if next:
            return redirect(next)
        return redirect("/")

    context = {
        "form": form
    }

    return render(request, "login.html", context)


def logoutView(request):
    next = request.GET.get('next')
    logout(request)
    return redirect(next or "/")


def signupView(request):
    next = request.GET.get('next')
    if request.user.is_authenticated:
        return redirect(next or '/')

    form = UserRegisterForm(request.POST or None)

    if form.is_valid():
        user = form.save(commit=True)
        password = form.cleaned_data.get('password')
        user.set_password(password)

        user.save()
        login(request, user)
        LOG.info("New user: {}.".format(user.username))

        if next:
            return redirect(next)
        return redirect("/")

    context = {
        "form": form
    }

    return render(request, "register.html", context)
