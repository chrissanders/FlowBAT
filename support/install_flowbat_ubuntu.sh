#!/bin/bash

#Make sure you're not installing as root.
if [[ $EUID -eq 0 ]]; then
   echo "You'll want to run this as the user by which FlowBAT will run. Do not use root."
   exit 1
fi
# Setup install vars
workingDir=$PWD
flowbatUser=$USER

## Update and Upgrade
sudo apt-get update
if [[ $(sudo fuser /var/lib/dpkg/lock) ]]; then
    echo "There is apt-get lock keeping things from installing. Exiting"
    exit
fi

# Install Pre-reqs
sudo apt-get install -y curl build-essential git

# Clone the FlowBAT repo
git clone https://github.com/chrissanders/FlowBAT.git

trustyinstall() {
# Install NVM and Node 8.9.3
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
 nvm install v8.9.3

## Install mongodb
sudo apt-get install -y mongodb-server

## Install FlowBAT packages
mkdir $workingDir/FlowBAT/private/bundle/programs/server/npm
(cd $workingDir/FlowBAT/private/bundle/programs/server && npm install)
cat <<EOF > $workingDir/FlowBAT/private/meteorsettings.json
METEOR_SETTINGS='{ "baseUrl": "http://127.0.0.1:1800", "mailUrl": "", "isLoadingFixtures": false, "apm": { "appId": "", "secret": "" }, "public": { "version": "FlowBAT v1.5.3", "isDebug": false, "googleAnalytics": { "property": "", "disabled": true }, "mixpanel": { "token": "", "disabled": false } } }'
EOF

#Generating upstart configuration for FlowBAT
cat <<EOF > $workingDir/flowbat.conf
# upstart service file at /etc/init/flowbat.conf
description "FlowBAT"
# When to start the service
start on started mongodb and runlevel [2345]
# When to stop the service
stop on shutdown
# Automatically restart process if crashed
respawn
respawn limit 10 5
# drop root proviliges and switch to FlowBAT install user
setuid $USER
setgid $USER
script
    export PATH=/opt/local/bin:/opt/local/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
    export NODE_PATH=/usr/lib/nodejs:/usr/lib/node_modules
    export PWD=$workingDir/FlowBAT/
    export HOME=$workingDir/FlowBAT/
    export PORT=1800
    export MONGO_URL=mongodb://localhost:27017/flowbat
    export ROOT_URL=http://127.0.0.1
    . $workingDir/FlowBAT/private/meteorsettings.json
    export METEOR_SETTINGS
    exec /home/$flowbatUser/.nvm/versions/node/v8.9.3/bin/node $workingDir/FlowBAT/private/bundle/main.js >> $workingDir/FlowBAT/flowbat.log
end script
EOF

# Move init config to upstart and start flowbat
sudo cp $workingDir/flowbat.conf /etc/init/
sudo service flowbat start
}

soinstall() {
# extract SO specific packages
rm -rf $workingDir/FlowBAT/private/bundle/
tar zxf $workingDir/FlowBAT/private/SO.tar.gz -C $workingDir/FlowBAT/private/

# Install NVM and Node 8.9.3
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
 nvm install v8.9.3

## Install mongodb
sudo apt-get install -y mongodb-server

## Install FlowBAT packages
mkdir $workingDir/FlowBAT/private/bundle/programs/server/npm
(cd $workingDir/FlowBAT/private/bundle/programs/server && npm install)
cat <<EOF > $workingDir/FlowBAT/private/meteorsettings.json
METEOR_SETTINGS='{ "baseUrl": "http://127.0.0.1:1800", "mailUrl": "", "isLoadingFixtures": false, "apm": { "appId": "", "secret": "" }, "public": { "version": "FlowBAT v1.5.3", "isDebug": false, "googleAnalytics": { "property": "", "disabled": true }, "mixpanel": { "token": "", "disabled": false } } }'
EOF

#Generating upstart configuration for FlowBAT
cat <<EOF > $workingDir/flowbat.conf
# upstart service file at /etc/init/flowbat.conf
description "FlowBAT"
# When to start the service
start on started mongodb and runlevel [2345]
# When to stop the service
stop on shutdown
# Automatically restart process if crashed
respawn
respawn limit 10 5
# drop root proviliges and switch to FlowBAT install user
setuid $USER
setgid $USER
script
    export PATH=/opt/local/bin:/opt/local/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
    export NODE_PATH=/usr/lib/nodejs:/usr/lib/node_modules
    export PWD=$workingDir/FlowBAT/
    export HOME=$workingDir/FlowBAT/
    export PORT=1800
    export MONGO_URL=mongodb://localhost:27017/flowbat
    export ROOT_URL=http://127.0.0.1
    . $workingDir/FlowBAT/private/meteorsettings.json
    export METEOR_SETTINGS
    exec /home/$flowbatUser/.nvm/versions/node/v8.9.3/bin/node $workingDir/FlowBAT/private/bundle/main.js >> $workingDir/FlowBAT/flowbat.log
end script
EOF

# Move init config to upstart and start flowbat
sudo cp $workingDir/flowbat.conf /etc/init/
sudo service flowbat start
}

xenialinstall() {
# Install NVM and Node 8.9.3
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
 nvm install v8.9.3

## Install mongodb
sudo apt-get install -y mongodb-server

## Install FlowBAT packages
(cd $workingDir/FlowBAT/private/bundle/programs/server && npm install)

#Generating systemd configuration for FlowBAT
cat <<EOF > $workingDir/flowbat.service
[Service]
Type=simple
ExecStart=/home/$flowbatUser/.nvm/versions/node/v8.9.3/bin/node $workingDir/FlowBAT/private/bundle/main.js
Restart=on-failure
RestartSec=10 5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=flowbat
User=$flowbatUser
Environment=NODE_ENV=production
Environment=PWD=$workingDir/FlowBAT/private/bundle/
Environment=PORT=1800
Environment=HTTP_FORWARDED_COUNT=1
Environment=MONGO_URL=mongodb://localhost:27017/flowbat
#Environment=MONGO_OPLOG_URL=mongodb://127.0.0.1:27017
Environment=ROOT_URL=https://127.0.0.1
Environment='METEOR_SETTINGS={ "baseUrl": "http://127.0.0.1:1800", "mailUrl": "", "isLoadingFixtures": false, "apm": { "appId": "", "secret": "" }, "public": { "version": "FlowBAT v1.5.3", "isDebug": false, "googleAnalytics": { "property": "", "disabled": true }, "mixpanel": { "token": "", "disabled": false } } }'

[Install]
WantedBy=default.target
EOF
sudo mv $workingDir/flowbat.service /lib/systemd/system/flowbat.service

#Configuring autostart
sudo systemctl daemon-reload
sudo systemctl start flowbat
sudo systemctl enable flowbat
}

if [[ $(lsb_release -c) = *trusty* ]]; then
  if [ -d "/usr/share/securityonion/" ]; then
    soinstall
    else
    trustyinstall
  fi
  elif [[ $(lsb_release -c) = *xenial* ]]; then
  xenialinstall
  else
  echo "This script only installs FlowBAT on either trusty tahr or xenial ubuntu distributions. If you've got another request, or an error, submit it to https://github.com/chrissanders/FlowBAT/issues"
  exit 1
fi

