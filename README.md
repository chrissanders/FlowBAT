## Deployment

FlowBAT uses [Meteor UP](https://github.com/arunoda/meteor-up) for deployment. Below is a basic plan of deploying the application to brand new server.

### Target server setup

1. ``rm settings.json # we'll start with brand new settings``
1. ``cp settings/prod.sample.json settings.json``
2. Edit settings.json
    1. ``baseUrl`` is the URL that user shall visit in his browser to access FlowBAT.
    2. ``mailUrl`` is the SMTP connection string that overrides [MAIL_URL](http://docs.meteor.com/#email) environment variable. For demo setups, you can use the same ``mailUrl`` as in ``settings/prod.json``. For production setups, it is necessary to use a dedicated ``mailUrl`` pointing to your own server. If you don't have SMTP server, we recommend [Mailgun](http://www.mailgun.com/).
2. Edit mup.json (format described on [Meteor UP page](https://github.com/arunoda/meteor-up))
3. ``DEBUG=* mup setup``

The ``DEBUG=* mup setup`` command may yield errors in case there's something wrong with your deployment server. It is necessary to fix those and re-run ``DEBUG=* mup setup`` until there are no errors before deploying FlowBAT.

### App deployment

``mup deploy``
