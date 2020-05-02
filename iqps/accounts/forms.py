from django import forms
from django.contrib.auth import authenticate, get_user_model

User = get_user_model()

class UserLoginForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField(widget=forms.PasswordInput)

    def clean(self, *args, **kwargs):
        username = self.data.get('username')
        password = self.data.get('password')
        user = authenticate(username=username, password=password)
        if not user:
            raise forms.ValidationError('Username/Password is invalid.')
        if not user.check_password(password):
            raise forms.ValidationError('Username/Password is invalid.')
        if not user.is_active:
            raise forms.ValidationError('Username/Password is invalid.')

        return super(UserLoginForm, self).clean(*args, **kwargs)

class UserRegisterForm(forms.ModelForm):
    email = forms.EmailField(label='IITKGP issued email')
    password = forms.CharField(widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password'
        ]

    def clean(self, *args, **kwargs):
        email = self.cleaned_data.get('email')
        email_qs = User.objects.filter(email=email)

        if email_qs.exists():
            raise forms.ValidationError("Email already in use.")

        if email.split("@")[1] != "iitkgp.ac.in":
            raise forms.ValidationError("Email does not belong to IIT KGP.")

        super(UserRegisterForm, self).clean(*args, **kwargs)
