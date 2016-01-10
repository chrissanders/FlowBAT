Template.table.helpers
  isPivotable: (output) ->
    output isnt "rwcount"
  fieldI18n: ->
    i18n.t("rwcut.fields." + @_id)
  protocolname: ->
    if @value is "0"
      i18n.t(@value)
    else if @value is "1"
      i18n.t("ICMP" + " (" + @value + ")")
    else if @value is "2"
      i18n.t("IGMP" + " (" + @value + ")")
    else if @value is "3"
      i18n.t("GGP" + " (" + @value + ")")
    else if @value is "4"
      i18n.t("IPv4" + " (" + @value + ")")
    else if @value is "5"
      i18n.t("ST" + " (" + @value + ")")
    else if @value is "6"
      i18n.t("TCP" + " (" + @value + ")")
    else if @value is "7"
      i18n.t("CBT" + " (" + @value + ")")
    else if @value is "8"
      i18n.t("EGP" + " (" + @value + ")")
    else if @value is "9"
      i18n.t("IGP" + " (" + @value + ")")
    else if @value is "10"
      i18n.t("BBN-RCC-MON" + " (" + @value + ")")
    else if @value is "11"
      i18n.t("NVP-II" + " (" + @value + ")")
    else if @value is "12"
      i18n.t("PUP" + " (" + @value + ")")
    else if @value is "13"
      i18n.t("ARGUS" + " (" + @value + ")")
    else if @value is "14"
      i18n.t("EMCON" + " (" + @value + ")")
    else if @value is "15"
      i18n.t("XNET" + " (" + @value + ")")
    else if @value is "16"
      i18n.t("CHAOS" + " (" + @value + ")")
    else if @value is "17"
      i18n.t("UDP" + " (" + @value + ")")
    else if @value is "18"
      i18n.t("MUX" + " (" + @value + ")")
    else if @value is "19"
      i18n.t("DCN-MEAS" + " (" + @value + ")")
    else if @value is "20"
      i18n.t("HMP" + " (" + @value + ")")
    else if @value is "21"
      i18n.t("PRM" + " (" + @value + ")")
    else if @value is "22"
      i18n.t("XNS-IDP" + " (" + @value + ")")
    else if @value is "23"
      i18n.t("TRUNK-1" + " (" + @value + ")")
    else if @value is "24"
      i18n.t("TRUNK-2" + " (" + @value + ")")
    else if @value is "25"
      i18n.t("LEAF-1" + " (" + @value + ")")
    else if @value is "26"
      i18n.t("LEAF-2" + " (" + @value + ")")
    else if @value is "27"
      i18n.t("RDP" + " (" + @value + ")")
    else if @value is "28"
      i18n.t("IRTP" + " (" + @value + ")")
    else if @value is "29"
      i18n.t("ISO-TP4" + " (" + @value + ")")
    else if @value is "30"
      i18n.t("NETBLT" + " (" + @value + ")")
    else if @value is "31"
      i18n.t("MFE-NSP" + " (" + @value + ")")
    else if @value is "32"
      i18n.t("MERIT-INP" + " (" + @value + ")")
    else if @value is "33"
      i18n.t("DCCP" + " (" + @value + ")")
    else if @value is "34"
      i18n.t("3PC" + " (" + @value + ")")
    else if @value is "35"
      i18n.t("IDPR" + " (" + @value + ")")
    else if @value is "36"
      i18n.t("XTP" + " (" + @value + ")")
    else if @value is "37"
      i18n.t("DDP" + " (" + @value + ")")
    else if @value is "38"
      i18n.t("IDPR-CMTP" + " (" + @value + ")")
    else if @value is "39"
      i18n.t("TP++" + " (" + @value + ")")
    else if @value is "40"
      i18n.t("IL" + " (" + @value + ")")
    else if @value is "41"
      i18n.t("IPv6" + " (" + @value + ")")
    else if @value is "42"
      i18n.t("SDRP" + " (" + @value + ")")
    else if @value is "43"
      i18n.t("IPv6-Route" + " (" + @value + ")")
    else if @value is "44"
      i18n.t("IPv6-Frag" + " (" + @value + ")")
    else if @value is "45"
      i18n.t("IDRP" + " (" + @value + ")")
    else if @value is "46"
      i18n.t("RSVP" + " (" + @value + ")")
    else if @value is "47"
      i18n.t("GRE" + " (" + @value + ")")
    else if @value is "48"
      i18n.t("DSR" + " (" + @value + ")")
    else if @value is "49"
      i18n.t("BNA" + " (" + @value + ")")
    else if @value is "50"
      i18n.t("ESP" + " (" + @value + ")")
    else if @value is "51"
      i18n.t("AH" + " (" + @value + ")")
    else if @value is "52"
      i18n.t("I-NLSP" + " (" + @value + ")")
    else if @value is "53"
      i18n.t("SWIPE" + " (" + @value + ")")
    else if @value is "54"
      i18n.t("NARP" + " (" + @value + ")")
    else if @value is "55"
      i18n.t("MOBILE" + " (" + @value + ")")
    else if @value is "56"
      i18n.t("TLSP" + " (" + @value + ")")
    else if @value is "57"
      i18n.t("SKIP" + " (" + @value + ")")
    else if @value is "58"
      i18n.t("IPv6-ICMP" + " (" + @value + ")")
    else if @value is "59"
      i18n.t("IPv6-NoNxt" + " (" + @value + ")")
    else if @value is "60"
      i18n.t("IPv6-Opts" + " (" + @value + ")")
    else if @value is "62"
      i18n.t("CFTP" + " (" + @value + ")")
    else if @value is "63"
      i18n.t("" + " (" + @value + ")")
    else if @value is "64"
      i18n.t("SAT-EXPAK" + " (" + @value + ")")
    else if @value is "65"
      i18n.t("KRYPTOLAN" + " (" + @value + ")")
    else if @value is "66"
      i18n.t("RVD" + " (" + @value + ")")
    else if @value is "67"
      i18n.t("IPPC" + " (" + @value + ")")
    else if @value is "69"
      i18n.t("SAT-MON" + " (" + @value + ")")
    else if @value is "70"
      i18n.t("VISA" + " (" + @value + ")")
    else if @value is "71"
      i18n.t("IPCV" + " (" + @value + ")")
    else if @value is "72"
      i18n.t("CPNX" + " (" + @value + ")")
    else if @value is "73"
      i18n.t("CPHB" + " (" + @value + ")")
    else if @value is "74"
      i18n.t("WSN" + " (" + @value + ")")
    else if @value is "75"
      i18n.t("PVP" + " (" + @value + ")")
    else if @value is "76"
      i18n.t("BR-SAT-MON" + " (" + @value + ")")
    else if @value is "77"
      i18n.t("SUN-ND" + " (" + @value + ")")
    else if @value is "78"
      i18n.t("WB-MON" + " (" + @value + ")")
    else if @value is "79"
      i18n.t("WB-EXPAK" + " (" + @value + ")")
    else if @value is "80"
      i18n.t("ISO-IP" + " (" + @value + ")")
    else if @value is "81"
      i18n.t("VMTP" + " (" + @value + ")")
    else if @value is "82"
      i18n.t("SECURE-VMTP" + " (" + @value + ")")
    else if @value is "83"
      i18n.t("VINES" + " (" + @value + ")")
    else if @value is "84"
      i18n.t("TTP" + " (" + @value + ")")
    else if @value is "84"
      i18n.t("IPTM" + " (" + @value + ")")
    else if @value is "85"
      i18n.t("NSFNET-IGP" + " (" + @value + ")")
    else if @value is "86"
      i18n.t("DGP" + " (" + @value + ")")
    else if @value is "87"
      i18n.t("TCF" + " (" + @value + ")")
    else if @value is "88"
      i18n.t("EIGRP" + " (" + @value + ")")
    else if @value is "89"
      i18n.t("OSPFIGP" + " (" + @value + ")")
    else if @value is "90"
      i18n.t("Sprite-RPC" + " (" + @value + ")")
    else if @value is "91"
      i18n.t("LARP" + " (" + @value + ")")
    else if @value is "92"
      i18n.t("MTP" + " (" + @value + ")")
    else if @value is "93"
      i18n.t("AX.25" + " (" + @value + ")")
    else if @value is "94"
      i18n.t("IPIP" + " (" + @value + ")")
    else if @value is "95"
      i18n.t("MICP" + " (" + @value + ")")
    else if @value is "96"
      i18n.t("SCC-SP" + " (" + @value + ")")
    else if @value is "97"
      i18n.t("ETHERIP" + " (" + @value + ")")
    else if @value is "98"
      i18n.t("ENCAP" + " (" + @value + ")")
    else if @value is "100"
      i18n.t("GMTP" + " (" + @value + ")")
    else if @value is "101"
      i18n.t("IFMP" + " (" + @value + ")")
    else if @value is "102"
      i18n.t("PNNI" + " (" + @value + ")")
    else if @value is "103"
      i18n.t("PIM" + " (" + @value + ")")
    else if @value is "104"
      i18n.t("ARIS" + " (" + @value + ")")
    else if @value is "105"
      i18n.t("SCPS" + " (" + @value + ")")
    else if @value is "106"
      i18n.t("QNX" + " (" + @value + ")")
    else if @value is "107"
      i18n.t("A/N" + " (" + @value + ")")
    else if @value is "108"
      i18n.t("IPComp" + " (" + @value + ")")
    else if @value is "109"
      i18n.t("SNP" + " (" + @value + ")")
    else if @value is "110"
      i18n.t("Compaq-Peer" + " (" + @value + ")")
    else if @value is "111"
      i18n.t("IPX-in-IP" + " (" + @value + ")")
    else if @value is "112"
      i18n.t("VRRP" + " (" + @value + ")")
    else if @value is "113"
      i18n.t("PGM" + " (" + @value + ")")
    else if @value is "115"
      i18n.t("L2TP" + " (" + @value + ")")
    else if @value is "116"
      i18n.t("DDX" + " (" + @value + ")")
    else if @value is "117"
      i18n.t("IATP" + " (" + @value + ")")
    else if @value is "118"
      i18n.t("STP" + " (" + @value + ")")
    else if @value is "119"
      i18n.t("SRP" + " (" + @value + ")")
    else if @value is "120"
      i18n.t("UTI" + " (" + @value + ")")
    else if @value is "121"
      i18n.t("SMP" + " (" + @value + ")")
    else if @value is "122"
      i18n.t("SM" + " (" + @value + ")")
    else if @value is "123"
      i18n.t("PTP" + " (" + @value + ")")
    else if @value is "124"
      i18n.t("ISIS over IPv4" + " (" + @value + ")")
    else if @value is "125"
      i18n.t("FIRE" + " (" + @value + ")")
    else if @value is "126"
      i18n.t("CRTP" + " (" + @value + ")")
    else if @value is "127"
      i18n.t("CRUDP" + " (" + @value + ")")
    else if @value is "128"
      i18n.t("SSCOPMCE" + " (" + @value + ")")
    else if @value is "129"
      i18n.t("IPLT" + " (" + @value + ")")
    else if @value is "130"
      i18n.t("SPS" + " (" + @value + ")")
    else if @value is "131"
      i18n.t("PIPE" + " (" + @value + ")")
    else if @value is "132"
      i18n.t("SCTP" + " (" + @value + ")")
    else if @value is "133"
      i18n.t("FC" + " (" + @value + ")")
    else if @value is "134"
      i18n.t("RSVP-E2E-IGNORE" + " (" + @value + ")")
    else if @value is "135"
      i18n.t("Mobility Header" + " (" + @value + ")")
    else if @value is "136"
      i18n.t("UDPLite" + " (" + @value + ")")
    else if @value is "137"
      i18n.t("MPLS-in-IP" + " (" + @value + ")")
    else if @value is "138"
      i18n.t("manet" + " (" + @value + ")")
    else if @value is "139"
      i18n.t("HIP" + " (" + @value + ")")
    else if @value is "140"
      i18n.t("Shim6" + " (" + @value + ")")
    else if @value is "141"
      i18n.t("WESP" + " (" + @value + ")")
    else if @value is "142"
      i18n.t("ROHC" + " (" + @value + ")")
    else if @value is "255"
      i18n.t("Reserved" + " (" + @value + ")")
    else i18n.t(@value)
  appname: ->
    if @value is "80"
      i18n.t("HTTP" + " (" + @value + ")")
    else if @value is "22"
      i18n.t("SSH" + " (" + @value + ")")
    else if @value is "25"
      i18n.t("SMTP" + " (" + @value + ")")
    else if @value is "6346"
      i18n.t("Gnutella" + " (" + @value + ")")
    else if @value is "5050"
      i18n.t("Yahoo Messenger" + " (" + @value + ")")
    else if @value is "53"
      i18n.t("DNS" + " (" + @value + ")")
    else if @value is "137"
      i18n.t("NETBIOS*" + " (" + @value + ")")
    else if @value is "21"
      i18n.t("FTP" + " (" + @value + ")")
    else if @value is "443"
      i18n.t("SSL/TLS" + " (" + @value + ")")
    else if @value is "427"
      i18n.t("SLP" + " (" + @value + ")")
    else if @value is "143"
      i18n.t("IMAP" + " (" + @value + ")")
    else if @value is "194"
      i18n.t("IRC" + " (" + @value + ")")
    else if @value is "554"
      i18n.t("RTSP" + " (" + @value + ")")
    else if @value is "5060"
      i18n.t("SIP" + " (" + @value + ")")
    else if @value is "873"
      i18n.t("RSYNC" + " (" + @value + ")")
    else if @value is "1723"
      i18n.t("PPTP" + " (" + @value + ")")
    else if @value is "119"
      i18n.t("NNTP" + " (" + @value + ")")
    else if @value is "69"
      i18n.t("TFTP" + " (" + @value + ")")
    else if @value is "3544"
      i18n.t("Teredo" + " (" + @value + ")")
    else if @value is "3306"
      i18n.t("MySQL" + " (" + @value + ")")
    else if @value is "110"
      i18n.t("POP3" + " (" + @value + ")")
    else if @value is "161"
      i18n.t("SNMP" + " (" + @value + ")")
    else if @value is "139"
      i18n.t("SMB" + " (" + @value + ")")
    else if @value is "5190"
      i18n.t("AIM" + " (" + @value + ")")
    else if @value is "1080"
      i18n.t("SOCKS" + " (" + @value + ")")
    else if @value is "179"
      i18n.t("BGP" + " (" + @value + ")")
    else if @value is "67"
      i18n.t("DHCP" + " (" + @value + ")")
    else if @value is "5900"
      i18n.t("VNC" + " (" + @value + ")")
    else if @value is "5222"
      i18n.t("Jabber" + " (" + @value + ")")
    else if @value is "1863"
      i18n.t("MSNP" + " (" + @value + ")")
    else if @value is "5004"
      i18n.t("RTP" + " (" + @value + ")")
    else if @value is "5005"
      i18n.t("RTCP**" + " (" + @value + ")")
    else if @value is "2223"
      i18n.t("MSOffice Update" + " (" + @value + ")")
    else if @value is "2427"
      i18n.t("MGCP" + " (" + @value + ")")
    else if @value is "2944"
      i18n.t("MEGACO" + " (" + @value + ")")
    else if @value is "902"
      i18n.t("VMWare Server Console" + " (" + @value + ")")
    else if @value is "6881"
      i18n.t("BitTorrent" + " (" + @value + ")")
    else if @value is "20000"
      i18n.t("DNP3" + " (" + @value + ")")
    else if @value is "502"
      i18n.t("Modbus" + " (" + @value + ")")
    else if @value is "44818"
      i18n.t("Ethernet/IP" + " (" + @value + ")")
    else if @value is "389"
      i18n.t("LDAP" + " (" + @value + ")")
    else if @value is "646"
      i18n.t("LDP" + " (" + @value + ")")
    else if @value is "65534"
      i18n.t("Poison Ivy" + " (" + @value + ")")
    else if @value is "65533"
      i18n.t("Palevo" + " (" + @value + ")")
    else i18n.t(@value)
  ccname: ->
    if @value is "a1"
      i18n.t("Anonymous Proxy")
    else if @value is "a2"
      i18n.t("Satellite Provider")
    else if @value is "o1"
      i18n.t("Other Country")
    else if @value is "ad"
      i18n.t("Andorra")
    else if @value is "ae"
      i18n.t("United Arab Emirates")
    else if @value is "af"
      i18n.t("Afghanistan")
    else if @value is "ag"
      i18n.t("Antigua and Barbuda")
    else if @value is "ai"
      i18n.t("Anguilla")
    else if @value is "al"
      i18n.t("Albania")
    else if @value is "am"
      i18n.t("Armenia")
    else if @value is "ao"
      i18n.t("Angola")
    else if @value is "ap"
      i18n.t("Asia/Pacific Region")
    else if @value is "aq"
      i18n.t("Antarctica")
    else if @value is "ar"
      i18n.t("Argentina")
    else if @value is "as"
      i18n.t("American Samoa")
    else if @value is "at"
      i18n.t("Austria")
    else if @value is "au"
      i18n.t("Australia")
    else if @value is "aw"
      i18n.t("Aruba")
    else if @value is "ax"
      i18n.t("Aland Islands")
    else if @value is "az"
      i18n.t("Azerbaijan")
    else if @value is "ba"
      i18n.t("Bosnia and Herzegovina")
    else if @value is "bb"
      i18n.t("Barbados")
    else if @value is "bd"
      i18n.t("Bangladesh")
    else if @value is "be"
      i18n.t("Belgium")
    else if @value is "bf"
      i18n.t("Burkina Faso")
    else if @value is "bg"
      i18n.t("Bulgaria")
    else if @value is "bh"
      i18n.t("Bahrain")
    else if @value is "bi"
      i18n.t("Burundi")
    else if @value is "bj"
      i18n.t("Benin")
    else if @value is "bl"
      i18n.t("Saint Bartelemey")
    else if @value is "bm"
      i18n.t("Bermuda")
    else if @value is "bn"
      i18n.t("Brunei Darussalam")
    else if @value is "bo"
      i18n.t("Bolivia")
    else if @value is "bq"
      i18n.t("Bonaire, Saint Eustatius and Saba")
    else if @value is "br"
      i18n.t("Brazil")
    else if @value is "bs"
      i18n.t("Bahamas")
    else if @value is "bt"
      i18n.t("Bhutan")
    else if @value is "bv"
      i18n.t("Bouvet Island")
    else if @value is "bw"
      i18n.t("Botswana")
    else if @value is "by"
      i18n.t("Belarus")
    else if @value is "bz"
      i18n.t("Belize")
    else if @value is "ca"
      i18n.t("Canada")
    else if @value is "cc"
      i18n.t("Cocos (Keeling) Islands")
    else if @value is "cd"
      i18n.t("Congo, The Democratic Republic of the")
    else if @value is "cf"
      i18n.t("Central African Republic")
    else if @value is "cg"
      i18n.t("Congo")
    else if @value is "ch"
      i18n.t("Switzerland")
    else if @value is "ci"
      i18n.t("Cote d'Ivoire")
    else if @value is "ck"
      i18n.t("Cook Islands")
    else if @value is "cl"
      i18n.t("Chile")
    else if @value is "cm"
      i18n.t("Cameroon")
    else if @value is "cn"
      i18n.t("China")
    else if @value is "co"
      i18n.t("Colombia")
    else if @value is "cr"
      i18n.t("Costa Rica")
    else if @value is "cu"
      i18n.t("Cuba")
    else if @value is "cv"
      i18n.t("Cape Verde")
    else if @value is "cw"
      i18n.t("Curacao")
    else if @value is "cx"
      i18n.t("Christmas Island")
    else if @value is "cy"
      i18n.t("Cyprus")
    else if @value is "cz"
      i18n.t("Czech Republic")
    else if @value is "de"
      i18n.t("Germany")
    else if @value is "dj"
      i18n.t("Djibouti")
    else if @value is "dk"
      i18n.t("Denmark")
    else if @value is "dm"
      i18n.t("Dominica")
    else if @value is "do"
      i18n.t("Dominican Republic")
    else if @value is "dz"
      i18n.t("Algeria")
    else if @value is "ec"
      i18n.t("Ecuador")
    else if @value is "ee"
      i18n.t("Estonia")
    else if @value is "eg"
      i18n.t("Egypt")
    else if @value is "eh"
      i18n.t("Western Sahara")
    else if @value is "er"
      i18n.t("Eritrea")
    else if @value is "es"
      i18n.t("Spain")
    else if @value is "et"
      i18n.t("Ethiopia")
    else if @value is "eu"
      i18n.t("Europe")
    else if @value is "fi"
      i18n.t("Finland")
    else if @value is "fj"
      i18n.t("Fiji")
    else if @value is "fk"
      i18n.t("Falkland Islands (Malvinas)")
    else if @value is "fm"
      i18n.t("Micronesia, Federated States of")
    else if @value is "fo"
      i18n.t("Faroe Islands")
    else if @value is "fr"
      i18n.t("France")
    else if @value is "ga"
      i18n.t("Gabon")
    else if @value is "gb"
      i18n.t("United Kingdom")
    else if @value is "gd"
      i18n.t("Grenada")
    else if @value is "ge"
      i18n.t("Georgia")
    else if @value is "gf"
      i18n.t("French Guiana")
    else if @value is "gg"
      i18n.t("Guernsey")
    else if @value is "gh"
      i18n.t("Ghana")
    else if @value is "gi"
      i18n.t("Gibraltar")
    else if @value is "gl"
      i18n.t("Greenland")
    else if @value is "gm"
      i18n.t("Gambia")
    else if @value is "gn"
      i18n.t("Guinea")
    else if @value is "gp"
      i18n.t("Guadeloupe")
    else if @value is "gq"
      i18n.t("Equatorial Guinea")
    else if @value is "gr"
      i18n.t("Greece")
    else if @value is "gs"
      i18n.t("South Georgia and the South Sandwich Islands")
    else if @value is "gt"
      i18n.t("Guatemala")
    else if @value is "gu"
      i18n.t("Guam")
    else if @value is "gw"
      i18n.t("Guinea-Bissau")
    else if @value is "gy"
      i18n.t("Guyana")
    else if @value is "hk"
      i18n.t("Hong Kong")
    else if @value is "hm"
      i18n.t("Heard Island and McDonald Islands")
    else if @value is "hn"
      i18n.t("Honduras")
    else if @value is "hr"
      i18n.t("Croatia")
    else if @value is "ht"
      i18n.t("Haiti")
    else if @value is "hu"
      i18n.t("Hungary")
    else if @value is "id"
      i18n.t("Indonesia")
    else if @value is "ie"
      i18n.t("Ireland")
    else if @value is "il"
      i18n.t("Israel")
    else if @value is "im"
      i18n.t("Isle of Man")
    else if @value is "in"
      i18n.t("India")
    else if @value is "io"
      i18n.t("British Indian Ocean Territory")
    else if @value is "iq"
      i18n.t("Iraq")
    else if @value is "ir"
      i18n.t("Iran, Islamic Republic of")
    else if @value is "is"
      i18n.t("Iceland")
    else if @value is "it"
      i18n.t("Italy")
    else if @value is "je"
      i18n.t("Jersey")
    else if @value is "jm"
      i18n.t("Jamaica")
    else if @value is "jo"
      i18n.t("Jordan")
    else if @value is "jp"
      i18n.t("Japan")
    else if @value is "ke"
      i18n.t("Kenya")
    else if @value is "kg"
      i18n.t("Kyrgyzstan")
    else if @value is "kh"
      i18n.t("Cambodia")
    else if @value is "ki"
      i18n.t("Kiribati")
    else if @value is "km"
      i18n.t("Comoros")
    else if @value is "kn"
      i18n.t("Saint Kitts and Nevis")
    else if @value is "kp"
      i18n.t("Korea, Democratic People's Republic of")
    else if @value is "kr"
      i18n.t("Korea, Republic of")
    else if @value is "kw"
      i18n.t("Kuwait")
    else if @value is "ky"
      i18n.t("Cayman Islands")
    else if @value is "kz"
      i18n.t("Kazakhstan")
    else if @value is "la"
      i18n.t("Lao People's Democratic Republic")
    else if @value is "lb"
      i18n.t("Lebanon")
    else if @value is "lc"
      i18n.t("Saint Lucia")
    else if @value is "li"
      i18n.t("Liechtenstein")
    else if @value is "lk"
      i18n.t("Sri Lanka")
    else if @value is "lr"
      i18n.t("Liberia")
    else if @value is "ls"
      i18n.t("Lesotho")
    else if @value is "lt"
      i18n.t("Lithuania")
    else if @value is "lu"
      i18n.t("Luxembourg")
    else if @value is "lv"
      i18n.t("Latvia")
    else if @value is "ly"
      i18n.t("Libyan Arab Jamahiriya")
    else if @value is "ma"
      i18n.t("Morocco")
    else if @value is "mc"
      i18n.t("Monaco")
    else if @value is "md"
      i18n.t("Moldova, Republic of")
    else if @value is "me"
      i18n.t("Montenegro")
    else if @value is "mf"
      i18n.t("Saint Martin")
    else if @value is "mg"
      i18n.t("Madagascar")
    else if @value is "mh"
      i18n.t("Marshall Islands")
    else if @value is "mk"
      i18n.t("Macedonia")
    else if @value is "ml"
      i18n.t("Mali")
    else if @value is "mm"
      i18n.t("Myanmar")
    else if @value is "mn"
      i18n.t("Mongolia")
    else if @value is "mo"
      i18n.t("Macao")
    else if @value is "mp"
      i18n.t("Northern Mariana Islands")
    else if @value is "mq"
      i18n.t("Martinique")
    else if @value is "mr"
      i18n.t("Mauritania")
    else if @value is "ms"
      i18n.t("Montserrat")
    else if @value is "mt"
      i18n.t("Malta")
    else if @value is "mu"
      i18n.t("Mauritius")
    else if @value is "mv"
      i18n.t("Maldives")
    else if @value is "mw"
      i18n.t("Malawi")
    else if @value is "mx"
      i18n.t("Mexico")
    else if @value is "my"
      i18n.t("Malaysia")
    else if @value is "mz"
      i18n.t("Mozambique")
    else if @value is "na"
      i18n.t("Namibia")
    else if @value is "nc"
      i18n.t("New Caledonia")
    else if @value is "ne"
      i18n.t("Niger")
    else if @value is "nf"
      i18n.t("Norfolk Island")
    else if @value is "ng"
      i18n.t("Nigeria")
    else if @value is "ni"
      i18n.t("Nicaragua")
    else if @value is "nl"
      i18n.t("Netherlands")
    else if @value is "no"
      i18n.t("Norway")
    else if @value is "np"
      i18n.t("Nepal")
    else if @value is "nr"
      i18n.t("Nauru")
    else if @value is "nu"
      i18n.t("Niue")
    else if @value is "nz"
      i18n.t("New Zealand")
    else if @value is "om"
      i18n.t("Oman")
    else if @value is "pa"
      i18n.t("Panama")
    else if @value is "pe"
      i18n.t("Peru")
    else if @value is "pf"
      i18n.t("French Polynesia")
    else if @value is "pg"
      i18n.t("Papua New Guinea")
    else if @value is "ph"
      i18n.t("Philippines")
    else if @value is "pk"
      i18n.t("Pakistan")
    else if @value is "pl"
      i18n.t("Poland")
    else if @value is "pm"
      i18n.t("Saint Pierre and Miquelon")
    else if @value is "pn"
      i18n.t("Pitcairn")
    else if @value is "pr"
      i18n.t("Puerto Rico")
    else if @value is "ps"
      i18n.t("Palestinian Territory")
    else if @value is "pt"
      i18n.t("Portugal")
    else if @value is "pw"
      i18n.t("Palau")
    else if @value is "py"
      i18n.t("Paraguay")
    else if @value is "qa"
      i18n.t("Qatar")
    else if @value is "re"
      i18n.t("Reunion")
    else if @value is "ro"
      i18n.t("Romania")
    else if @value is "rs"
      i18n.t("Serbia")
    else if @value is "ru"
      i18n.t("Russian Federation")
    else if @value is "rw"
      i18n.t("Rwanda")
    else if @value is "sa"
      i18n.t("Saudi Arabia")
    else if @value is "sb"
      i18n.t("Solomon Islands")
    else if @value is "sc"
      i18n.t("Seychelles")
    else if @value is "sd"
      i18n.t("Sudan")
    else if @value is "se"
      i18n.t("Sweden")
    else if @value is "sg"
      i18n.t("Singapore")
    else if @value is "sh"
      i18n.t("Saint Helena")
    else if @value is "si"
      i18n.t("Slovenia")
    else if @value is "sj"
      i18n.t("Svalbard and Jan Mayen")
    else if @value is "sk"
      i18n.t("Slovakia")
    else if @value is "sl"
      i18n.t("Sierra Leone")
    else if @value is "sm"
      i18n.t("San Marino")
    else if @value is "sn"
      i18n.t("Senegal")
    else if @value is "so"
      i18n.t("Somalia")
    else if @value is "sr"
      i18n.t("Suriname")
    else if @value is "ss"
      i18n.t("South Sudan")
    else if @value is "st"
      i18n.t("Sao Tome and Principe")
    else if @value is "sv"
      i18n.t("El Salvador")
    else if @value is "sx"
      i18n.t("Sint Maarten")
    else if @value is "sy"
      i18n.t("Syrian Arab Republic")
    else if @value is "sz"
      i18n.t("Swaziland")
    else if @value is "tc"
      i18n.t("Turks and Caicos Islands")
    else if @value is "td"
      i18n.t("Chad")
    else if @value is "tf"
      i18n.t("French Southern Territories")
    else if @value is "tg"
      i18n.t("Togo")
    else if @value is "th"
      i18n.t("Thailand")
    else if @value is "tj"
      i18n.t("Tajikistan")
    else if @value is "tk"
      i18n.t("Tokelau")
    else if @value is "tl"
      i18n.t("Timor-Leste")
    else if @value is "tm"
      i18n.t("Turkmenistan")
    else if @value is "tn"
      i18n.t("Tunisia")
    else if @value is "to"
      i18n.t("Tonga")
    else if @value is "tr"
      i18n.t("Turkey")
    else if @value is "tt"
      i18n.t("Trinidad and Tobago")
    else if @value is "tv"
      i18n.t("Tuvalu")
    else if @value is "tw"
      i18n.t("Taiwan")
    else if @value is "tz"
      i18n.t("Tanzania, United Republic of")
    else if @value is "ua"
      i18n.t("Ukraine")
    else if @value is "ug"
      i18n.t("Uganda")
    else if @value is "um"
      i18n.t("United States Minor Outlying Islands")
    else if @value is "us"
      i18n.t("United States")
    else if @value is "uy"
      i18n.t("Uruguay")
    else if @value is "uz"
      i18n.t("Uzbekistan")
    else if @value is "va"
      i18n.t("Holy See (Vatican City State)")
    else if @value is "vc"
      i18n.t("Saint Vincent and the Grenadines")
    else if @value is "ve"
      i18n.t("Venezuela")
    else if @value is "vg"
      i18n.t("Virgin Islands, British")
    else if @value is "vi"
      i18n.t("Virgin Islands, U.S.")
    else if @value is "vn"
      i18n.t("Vietnam")
    else if @value is "vu"
      i18n.t("Vanuatu")
    else if @value is "wf"
      i18n.t("Wallis and Futuna")
    else if @value is "ws"
      i18n.t("Samoa")
    else if @value is "ye"
      i18n.t("Yemen")
    else if @value is "yt"
      i18n.t("Mayotte")
    else if @value is "za"
      i18n.t("South Africa")
    else if @value is "zm"
      i18n.t("Zambia")
    else if @value is "zw"
      i18n.t("Zimbabwe")
    else i18n.t(@value)
  bytecalc: ->
    if @value > 1000 and @value < 1000000
      num1 = @value / 1000
      num2 = num1.toFixed(2)
      i18n.t(num2 + " kB")
    else if @value  > 1000000 and @value < 1000000000
      num1 = @value / 1000000
      num2 = num1.toFixed(2)
      i18n.t(num2 + " MB")
    else if @value  > 1000000000 and @value < 1000000000000
      num1 = @value / 1000000000
      num2 = num1.toFixed(2)
      i18n.t(num2 + " GB")
    else if @value  > 1000000000000 and @value < 1000000000000000
      num1 = @value / 1000000000000
      num2 = num1.toFixed(2)
      i18n.t(num2 + " TB")
    else if @value  > 1000000000000000 and @value < 1000000000000000000
      num1 = @value / 1000000000000000
      num2 = num1.toFixed(2)
      i18n.t(num2 + " PB")
    else if @value  > 1000000000000000000 and @value < 1000000000000000000000
      num1 = @value / 1000000000000000000
      num2 = num1.toFixed(2)
      i18n.t(num2 + " EB")
    else if @value  > 1000000000000000000000 and @value < 1000000000000000000000000
      num1 = @value / 1000000000000000000000
      num2 = num1.toFixed(2)
      i18n.t(num2 + " ZB")
    else if @value  > 1000000000000000000000000 and @value < 1000000000000000000000000000
      num1 = @value / 1000000000000000000000000
      num2 = num1.toFixed(2)
      i18n.t(num2 + " YB")
    else i18n.t(@value + " B")
