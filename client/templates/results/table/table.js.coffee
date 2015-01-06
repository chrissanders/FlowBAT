Template.table.helpers
  isPivotable: (output) ->
    output is "rwcut"
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
