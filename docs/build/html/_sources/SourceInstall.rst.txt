Source Installation
###################

Pre-requisites for installation:

    1. Python >= 3.7 with pip and virtualenv installed
    #. MySQL
    #. Linux based OS prefered.

Steps
=====

1. Clone the repository to your machine.

#. In the MySQL console, run the following commands as the root user:

.. code-block:: bash
    
    mysql> CREATE USER 'iqps_admin'@'%' IDENTIFIED BY 'pwd';
    mysql> GRANT ALL PRIVILEGES ON iqps.* TO 'iqps_admin'@'%';
    mysql> CREATE DATABASE iqps;   


Replace ``iqps_admin`` and ``pwd`` with whatever database username and password you want to give.

#. In the repo directory, execute:

.. code-block:: bash
    
    $ python3 -m virtualenv venv
    $ source venv/bin/activate
    $ pip install -r requirements.txt


#. Go to https://developers.google.com/drive/api/v3/quickstart/python. Click on ``Enable Drive API`` then click ``Create`` in the modal.
   It will generate a ``credentials.json`` file. Move it to ``iqps/conf`` folder inside the repo.

#. Now open a python shell (remember to be in the same virtual environment as above) in the `iqps` directory inside the repo and run:
   
.. code-block:: python

    >>> from upload.google_connect import connect
    >>> connect()


An authentication window will open in browser, accept all risks and allow everything.

#. Now in Google Drive top-level directory, open a new folder called (for example) ``iqps_static``. This is where the uploaded question papers go.

#. Copy ``app.env.template`` to ``app.env`` in ``iqps/conf``.

#. Fill out the ``app.env``. The field names are intuitive. Set ``MODE=dev`` for Development, ``MODE=prod`` for Production.
   Create 2 new directories with paths say ``path1/`` and ``path2/``. And set ``STATIC_ROOT=path1/`` and ``LOG_PATH=path2/iqps.log``.
   These are where your static files and logs will go respectively in production, should you decide to serve the static files independently.
   Set ``HOSTNAME=localhost`` or our IP address. Set ``SECRET_KEY`` to some random long string.

#. Now to migrate all the database tables, go to the ``iqps/`` directory inside the repo. Then run:

.. code-block:: bash

    $ python manage.py migrate --skip-checks


#. Let's create the admin for the website now. Run:

.. code-block:: bash
    
    $ python manage.py createsuperuser


The website is now ready. You can launch it via:

.. code-block:: bash

    $ python manage.py runserver



Moving to production
====================

To use this setup to production, in ``app.env`` set ``MODE=prod``.
Then copy all your local files to the production server.
Set up the ``STATIC_ROOT`` and ``LOG_PATH`` directories there.
Then run:

.. code-block:: bash

    $ python manage.py collectstatic


Setup a server like Apache or Nginx to serve the webapp.
Add configuration there to serve the static files under ``webapp_root_url/static`` URL.