Template.table.rendered = ->
  _id = @data._id
  if @data.output is "rwcut"
    @$('.results-table').dragtable(
      dataHeader: "data-field"
      stop: (event, draginfo) ->
        query = share.Queries.findOne(_id)
        field = draginfo.order[draginfo.endIndex]
        fieldsOrder = _.without(query.fieldsOrder, field)
        if draginfo.endIndex
          pivotField = draginfo.order[draginfo.endIndex - 1]
          pivotFieldIndex = fieldsOrder.indexOf(pivotField)
          fieldsOrder.splice(pivotFieldIndex + 1, 0, field)
        else
          fieldsOrder.splice(0, 0, field)
        if _.isEqual(fieldsOrder, query.fieldsOrder)
          share.changeQuerySorting(query, field)
        else
          share.Queries.update(query._id, {$set: {fieldsOrder: fieldsOrder}})
    )

Template.table.events
  "click th": encapsulate (event, template) ->
    if template.data.output isnt "rwcount"
      return # rwcut has its own code in rendered
    $target = $(event.currentTarget)
    field = $target.attr("data-field")
    share.changeQuerySorting(template.data, field)

share.changeQuerySorting = (query, field) ->
  sortReverse = query.sortReverse
  if field is query.sortField
    if query.sortReverse
      sortReverse = false
    else
      field = ""
      sortReverse = true
  share.Queries.update(query._id, {$set: {sortField: field, sortReverse: sortReverse}})
