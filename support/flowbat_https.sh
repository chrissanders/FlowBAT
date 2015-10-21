#!/bin/bash
# This script is just a really quick way to get FlowBAT operating via an nginx https
# proxy. The security of the keys and all configuration details is the burden of the
# user. The only configuration item you'll need to make sure you specify is the
# common name (use ip address or hostname of flowbat box).

# References:
# https://www.digitalocean.com/community/tutorials/how-to-deploy-a-meteor-js-application-on-ubuntu-14-04-with-nginx
# https://www.digitalocean.com/community/tutorials/how-to-create-a-ssl-certificate-on-nginx-for-ubuntu-12-04
# http://blog.didierstevens.com/2008/12/30/howto-make-your-own-cert-with-openssl/

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

echo "$(tput setaf 6)This script will mirror FlowBAT to an NGINX HTTPS proxy."
if ask "$(tput setaf 3)The existing HTTP FlowBAT instance will still be available after setting up this HTTPS proxy, so you'll need to block access to it after running this script if you want it inaccessible. Do you want to go ahead and try to set up an HTTPS proxy for FlowBAT?$(tput sgr0)"; then
	echo "Proceeding to install."
else
	exit
fi

# Installing nginx
echo ""
echo "$(tput setaf 6)Installing NGINX$(tput sgr0)"
sudo apt-get install -y nginx

# Generate keys
echo ""
echo "$(tput setaf 6)Generating keys. Set the common name to the IP or hostname of the FlowBAT device.$(tput sgr0)"
sudo mkdir /etc/nginx/ssl
sudo openssl genrsa -des3 -out /etc/nginx/ssl/flowbat.key 4096
sudo openssl req -new -key /etc/nginx/ssl/flowbat.key -out /etc/nginx/ssl/flowbat.csr #common name should be ip or hostname *important*
sudo cp /etc/nginx/ssl/flowbat.key /etc/nginx/ssl/flowbat.key.org
sudo openssl rsa -in /etc/nginx/ssl/flowbat.key.org -out /etc/nginx/ssl/flowbat.key
sudo openssl x509 -req -days 365 -in /etc/nginx/ssl/flowbat.csr -signkey /etc/nginx/ssl/flowbat.key -out /etc/nginx/ssl/flowbat.crt
sudo chmod 0700 /etc/nginx/ssl

#Creating FlowBAT nginx configuration
echo ""
echo "$(tput setaf 6)Creating FlowBAT nginx configuration$(tput sgr0)"
cat > flowbatnginx << 'EOF'
server_tokens off; # for security-by-obscurity: stop displaying nginx version

# this section is needed to proxy web-socket connections
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# HTTP
server {
    listen 80 default_server; # if this is not a default server, remove "default_server"
    listen [::]:80 default_server ipv6only=on;

    root /usr/share/nginx/html; # root is irrelevant
    index index.html index.htm; # this is also irrelevant

    server_name todos.net; # the domain on which we want to host the application. Since we set "default_server" previously, nginx will answer all hosts anyway.

    # redirect non-SSL to SSL
    location / {
        rewrite     ^ https://$server_name$request_uri? permanent;
    }
}

# HTTPS server
server {
    listen 443 ssl spdy; # we enable SPDY here
    server_name todos.net; # this domain must match Common Name (CN) in the SSL certificate

    root html; # irrelevant
    index index.html; # irrelevant

    ssl_certificate /etc/nginx/ssl/flowbat.crt; # full path to SSL certificate and CA certificate concatenated together
    ssl_certificate_key /etc/nginx/ssl/flowbat.key; # full path to SSL key

    # performance enhancement for SSL
    ssl_stapling on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 5m;

    # safety enhancement to SSL: make sure we actually use a safe cipher
    ssl_prefer_server_ciphers on;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:ECDHE-RSA-RC4-SHA:ECDHE-ECDSA-RC4-SHA:RC4-SHA:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!3DES:!MD5:!PSK';

    # config to enable HSTS(HTTP Strict Transport Security) https://developer.mozilla.org/en-US/docs/Security/HTTP_Strict_Transport_Security
    # to avoid ssl stripping https://en.wikipedia.org/wiki/SSL_stripping#SSL_stripping
    add_header Strict-Transport-Security "max-age=31536000;";

    # If your application is not compatible with IE <= 10, this will redirect visitors to a page advising a browser update
    # This works because IE 11 does not present itself as MSIE anymore
    if ($http_user_agent ~ "MSIE" ) {
        return 303 https://browser-update.org/update.html;
    }

    # pass all requests to Meteor
    location / {
        proxy_pass http://127.0.0.1:1800;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade; # allow websockets
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header X-Forwarded-For $remote_addr; # preserve client IP

        # this setting allows the browser to cache the application in a way compatible with Meteor
        # on every applicaiton update the name of CSS and JS file is different, so they can be cache infinitely (here: 30 days)
        # the root path (/) MUST NOT be cached
        if ($uri != '/') {
            expires 30d;
        }
    }
}
EOF

echo ""
# set flowbat to be the default page
echo "$(tput setaf 6)Setting FlowBAT to be the default page$(tput sgr0)"
sudo cp flowbatnginx /etc/nginx/sites-available/flowbat
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/flowbat /etc/nginx/sites-enabled/flowbat

echo ""
# Test and Reload nginx with the new configuration
echo "$(tput setaf 6)Testing/Reloading nginx with the new configuration$(tput sgr0)"
sudo nginx -t
sudo nginx -s reload

# Try going to the page in your browser.
echo "$(tput setaf 6)Try going to the page in your browser.$(tput sgr0)"
echo 'https://{ipaddress or hostname you defined}'

