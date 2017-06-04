#!/bin/bash

# Automatic SiLK Installation Script
# Chris Sanders & Jason Smith

exec >  >(tee -a silkanalysisinstall.log)
exec 2> >(tee -a silkanalysisinstall.log >&2)

silkversion=$(echo "3.15.0")
lfbversion=$(echo "1.7.1")
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

echo "$(tput setaf 6)This script will install the SiLK Analysis Toolset and dependencies only. This is useful for users that are only interacting with flow data that might reside on another device. If you wish to have full flow collection, use silkonabox.sh."
echo "You will be prompted to enter your password in order to gain the appropriate priviledges to perform this install."
echo "!!!!!An internet connection IS $(tput sgr0)$(tput setaf 1)required$(tput sgr0)$(tput setaf 6) in order to complete this installation!!!!!$(tput sgr0)"

#Check if there is an internet connection
wget -q --tries=10 --timeout=20 --spider http://google.com
if [[ $? -eq 0 ]]; then
        echo "$(tput setaf 2)It appears that you do have an internet connection.$(tput sgr0)"
else
        echo "$(tput setaf 1)It appears that you do not have an internet connection! This installation will fail.$(tput sgr0)"
        if ask "$(tput setaf 2)Do you want to try anyways?$(tput sgr0)$(tput setaf 1)Success is unlikely.$(tput sgr0)"; then
          echo ""
        else
          echo "That was probably a good choice if this is your first time running this install."
          exit 1
        fi
fi

if ask "$(tput setaf 3)Do you wish to proceed?$(tput sgr0)"; then
  echo
else
  exit 1
fi

cd $workingDir

echo "$(tput setaf 6)Checking installed packages...$(tput sgr0)"
sudo apt-get update -qq

# Install Prerequisites
echo -e "$(tput setaf 6)Installing Prerequisites. This might require your password and take a few minutes.$(tput sgr0)"
sudo apt-get -qq -y install glib2.0 libglib2.0-dev libpcap-dev g++ python-dev make gcc

if which rwp2yaf2silk > /dev/null; then
        echo -e "$(tput setaf 2)It looks like SiLK might already be installed.$(tput sgr0)"
        if ask "$(tput setaf 3)Do you wish to proceed and try installing anyways?$(tput sgr0)"; then
          echo
          else
          exit 1
        fi
        else
	# Download and Extract SiLK Components
	if [ ! -f libfixbuf-$lfbversion.tar.gz ]; then
    		echo -e "$(tput setaf 6)libfixbuf-$lfbversion.tar.gz not found. Downloading.$(tput sgr0)"
    		wget http://tools.netsa.cert.org/releases/libfixbuf-$lfbversion.tar.gz
      else
        if ask "$(tput setaf 3)libfixbuf-$lfbversion.tar.gz found. Remove original and download again?$(tput sgr0)"; then
            echo
            rm libfixbuf-$lfbversion.tar.gz
            wget http://tools.netsa.cert.org/releases/libfixbuf-$lfbversion.tar.gz
        fi
	fi
	if [ ! -f silk-$silkversion.tar.gz ]; then
    		echo -e "$(tput setaf 6)silk-$silkversion.tar.gz not found. Downloading.$(tput sgr0)"
    		wget http://tools.netsa.cert.org/releases/silk-$silkversion.tar.gz
      else
            if ask "$(tput setaf 3)silk-$silkversion.tar.gz found. Remove original and download again?$(tput sgr0)"; then
                echo
                rm silk-$silkversion.tar.gz
                wget http://tools.netsa.cert.org/releases/silk-$silkversion.tar.gz
            fi
	fi
	tar zxf libfixbuf-$lfbversion.tar.gz
	tar zxf silk-$silkversion.tar.gz

	# Install Libfixbuf
  echo -e "$(tput setaf 6)Building libfixbuf...$(tput sgr0)"
	cd libfixbuf-$lfbversion/
	./configure
	make
	sudo make install

	# Create Data Directory and Install SiLK
	sudo mkdir /data
	echo -e "$(tput setaf 6)Building SiLK...$(tput sgr0)"
  cd ../silk-$silkversion/
	./configure --with-libfixbuf=/usr/local/lib/pkgconfig/ --with-python
	make
	sudo make install

  echo "$(tput setaf 6)Cleaning up tar files...$(tput sgr0)"
  rm ../libfixbuf-$lfbversion.tar.gz
  rm ../silk-$silkversion.tar.gz

# Configure SiLk
  cat > silk.conf << "EOF"
	  /usr/local/lib
	  /usr/local/lib/silk
EOF

	sudo mv silk.conf /etc/ld.so.conf.d/
	sudo ldconfig
  sudo cp site/twoway/silk.conf /data

	cat > sensors.conf << "EOF"
	 probe S0 ipfix
	 listen-on-port 18001
	 protocol tcp
	 listen-as-host 127.0.0.1
	 end probe
	 group my-network
	 ipblocks 192.168.0.0/16 # address of eth0. CHANGE THIS.
	 ipblocks 172.16.0.0/12 # other blocks you consider internal
	 ipblocks 10.0.0.0/8 # other blocks you consider internal
	 end group
	 sensor S0
	 ipfix-probes S0
	 internal-ipblocks @my-network
	 external-ipblocks remainder
	 end sensor
EOF

	sudo mv sensors.conf /data

fi

## Download country code database - These can be updated as needed via the commands below
wget http://geolite.maxmind.com/download/geoip/database/GeoLiteCountry/GeoIP.dat.gz
gzip -d -c GeoIP.dat.gz | rwgeoip2ccmap --encoded-input > country_codes.pmap
sudo mv country_codes.pmap /usr/local/share/silk/

echo -e "$(tput setaf 2)SiLK installation finished..$(tput sgr0)"
exit 0
