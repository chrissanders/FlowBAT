#!/bin/bash

# Automatic SiLK Installation Script
# Chris Sanders & Jason Smith

exec >  >(tee -a silkinstall.log)
exec 2> >(tee -a silkinstall.log >&2)

silkversion=$(echo "3.11.0.1")
yafversion=$(echo "2.8.0")
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

echo "$(tput setaf 6)This script will install SiLK and YAF with default options, logging data to the /data directory."
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

#Set interface variable
while true; do
        echo "$(tput setaf 3)Which interface do you wish to monitor?"
        cd /sys/class/net && select interface in *; do
                tput sgr0
                if [ "$interface" = "" ]; then
                        echo  "$(tput setaf 1)You didn't pick an interface. Pick a number from the list.$(tput sgr0)"
                else
                        if [ ! -d "/sys/class/net/$interface" ]; then
                                echo  "$(tput setaf 1)The interface that you have chosen does not exist. Please verify.$(tput sgr0)"
                        else
                                echo "$(tput setaf 6)You will be monitoring the $interface interface$(tput sgr0)"
                                break
                        fi
                fi
        done
        break
done
cd $workingDir

if grep -q 'rwflowpack' /etc/rc.local; then
        echo "$(tput setaf 2)It appears you already have flow collection enabled at boot, which also indicates you might have already installed SiLK.$(tput sgr0)"
        if ask "$(tput setaf 3)Do you wish to skip putting in redundant commands in /etc/rc.local? Saying no to this question could result in duplicate entries in /etc/rc.local.(tput sgr0)"; then
          echo "$(tput setaf 2)continuing installation...$(tput sgr0)"
        else
          sudo sed -i '$ s,exit 0,/usr/local/sbin/rwflowpack --compression-method=best --sensor-configuration=/data/sensors.conf --site-config-file=/data/silk.conf --output-mode=local-storage --root-directory=/data/ --pidfile=/var/log/rwflowpack.pid --log-level=info --log-directory=/var/log --log-basename=rwflowpack\nexit 0,' /etc/rc.local
          sudo sed -i "$ s,exit 0,nohup /usr/local/bin/yaf --silk --ipfix=tcp --live=pcap  --out=127.0.0.1 --ipfix-port=18001 --in=$interface --applabel --max-payload=384 \&\nexit 0," /etc/rc.local
        fi
      else
        if ask "$(tput setaf 3)Do you wish to setup flow collection on boot?$(tput sgr0)"; then
              onBoot=$(echo "---YAF and rwflowpack start on boot")
              sudo sed -i '$ s,exit 0,/usr/local/sbin/rwflowpack --compression-method=best --sensor-configuration=/data/sensors.conf --site-config-file=/data/silk.conf --output-mode=local-storage --root-directory=/data/ --pidfile=/var/log/rwflowpack.pid --log-level=info --log-directory=/var/log --log-basename=rwflowpack\nexit 0,' /etc/rc.local
              sudo sed -i "$ s,exit 0,nohup /usr/local/bin/yaf --silk --ipfix=tcp --live=pcap  --out=127.0.0.1 --ipfix-port=18001 --in=$interface --applabel --max-payload=384 \&\nexit 0," /etc/rc.local
        else
              exit 0
        fi
fi

if ask "$(tput setaf 3)Would you like to start flow collection after installation?$(tput sgr0)"; then
  silkstartnow=$(echo "yes")
fi

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
	if [ ! -f yaf-$yafversion.tar.gz ]; then
    		echo -e "$(tput setaf 6)yaf-$yafversion.tar.gz not found. Downloading.$(tput sgr0)"
    		wget http://tools.netsa.cert.org/releases/yaf-$yafversion.tar.gz
      else
          if ask "$(tput setaf 3)yaf-$yafversion.tar.gz found. Remove original and download again?$(tput sgr0)"; then
              echo
              rm yaf-$yafversion.tar.gz
              wget http://tools.netsa.cert.org/releases/yaf-$yafversion.tar.gz
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
	tar zxf yaf-$yafversion.tar.gz
	tar zxf silk-$silkversion.tar.gz

	# Install Libfixbuf
  echo -e "$(tput setaf 6)Building libfixbuf...$(tput sgr0)"
	cd libfixbuf-$lfbversion/
	./configure
	make
	sudo make install

	# Install YAF
  echo -e "$(tput setaf 6)Building YAF...$(tput sgr0)"
	cd ../yaf-$yafversion/
	export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig
	./configure --enable-applabel
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
  rm ../yaf-$yafversion.tar.gz
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

	cat /usr/local/share/silk/etc/rwflowpack.conf | \
	sed 's/ENABLED=/ENABLED=yes/;' | \
	sed 's/SENSOR_CONFIG=/SENSOR_CONFIG=\/data\/sensors.conf/;' | \
	sed 's/SITE_CONFIG=/SITE_CONFIG=\/data\/silk.conf/' | \
	sed 's/LOG_TYPE=syslog/LOG_TYPE=legacy/' | \
	sed 's/LOG_DIR=.*/LOG_DIR=\/var\/log/' | \
	sed 's/CREATE_DIRECTORIES=.*/CREATE_DIRECTORIES=yes/' \
	>> rwflowpack.conf
	sudo mv rwflowpack.conf /usr/local/etc/

fi

## Download country code database - These can be updated as needed via the commands below
wget http://geolite.maxmind.com/download/geoip/database/GeoLiteCountry/GeoIP.dat.gz
gzip -d -c GeoIP.dat.gz | rwgeoip2ccmap --encoded-input > country_codes.pmap
sudo mv country_codes.pmap /usr/local/share/silk/

# Start up services
if [ ! -z "$silkstartnow" ]; then
  startNow=$(echo "---Collection Interface = $interface")
  sudo /usr/local/sbin/rwflowpack --compression-method=best --sensor-configuration=/data/sensors.conf --site-config-file=/data/silk.conf --output-mode=local-storage --root-directory=/data/ --pidfile=/var/log/rwflowpack.pid --log-level=info --log-directory=/var/log --log-basename=rwflowpack
  sudo nohup /usr/local/bin/yaf --silk --ipfix=tcp --live=pcap  --out=127.0.0.1 --ipfix-port=18001 --in=$interface --applabel --max-payload=384 &
  pidrwflowpack=$(pidof rwflowpack)
  pidyaf=$(pidof yaf)
  rwflowpackstatus=$(echo "---rwflowpack pid = $pidrwflowpack")
  yafstatus=$(echo "---yaf pid = $pidyaf")
fi

echo -e "$(tput setaf 2)SiLK and YAF installation finished.$(tput sgr0)"
echo -e "$(tput setaf 2)$onBoot\n$startNow\n$rwflowpackstatus\n$yafstatus$(tput sgr0)"
echo
echo -e "$(tput setaf 2)Config files\n---/data/silk.conf\n---/data/sensors.conf\n---root-directory=/data/$(tput sgr0)"
exit 0
