#!/bin/bash

# Automatic SiLK Installation Script
# Chris Sanders & Jason Smith

# Set Listening Interface Variable
interface="eth1"

echo "This script will install SiLK and YAF with default options, logging data to the /data directory.\n"
echo "You will be prompted to enter your password in order to gain the appropriate priviledges to perform this install.\n"
echo "!!!!!An internet connection IS required in order to complete this installation!!!!!\n"
echo "This script is currently configured to collect flow data on network inteface: $interface.\n"


read -p "Do you wish to proceed?" -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]
	then
	exit 1
fi


# Install Prerequisites
sudo apt-get -y install glib2.0 libglib2.0-dev libpcap-dev g++ python-dev make

# Download and Extract SiLK Components
wget http://tools.netsa.cert.org/releases/libfixbuf-1.6.0.tar.gz
wget http://tools.netsa.cert.org/releases/yaf-2.6.0.tar.gz
wget http://tools.netsa.cert.org/releases/silk-3.9.0.tar.gz
tar zxvf libfixbuf-1.6.0.tar.gz
tar zxvf yaf-2.6.0.tar.gz
tar zxvf silk-3.9.0.tar.gz

# Install Libfixbuf
cd libfixbuf-1.6.0/
./configure
make
sudo make install

# Install YAF
cd ../yaf-2.6.0/
export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig
./configure --enable-applabel
make
sudo make install

# Create Data Directory and Install SiLK
sudo mkdir /data
cd ../silk-3.9.0/
./configure --with-libfixbuf=/usr/local/lib/pkgconfig/ --with-python
make
sudo make install

# Configure SiLK
cat <<EOF >>silk.conf
/usr/local/lib
/usr/local/lib/silk
EOF
sudo mv silk.conf /etc/ld.so.conf.d/
sudo ldconfig

sudo cp site/twoway/silk.conf /data

cat <<EOF >sensors.conf
probe S0 ipfix
 listen-on-port 18001
 protocol tcp
 listen-as-host 127.0.0.1
end probe
group my-network
 ipblocks 192.168.1.0/24 # address of eth0. CHANGE THIS.
 ipblocks 10.0.0.0/8 # other blocks you consider internal
end group
sensor S0
 ipfix-probes S0
 internal-ipblocks @my-network
 external-ipblocks remainder
end sensor
EOF
sudo mv sensors.conf /data

cat /usr/local/share/silk/etc/rwflowpack.conf | \
sed 's/ENABLED=/ENABLED=yes/;' | \
sed 's/SENSOR_CONFIG=/SENSOR_CONFIG=\/data\/sensors.conf/;' | \
sed 's/SITE_CONFIG=/SITE_CONFIG=\/data\/silk.conf/' | \
sed 's/LOG_TYPE=syslog/LOG_TYPE=legacy/' | \
sed 's/LOG_DIR=.*/LOG_DIR=\/var\/log/' | \
sed 's/CREATE_DIRECTORIES=.*/CREATE_DIRECTORIES=yes/' \
>> rwflowpack.conf
sudo mv rwflowpack.conf /usr/local/etc/

# Configure Init Script and Automatic Starting
sudo cp /usr/local/share/silk/etc/init.d/rwflowpack /etc/init.d
sudo sudo update-rc.d rwflowpack start 20 3 4 5 .

# Start Rwflowpack
sudo service rwflowpack start

# Start YAF
sudo nohup /usr/local/bin/yaf --silk --ipfix=tcp --live=pcap  --out=127.0.0.1 --ipfix-port=18001 --in=$interface --applabel --max-payload=384 &