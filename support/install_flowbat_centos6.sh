#!/bin/bash

# Automatic SiLK Installation Script for CentOS6.5
# Chris Sanders & Jason Smith

#!/bin/bash
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
        if ask "$(tput setaf 2)Do you want to do such-and-such?$(tput sgr0)$(tput setaf 1)Success is unlikely.$(tput sgr0)"; then
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
echo "$(tput setaf 6)These appear to be your current interfaces."
ifconfig -a | grep -oP '^[a-zA-Z0-9]{1,}' | sed 's/://g'
tput sgr0
echo "$(tput setaf 3)Which interface do you wish to monitor?$(tput sgr0)"
read interface
interfaceFound=$(grep "$interface" /proc/net/dev)
if  [ ! -n "$interfaceFound" ] ; then
        case "$interface" in
        *) echo  "$(tput setaf 1)The interface that you have chosen does not exist. Please verify.$(tput sgr0)" ;;
        esac
else
        break
fi
done

# Install Prerequisites
echo -e "$(tput setaf 6)Installing Prerequisites. This might require your password and take a few minutes.$(tput sgr0)"
su -c 'yum install -q -y gcc make c-ares c-ares-devel git-core glib2 glib2-devel gnutls gnutls-devel openssl-devel lzo lzo-devel libpcap libpcap-devel net-tools pcre-devel python python-devel wget zlib zlib-devel'

if which rwp2yaf2silk > /dev/null; then
        echo -e "$(tput setaf 2)It looks like SiLK might already be installed.$(tput sgr0)"
        if ask "$(tput setaf 3)Do you wish to proceed and try installing anyways?$(tput sgr0)"; then
          echo
          else
          exit 1
        fi
        else
        # Download and Extract SiLK Components
        if [ ! -f libfixbuf-1.7.1.tar.gz ]; then
                echo -e "$(tput setaf 6)libfixbuf-1.7.1.tar.gz not found. Downloading.$(tput sgr0)"
                wget http://tools.netsa.cert.org/releases/libfixbuf-1.7.1.tar.gz
      else
        if ask "$(tput setaf 3)libfixbuf-1.7.1.tar.gz found. Remove original and download again?$(tput sgr0)"; then
            echo
            rm libfixbuf-1.7.1.tar.gz
            wget http://tools.netsa.cert.org/releases/libfixbuf-1.7.1.tar.gz
        fi
        fi
        if [ ! -f yaf-2.8.1.tar.gz ]; then
                echo -e "$(tput setaf 6)yaf-2.8.1.tar.gz not found. Downloading.$(tput sgr0)"
                wget http://tools.netsa.cert.org/releases/yaf-2.8.1.tar.gz
      else
          if ask "$(tput setaf 3)yaf-2.8.1.tar.gz found. Remove original and download again?$(tput sgr0)"; then
              echo
              rm yaf-2.8.1.tar.gz
              wget http://tools.netsa.cert.org/releases/yaf-2.8.1.tar.gz
          fi
        fi
        if [ ! -f silk-3.11.0.1.tar.gz ]; then
                echo -e "$(tput setaf 6)silk-3.11.0.1.tar.gz not found. Downloading.$(tput sgr0)"
                wget http://tools.netsa.cert.org/releases/silk-3.11.0.1.tar.gz
      else
            if ask "$(tput setaf 3)silk-3.11.0.1.tar.gz found. Remove original and download again?$(tput sgr0)"; then
                echo
                rm silk-3.11.0.1.tar.gz
                wget http://tools.netsa.cert.org/releases/silk-3.11.0.1.tar.gz
            fi
        fi
        tar zxvf libfixbuf-1.7.1.tar.gz
        tar zxvf yaf-2.8.1.tar.gz
        tar zxvf silk-3.11.0.1.tar.gz

        # Install Libfixbuf
  echo -e "$(tput setaf 6)Building libfixbuf...$(tput sgr0)"
        cd libfixbuf-1.7.1/
        ./configure
        make
        sudo make install

        # Install YAF
  echo -e "$(tput setaf 6)Building YAF...$(tput sgr0)"
        cd ../yaf-2.8.1/
        export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig
        ./configure --enable-applabel
        make
        sudo make install

        # Create Data Directory and Install SiLK
        sudo mkdir /data
        echo -e "$(tput setaf 6)Building SiLK...$(tput sgr0)"
  cd ../silk-3.11.0.1/
        ./configure --with-libfixbuf=/usr/local/lib/pkgconfig/ --with-python
        make
        sudo make install

  echo "$(tput setaf 6)Cleaning up tar files...$(tput sgr0)"
  rm ../libfixbuf-1.7.1.tar.gz
  rm ../yaf-2.8.1.tar.gz
  rm ../silk-3.11.0.1.tar.gz

        # Configure SiLK
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

fi

if grep -q 'rwflowpack' /etc/rc.d/rc.local; then
        echo "$(tput setaf 2)It appears you already have flow collection enabled at boot.$(tput sgr0)"
        if ask "$(tput setaf 3)Do you wish to skip putting in redundant commands in /etc/rc.d/rc.local? Saying no to this question could result in duplicate entries in /etc/rc.d/rc.local.(tput sgr0)"; then
                sudo sed -i '$ s,touch,/usr/local/sbin/rwflowpack --sensor-configuration=/data/sensors.conf --site-config-file=/data/silk.conf --output-mode=local-storage --root-directory=/data/ --pidfile=/var/log/rwflowpack.pid --log-level=info --log-directory=/var/log --log-basename=rwflowpack\ntouch,' /etc/rc.d/rc.local
                sudo sed -i "$ s,touch,nohup /usr/local/bin/yaf --silk --ipfix=tcp --live=pcap  --out=127.0.0.1 --ipfix-port=18001 --in=$interface --applabel --max-payload=384 \&\ntouch," /etc/rc.d/rc.local
        else
                exit 0
        fi
      else
        if ask "$(tput setaf 3)Do you wish to setup flow collection on boot?$(tput sgr0)"; then
              onBoot=$(echo "---YAF and rwflowpack start on boot")
              sudo sed -i '$ s,touch,/usr/local/sbin/rwflowpack --sensor-configuration=/data/sensors.conf --site-config-file=/data/silk.conf --output-mode=local-storage --root-directory=/data/ --pidfile=/var/log/rwflowpack.pid --log-level=info --log-directory=/var/log --log-basename=rwflowpack\ntouch,' /etc/rc.d/rc.local
              sudo sed -i "$ s,touch,nohup /usr/local/bin/yaf --silk --ipfix=tcp --live=pcap  --out=127.0.0.1 --ipfix-port=18001 --in=$interface --applabel --max-payload=384 \&\ntouch," /etc/rc.d/rc.local
              sudo chmod +x /etc/rc.d/rc.local
        else
              exit 0
        fi
fi

if ask "$(tput setaf 3)Would you like to go ahead and start collecting data now?$(tput sgr0)"; then
  startNow=$(echo "---Collection Interface = $interface")
  sudo /usr/local/sbin/rwflowpack --sensor-configuration=/data/sensors.conf --site-config-file=/data/silk.conf --output-mode=local-storage --root-directory=/data/ --pidfile=/var/log/rwflowpack.pid --log-level=info --log-directory=/var/log --log-basename=rwflowpack
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
