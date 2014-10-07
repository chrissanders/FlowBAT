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

echo -e "\nPlease provide the directory you wish to run FlowBAT from. This should be the directory you cloned the FlowBAT GitHub repo into:"
read rundir
if [ -z "$rundir" ]
	then
	echo "Run Directory is Required to Proceed!"
	exit 1
fi

fbhostname=$(echo $hostname)

echo -e "\n\nYou have entered the following information:"
echo -e "Username: $acctusername\nPassword: $acctpassword\nRun Directory: $rundir\n"


read -p "Do you wish to proceed(y/n)?" -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]
	then
	exit 1
fi