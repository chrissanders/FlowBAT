#!/bin/bash

if [ "$1" = "--update" ]; then
echo "$(tput setaf 4)This script will install flowbat updates automatically. If it is not up-to-date, it will require a FlowBAT restart.$(tput sgr0)"
        read -p "$(tput setaf 3)Are you sure you want to update?$(tput sgr0)" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
        else
		cd /home/"$USER"/opt/FlowBAT/
		git pull
		exit
	fi
fi

if [ ! -d "/home/$USER/opt/FlowBAT/" ]; then
  echo "$(tput setaf 4)This script will install flowbat locally, to be accessed at http://localhost:1800$(tput sgr0)"
	read -p "$(tput setaf 3)Are you sure you want to install?$(tput sgr0)" -n 1 -r
	echo    # (optional) move to a new line
	if [[ ! $REPLY =~ ^[Yy]$ ]]; then
		exit 1
	fi
fi

echo "$(tput setaf 4)Checking installed packages...$(tput sgr0)"
sudo apt-get update -qq
function testinstall {
	dpkg -s "$1" &> /dev/null || {
	    printf '%s\n' "$(tput setaf 4)$1 not installed. Attempting install.$(tput sgr0)" >&2
	    sudo apt-get install -qq -y "$1"
	}
}

testinstall build-essential
testinstall checkinstall
testinstall curl
testinstall git-core

if [ ! -d "/home/$USER/opt/FlowBAT/" ]; then
  mkdir opt
fi

cd opt/

if [ ! -d "/home/$USER/opt/FlowBAT/" ]; then
	echo "$(tput setaf 4)Downloading FlowBAT...$(tput sgr0)"
	git clone https://github.com/chrissanders/FlowBAT.git
fi
cd FlowBAT/

echo""
echo "$(tput setaf 4)Checking for nodejs...$(tput sgr0)"
dpkg -s nodejs &> /dev/null || {
	printf '%s\n' "nodejs not installed. Attempting install." >&2
	curl -sL https://deb.nodesource.com/setup | sudo bash -
  printf '%s\n' "$(tput setaf 4)nodejs installing. This may take a minute.$(tput sgr0)" >&2
	sudo apt-get install -qq -y nodejs
        }

echo""
echo "$(tput setaf 4)Checking for meteorite...$(tput sgr0)"
if ! which mrt > /dev/null; then
	echo -e "$(tput setaf 4)Meteorite not found! Installing...$(tput sgr0)"
	sudo npm install --silent -g meteorite
fi
echo ""
echo "$(tput setaf 4)Checking for meteor...$(tput sgr0)"
if ! which meteor > /dev/null; then
        echo -e "$(tput setaf 4)Meteor not installed. Attempting Install.$(tput sgr0)"
        curl https://install.meteor.com | /bin/sh
fi

#Arranging for localhost configuration
cat settings/prod.sample.json |  sed 's/flowbat.com/127.0.0.1:1800/' | sed 's/mailUrl.*/mailUrl": "",/' > settings/dev.json

cd /home/"$USER"/opt/FlowBAT
mrt install

#Generating upstart configuration for FlowBAT
cat > flowbat.conf << "EOF"
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

chdir /home/$USER/opt/FlowBAT

script

cd /home/$USER/opt/FlowBAT
exec sudo -u $USER meteor --port 1800 run --settings /home/$USER/opt/FlowBAT/settings/dev.json "$@"

end script
EOF

if [ ! -f /etc/init/flowbat.conf ]; then
	read -p "$(tput setaf 3)Do you wish to have FlowBAT start on boot?$(tput sgr0)" -n 1 -r
        	echo
	        if [[ $REPLY =~ ^[Yy]$ ]]; then
	                sudo cp flowbat.conf /etc/init/
		else
			echo "$(tput setaf 2)For future reference, move flowbat.conf to /etc/init/ if you would like to have FlowBAT start on boot.$(tput sgr0)".
		fi
fi

sudo chown -R "$USER":"$USER" /home/"$USER"/

echo -e "$(tput setaf 2)To manually run FlowBAT, cd to /home/$USER/opt/FlowBAT and run:"
echo -e 'meteor --port 1800 run --settings settings/dev.json "$@"'
echo -e "$(tput sgr0)"

echo "$(tput setaf 2)Attempting startup. This may take a few minutes if it is the first time. Press ctrl+c to stop FlowBAT after the application says it is running or proceed to 127.0.0.1:1800 in a browser.$(tput sgr0)"

meteor --port 1800 run --settings settings/dev.json "$@"

