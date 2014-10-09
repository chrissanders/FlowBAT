## Deployment

To run FlowBAT, you need to:
 
1. Clone this repository to your local machine.
1. Setup local machine.
1. Edit deployment settings.
1. Setup target server.
1. Deploy from your local machine to target server.
1. (optionally) Setup SSH connection between FlowBAT and SiLK server.

FlowBAT uses [Meteor UP](https://github.com/arunoda/meteor-up) both for target server setup and deployment.

###  Setup local machine

1. [Install Node.js](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager#debian-and-ubuntu-based-linux-distributions).
1. Installing Node.js should also leave you with npm already installed. Check it by running ``npm --version``. In case the command is not found, please [install npm](https://github.com/npm/npm).
1. ``sudo npm install -g meteorite``
1. ``sudo npm install -g mup@0.5.2``
1. ``curl https://install.meteor.com | /bin/sh`` 

###  Edit deployment settings

1. ``cp settings/prod.sample.json settings.json``
1. ``cp mup.sample.json mup.json``
1. Edit ``settings.json``:
    1. ``baseUrl`` is the URL that user shall visit in his browser to access FlowBAT.
    1. ``mailUrl`` is the SMTP connection string that overrides [MAIL_URL](http://docs.meteor.com/#email) environment variable. For demo setups, you can use the same ``mailUrl`` as in ``settings/prod.json``. For production setups, it is necessary to use a dedicated ``mailUrl`` pointing to your own server. If you don't have an SMTP server, we recommend [Mailgun](http://www.mailgun.com/).
1. Edit ``mup.json`` (format described on [Meteor UP page](https://github.com/arunoda/meteor-up)):
    1. Change ``servers`` parameter (note that format allows for multiple servers).
    1. Change ``app`` parameter to a local filesystem path where you cloned FlowBAT repository.
    1. Change ``env`` parameter.

###  Setup target server

Be sure to create keys to communicate with 127.0.0.1 to streamline the setup.

1. On target server, add the following to /etc/sudoers, substituting in your username: ``username ALL=(ALL) NOPASSWD: ALL``
1. On local machine, execute ``mrt install`` in FlowBAT directory.
1. On local machine, execute ``DEBUG=* mup setup`` in FlowBAT directory.

If you have unstable internet connection, ``mrt install`` may fail to download some packages. In this case, just re-run  ``mrt install``.

The ``DEBUG=* mup setup`` command may yield errors in case there's something wrong with your deployment server. It is necessary to fix those and re-run ``DEBUG=* mup setup`` until there are no errors before deploying FlowBAT.

### Deploy FlowBAT

``mup deploy``

### Setup SSH connection between FlowBAT and SiLK server

If FlowBAT and SiLK are installed on the same machine, please skip this step. If they are installed on different machines, however, please setup SSH connection using the following steps:

1. Generate a new pair of public and private SSH keys without passphrase.
1. Create a new user on SiLK server.
1. Add the public key to created user authorized keys SiLK server.
1. Verify that you can log in to SiLK server using the generated private key as identity. Also verify that you **can't** log in to any other server using the generated private key. You may need to add ``IdentitiesOnly yes`` to the global section of your SSH config file to force SSH use only the identity file specified by ``-i`` option.    
1. Copy the private key to FlowBAT server (for example, to ``/opt/flowbat``). The location should be accessible to ``meteoruser`` user account.
1. Execute the following commands on FlowBAT server:
    1. ``sudo chown meteoruser:root /path/to/private/key``
    1. ``mkdir -p /home/meteoruser/.ssh``
1. Go to SiLK server configuration in FlowBAT web interface:
    1. If it's a brand new install, you will be presented with SiLK server configuration form on the second setup screen.
    1. If it's a working install, click your user name in the top-right corner and select "SiLK server configuration"
1. On server configuration screen, check the "Use SSH for connecting to server" box.
1. Enter connection details.
1. Click "Finish setup" (or "Check connection" if it's a working install)
