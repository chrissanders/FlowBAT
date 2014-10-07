## Deployment

To run FlowBAT, you need to:
 
1. Clone this repository to your local machine.
1. Setup local machine.
1. Edit deployment settings.
1. Setup target server.
1. Deploy from your local machine to target server.

FlowBAT uses [Meteor UP](https://github.com/arunoda/meteor-up) both for target server setup and deployment.

###  Setup local machine

1. [Install Node.js](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager#debian-and-ubuntu-based-linux-distributions).
1. Installing Node.js should also leave you with npm already installed. Check it by running ``npm --version``. In case the command is not found, please [install npm](https://github.com/npm/npm).
1. ``sudo npm install -g meteorite``
1. ``sudo npm install -g mup@0.5.2``
1. ``curl https://install.meteor.com | /bin/sh``

###  Edit deployment settings

1. ``rm settings.json # we'll start with brand new settings``
1. ``cp settings/prod.sample.json settings.json``
1. Edit ``settings.json``:
    1. ``baseUrl`` is the URL that user shall visit in his browser to access FlowBAT.
    1. ``mailUrl`` is the SMTP connection string that overrides [MAIL_URL](http://docs.meteor.com/#email) environment variable. For demo setups, you can use the same ``mailUrl`` as in ``settings/prod.json``. For production setups, it is necessary to use a dedicated ``mailUrl`` pointing to your own server. If you don't have an SMTP server, we recommend [Mailgun](http://www.mailgun.com/).
1. Edit ``mup.json`` (format described on [Meteor UP page](https://github.com/arunoda/meteor-up)): change at least ``servers``, ``app``, ``env`` parameters.

###  Setup target server

1. ``mrt install``
1. ``DEBUG=* mup setup``

If you have unstable internet connection, ``mrt install`` may fail to download some packages. In this case, just re-run  ``mrt install``.

The ``DEBUG=* mup setup`` command may yield errors in case there's something wrong with your deployment server. It is necessary to fix those and re-run ``DEBUG=* mup setup`` until there are no errors before deploying FlowBAT.

### Deploy FlowBAT

``mup deploy``
