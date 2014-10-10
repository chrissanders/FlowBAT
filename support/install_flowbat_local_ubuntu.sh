#!/bin/bash

if [ ! -d "/home/$USER/opt/FlowBAT/" ]; then
	echo "This script will install flowbat locally, to be accessed at http://localhost:1800. Are you sure you want to install?"
	read -p "Are you sure you want to install? " -n 1 -r
	echo    # (optional) move to a new line
	if [[ ! $REPLY =~ ^[Yy]$ ]]; then
		exit 1
	fi
fi

function testinstall {
	dpkg -s $1 &> /dev/null || {
	    printf '%s\n' "$1 not installed. Attempting install." >&2
	    sudo apt-get install -qq -y $1
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
	echo "Downloading FlowBAT..."
	git clone https://github.com/chrissanders/FlowBAT.git
fi
cd FlowBAT/

echo "Checking for nodejs..."
dpkg -s nodejs &> /dev/null || {
	printf '%s\n' "nodejs not installed. Attempting install." >&2
	curl -sL https://deb.nodesource.com/setup | sudo bash -
	sudo apt-get install -qq -y nodejs
        }

echo "Checking for meteorite..."

if ! which mrt > /dev/null; then
	echo -e "Meteorite not found! Installing..."
	sudo npm install --silent -g meteorite
fi

cat settings/prod.sample.json |  sed 's/flowbat.com/127.0.0.1:1800/' | sed 's/mailUrl.*/mailUrl": "",/' > settings/dev.json

cd /home/$USER/opt/FlowBAT
mrt install

sudo chown -R $USER:$USER /home/$USER/
meteor --port 1800 run --settings settings/dev.json "$@"
