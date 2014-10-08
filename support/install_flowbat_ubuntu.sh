#!/bin/bash

# Automatic FlowBAT Installation Script
# Chris Sanders & Jason Smith

clear
echo -e "-- FlowBAT: Network Flow Basic Analysis Tool -- \n\n"
echo -e "This script will install FlowBAT on to an Ubuntu system.\n"
echo -e "It has been tested with Ubuntu 12.04 and 14.04.\n"
echo -e "You will be prompted to enter your password to perform this install.\n"
echo -e "!!!!! An internet connection IS required in order to complete this installation !!!!!\n\n\n"

read -p "Do you wish to proceed(y/n)?" -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]
	then
	exit 1
fi

echo -e "\nPlease provide the username that FlowBAT will run as. We recommend a service account be used for this purpose, as the account will require the ability to perform sudo without entering a password:"
read acctusername
if [ -z "$acctusername" ]
	then
	echo "Account Username is Required to Proceed!"
	exit 1
fi

echo -e "\nPlease provide the password that the FlowBAT user account will use:"
read acctpassword
if [ -z "$acctpassword" ]
	then
	echo "Account Password is Required to Proceed!"
	exit 1
fi

fbhostname=$(echo $hostname)

echo -e "\n\nYou have entered the following information:"
echo -e "Username: $acctusername\nPassword: $acctpassword\nRun Directory: $rundir\n"


read -p "Everything is all set! You will be prompted to enter your sudo password during this installation. Do you wish to proceed(y/n)?" -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]
	then
	exit 1
fi

# Add FlowBAT User as a NOPASSWD required sudoer
echo -e "$acctusername ALL=(ALL) NOPASSWD: ALL" | sudo tee -a /etc/sudoers

# Install GIT
echo -e "Installing Git..."
sudo apt-get install -y git

# Install Node
echo -e "Install Nodejs..."
curl -sL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install -y nodejs

# Install Meteorite
echo -e "Installing Meteorite..."
sudo npm install -g meteorite

#Install MUP
echo -e "Installing MUP..."
sudo npm install -g mup@0.5.2

# Install Meteor
echo -e "Installing Meteor..."
curl https://install.meteor.com | /bin/sh

# Install SSHPass
echo -e "Installing SSHPass..."
sudo apt-get -y install sshpass

# Clone FlowBAT Repo
echo -e "Cloning FlowBAT Repository"
git clone https://github.com/chrissanders/FlowBAT.git

# Configuring FlowBAT Settings
cd FlowBAT/
srcdir=$(echo $PWD)

rm settings.json
cat settings/prod.sample.json | sed 's/flowbat.com/127.0.0.1/;' | sed 's$mailUrl.*$mailUrl": "",$;' > settings.json
cat mup.sample.json | sed -e "s/fbusername/$acctusername/;" | sed "s/fbpassword/$acctpassword/;" | sed "s,fbpath,$srcdir,;" > mup.json

# Configure Target Server
mrt install
DEBUG=* mup setup

# Deploy FlowBAT
sudo mup deploy

echo -e "\n***********************************************************"
echo -e "Setup is complete! You should be able to access FlowBAT at 127.0.0.1:1800. Once you access this page, you will be prompted to create a user account and configure your mode of operation."
echo -e "\n***********************************************************"