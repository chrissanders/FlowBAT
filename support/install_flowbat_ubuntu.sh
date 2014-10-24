#!/bin/bash

workingDir=$PWD

ask() {
    # http://djm.me/ask
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
	cd "$workingDir"/FlowBAT/
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

if [ ! -d "$workingDir/FlowBAT/" ]; then
  echo "$(tput setaf 6)This script will install flowbat locally, to be accessed at http://localhost:1800$(tput sgr0)"
	if ask "$(tput setaf 3)Are you sure you want to install?$(tput sgr0)"; then
    echo
  else
		exit 1
	fi
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

if [ ! -d "$workingDir/FlowBAT/" ]; then
	echo "$(tput setaf 6)Downloading FlowBAT...$(tput sgr0)"
	git clone https://github.com/chrissanders/FlowBAT.git
fi
cd FlowBAT/

echo""
echo "$(tput setaf 6)Checking for nodejs...$(tput sgr0)"
dpkg -s nodejs &> /dev/null || {
	printf '%s\n' "nodejs not installed. Attempting install." >&2
	curl -sL https://deb.nodesource.com/setup | sudo bash -
  printf '%s\n' "$(tput setaf 6)nodejs installing. This may take a minute.$(tput sgr0)" >&2
	sudo apt-get install -qq -y nodejs
        }

echo""
echo "$(tput setaf 6)Checking for meteorite...$(tput sgr0)"
if ! which mrt > /dev/null; then
	echo -e "$(tput setaf 6)Meteorite not found! Installing...$(tput sgr0)"
	sudo npm install --silent -g meteorite
fi
echo ""
echo "$(tput setaf 6)Checking for meteor...$(tput sgr0)"
if ! which meteor > /dev/null; then
        echo -e "$(tput setaf 6)Meteor not installed. Attempting Install.$(tput sgr0)"
        curl https://install.meteor.com | /bin/sh
fi

#Arranging for localhost configuration
cat settings/prod.sample.json |  sed 's/flowbat.com/127.0.0.1:1800/' | sed 's/mailUrl.*/mailUrl": "",/' > settings/dev.json

cd "$workingDir"/FlowBAT
mrt install

#Generating upstart configuration for FlowBAT
cat <<EOF > flowbat.conf
# meteorjs - FlowBAT job file

description "FlowBAT"

# When to start the service
start on runlevel [2345]

# When to stop the service
stop on runlevel [016]

# Automatically restart process if crashed
respawn

# Essentially lets upstart know the process will detach itself to the background
expect fork

chdir $workingDir/FlowBAT

script

cd $workingDir/FlowBAT
exec sudo -u $USER meteor --port 1800 run --settings $workingDir/FlowBAT/settings/dev.json testtest

end script
EOF

sed -i 's/testtest/\"$@"/g' flowbat.conf

if [ ! -f /etc/init/flowbat.conf ]; then
	if ask "$(tput setaf 3)Do you wish to have FlowBAT start on boot in the background?$(tput sgr0)"; then
      sudo cp flowbat.conf /etc/init/
		else
			echo "$(tput setaf 2)For future reference, move flowbat.conf to /etc/init/ if you would like to have FlowBAT start on boot.$(tput sgr0)".
		fi
fi

sudo chown -R "$USER":"$USER" $workingDir/FlowBAT/
sudo chown -R "$USER":"$USER" $workingDir/.npm

echo -e "$(tput setaf 2)To manually run FlowBAT, cd to $workingDir/FlowBAT and run:"
echo -e 'meteor --port 1800 run --settings settings/dev.json "$@"'
echo -e 'or to run FlowBAT in the background:'
echo -e 'nohup meteor --port 1800 run --settings settings/dev.json "$@" &'
echo -e "$(tput sgr0)"

echo "$(tput setaf 2)Attempting startup. This may take a few minutes if it is the first time. Press ctrl+c to stop FlowBAT after the application says it is running or proceed to 127.0.0.1:1800 in a browser.$(tput sgr0)"

meteor --port 1800 run --settings settings/dev.json "$@"
