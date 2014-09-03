## Deployment

FlowBAT uses [Meteor UP](https://github.com/arunoda/meteor-up) for deployment. Below is a basic plan of deploying the application to brand new server.

### Target server setup

1. Symlink ``settings.json`` to ``settings/prod.json``
2. ``DEBUG=* mup setup # run normal Meteor UP setup; watch for errors!``

### App deployment

``./bin/deploy # run app-specific deploy script``
