#!/bin/bash

exec > >(tee -a logfile.txt) 
trap "kill -9 $! 2>/dev/null" EXIT 
exec 2> >(tee -a logfile.txt >&2) 
trap "kill -9 $! 2>/dev/null" EXIT
workingDir=$PWD

ask() {
    while true; do

        if [ "${2:-}" = "Y" ]; then
            prompt="Y/n"
            default=Y
        elif [ "${2:-}" = "N" ]; then
            prompt="y/N"
            default=N
        else
            prompt="y/n"
            default=
        fi

        # Ask the question
        read -p "$1 [$prompt] " REPLY

        # Default?
        if [ -z "$REPLY" ]; then
            REPLY=$default
        fi

        # Check if the reply is valid
        case "$REPLY" in
            Y|y) return 0 ;;
            N|n) return 1 ;;
        *) echo "You must give a y or n answer." ;;
        esac

    done
}



if [ "$1" = "--update" ]; then
echo "$(tput setaf 6)This script will install flowbat updates automatically. If it is not up-to-date, it will require a FlowBAT restart.$(tput sgr0)"
        if ask "$(tput setaf 3)Are you sure you want to update?$(tput sgr0)"; then
if [ -d "$workingDir/FlowBAT/" ]; then
	cd $workingDir/FlowBAT/
		git pull
		exit
else
	echo "$(tput setaf 1)There doesn't seem to be a FlowBAT installation located in this directory. Run this script from the location where FlowBAT was installed. Exiting.$(tput sgr0)"
	exit 1
fi
  else
    exit 1
	fi
fi

if [ "$(pidof mongod)" ]
then
  echo "It looks like mongod is running, which could be indicative that you have a meteor app running."
  if ask "$(tput setaf 3)Are you sure you want to continue the install of FlowBAT?$(tput sgr0)"; then
    echo
  else
    echo "Kill the mongod process if it pertains to an existing meteor app and restart this install. There might be conflicts if you do not kill it, especially if you are currently running FlowBAT already."
    exit 1
  fi
fi

if [ "$(pidof node)" ]
then
  echo "It looks like node is running, which could be indicative that you have a meteor app running."
  if ask "$(tput setaf 3)Are you sure you want to continue the install of FlowBAT?$(tput sgr0)"; then
    echo
  else
    echo "Kill the node process and restart this install. There might be conflicts if you do not kill it, especially if you are currently running FlowBAT already."
    exit 1
  fi
fi

if [ ! -d "$workingDir/FlowBAT/" ]; then
  echo "$(tput setaf 6)This script will install flowbat locally, to be accessed at http://localhost:1800$(tput sgr0)"
	if ask "$(tput setaf 3)Are you sure you want to install?$(tput sgr0)"; then
    echo
  else
		exit 1
	fi
fi

if [ ! -f /etc/init/flowbat.conf ]; then
	if ask "$(tput setaf 3)Do you wish to have FlowBAT start on boot in the background?$(tput sgr0)"; then
      		startonboot=$(echo "yes")
		else
			echo "$(tput setaf 2)For future reference, after installation move flowbat.conf to /etc/init/ if you would like to have FlowBAT start on boot.$(tput sgr0)".
		fi
	else
		sudo rm /etc/init/flowbat.conf
		startonboot=$(echo "yes")
fi

echo "$(tput setaf 6)Checking installed packages...$(tput sgr0)"
sudo apt-get update -qq
function testinstall {
	dpkg -s "$1" &> /dev/null || {
	    printf '%s\n' "$(tput setaf 6)$1 not installed. Attempting install.$(tput sgr0)" >&2
	    sudo apt-get install -qq -y "$1"
	}
}

testinstall build-essential
testinstall checkinstall
testinstall curl
testinstall git-core
testinstall mongodb-server

if [ ! -d "$workingDir/FlowBAT/" ]; then
	echo "$(tput setaf 6)Downloading FlowBAT...$(tput sgr0)"
	git clone https://github.com/chrissanders/FlowBAT.git
fi
cd $workingDir/FlowBAT/

echo""
echo "$(tput setaf 6)Checking for nodejs...$(tput sgr0)"
dpkg -s nodejs &> /dev/null || {
	printf '%s\n' "nodejs not installed. Attempting install." >&2
	curl -sL https://deb.nodesource.com/setup | sudo bash -
  printf '%s\n' "$(tput setaf 6)nodejs installing. This may take a minute.$(tput sgr0)" >&2
	sudo apt-get install -qq -y nodejs
        }

echo ""
echo "$(tput setaf 6)Checking for meteor...$(tput sgr0)"
if ! which meteor > /dev/null; then
        echo -e "$(tput setaf 6)Meteor not installed. Attempting Install.$(tput sgr0)"
        curl https://install.meteor.com | /bin/sh
fi

#Arranging for localhost configuration
cat $workingDir/FlowBAT/private/bundle/settings/prod.sample.json |  sed 's/flowbat.com/127.0.0.1:1800/' | sed 's/mailUrl.*/mailUrl": "",/' > $workingDir/FlowBAT/private/bundle/settings/dev.json

(cd $workingDir/FlowBAT/private/bundle/programs/server && npm install)

#Generating upstart configuration for FlowBAT
cat <<EOF > $workingDir/FlowBAT/flowbat.conf
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
    . $workingDir/FlowBAT/settings/meteorsettings.json
    export METEOR_SETTINGS
    exec node $workingDir/FlowBAT/private/bundle/main.js >> $workingDir/FlowBAT/flowbat.log
end script
EOF

sed -i 's/testtest/\"$@"/g' $workingDir/FlowBAT/flowbat.conf

if [ ! -z "$startonboot" ]; then
  sudo cp $workingDir/FlowBAT/flowbat.conf /etc/init/
  echo -e "$(tput setaf 2)To manually start, stop, or check status of FlowBAT:"
  echo -e 'sudo service flowbat [start/stop/status]'
  echo -e "$(tput sgr0)"
else
	echo -e "$(tput setaf 2)"
  echo "You chose to not run FlowBAT at boot. For future reference, move flowbat.conf to /etc/init/ if you would like to have FlowBAT start on boot."
  echo "Without a flowbat.conf in /etc/init/, you must run the following to start FlowBAT manually:"
  echo "export PORT=1800"
  echo "export MONGO_URL=mongodb://localhost:27017/flowbat"
  echo "export ROOT_URL=http://127.0.0.1"
  echo "export METEOR_SETTINGS=\`cat $workingDir/FlowBAT/private/bundle/settings/dev.json\`"
  echo "node $workingDir/FlowBAT/private/bundle/main.js"
  echo -e "$(tput sgr0)"

fi

sudo chown -R "$USER":"$USER" $workingDir/FlowBAT/

echo "$(tput setaf 2)Attempting startup. Check http://127.0.0.1:1800. $(tput sgr0)"

export PORT=1800
export MONGO_URL=mongodb://localhost:27017/flowbat
export ROOT_URL=http://127.0.0.1
export METEOR_SETTINGS=`cat $workingDir/FlowBAT/private/bundle/settings/dev.json`
sudo service flowbat start
#node $workingDir/FlowBAT/private/bundle/main.js &

