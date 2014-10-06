## Deployment

To run FlowBAT, you need to:
 
1. Clone this repository to your local machine.
2. Setup target server.
3. Deploy from your local machine to target server.

FlowBAT uses [Meteor UP](https://github.com/arunoda/meteor-up) both for target server setup and deployment.

###  Setup target server

1. ``rm settings.json # we'll start with brand new settings``
1. ``cp settings/prod.sample.json settings.json``
2. Edit settings.json
    1. ``baseUrl`` is the URL that user shall visit in his browser to access FlowBAT.
    2. ``mailUrl`` is the SMTP connection string that overrides [MAIL_URL](http://docs.meteor.com/#email) environment variable. For demo setups, you can use the same ``mailUrl`` as in ``settings/prod.json``. For production setups, it is necessary to use a dedicated ``mailUrl`` pointing to your own server. If you don't have SMTP server, we recommend [Mailgun](http://www.mailgun.com/).
2. Edit mup.json (format described on [Meteor UP page](https://github.com/arunoda/meteor-up))
3. ``DEBUG=* mup setup``

The ``DEBUG=* mup setup`` command may yield errors in case there's something wrong with your deployment server. It is necessary to fix those and re-run ``DEBUG=* mup setup`` until there are no errors before deploying FlowBAT.

### Deploy FlowBAT

``mup deploy``
