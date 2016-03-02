i18n.addResourceBundle("en",
  name: "English"
  forms:
    login:
      email: "Email"
      password: "Password"
      passwordAgain: "Password again"
      forgotPassword: "Forgot password?"
      signup: "Let's go!"
      login: "Login"
      isLoggingIn: "Logging in..."
      messages:
        email:
          required: "Please specify your email"
          email: "Doesn't seem to be valid email"
        password:
          required: "Please specify your password"
          minlength: "Password should have at least 4&nbsp;characters"
        passwordAgain:
          required: "Please repeat your password"
          equalTo: "The passwords should match"
      passwordForgot:
        link: "Forgot password"
        alert:
          name: "Reset password"
          emailPlaceholder: "Your email"
          reset: "Reset"
          errors:
            userNotFound: "Account with that email does not exists."
      passwordReset:
        alert:
          name: "Reset password"
          passwordPlaceholder: "New password"
          reset: "Reset"
          errors:
            tokenNotFound: "Request is expired, try again."
    invite:
      setPassword: "Set your password to begin using the application:"
    profile:
      header: "Profile settings"
      email: "Email address"
      emailPlaceholder: "Email address"
      name: "Name and surname"
      namePlaceholder: "Name and surname"
      password: "Password"
      passwordPlaceholder: "Password"
      passwordChange:
        link: "Change password"
        alert:
          name: "Change password"
          oldPasswordPlaceholder: "Old password"
          newPasswordPlaceholder: "New password"
          change: "Change"
          errors:
            incorrectPassword: "Please specify correct old password"
      phone: "Phone for SMS reminders"
      phonePlaceholder: "With country code; e.g. +1 260 123 45 67"
      phoneVerifyToReceiveSmsReminders: "Verify your number to receive SMS reminders."
      phoneIsVerified: "This phone number is verified."
      phoneSendVerificationCode: "Send verification code"
      youCanResendVerificationCodeInSomeMinutes: "You may request another verification code in {{minutes}} minutes."
      phoneVerificationCodePlaceholder: "Verification code"
      phoneVerification: "Verification of {{phone}}"
      phoneVerify: "Verify"
      language: "Language"
      image: "Avatar"
      group: "Group"
      mode: "Mode"
      wrongVerificationCode: "Verification code doesn\'t match."
      messages:
        email:
          required: "Email is required."
          email: "Please enter a valid email address."
          uniqueEmail: "Email already exists."
        name:
          required: "Name is required."
        password:
          required: "Password is required."
        group:
          required: "Group is required."
        inserted: "User added successfully."
        saved: "User updated successfully."
  serverErrors:
    "User not found": "User not found"
    "Email already exists": "Email already exists"
    "Incorrect password": "Incorrect password"
    "User has no password set": "Please, follow the link from the invitation email and set a new password"
    "Token expired": "Invitation link has expired"
  interface:
    create: "Create"
    insert: "Add"
    update: "Edit"
    remove: "Delete"
    save: "Save"
    cancel: "Cancel"
    changesAreSavedAutomatically: "All changes are saved automatically."
  rwcut:
    fields:
      "sIP": "Source IP"
      "dIP": "Destination IP"
      "aIP": "Any IP" # proxy
      "sPort": "Source port"
      "dPort": "Destination port"
      "aPort": "Any port" # proxy
      "protocol": "IP protocol"
      "pro": "$t(rwcut.fields.protocol)"
      "packets": "Packet count"
      "bytes": "Byte count"
      "flags": "TCP flags"
      "sTime": "Starting time"
      "duration": "Duration"
      "dur": "$t(rwcut.fields.duration)"
      "eTime": "End time"
      "sensor": "Sensor"
      "sen": "$t(rwcut.fields.sensor)"
      "class": "Sensor class"
      "scc": "Source country"
      "dcc": "Destination country"
      "initialFlags": "Initial flags"
      "sessionFlags": "Session flags"
      "application": "Application"
      "type": "Flow type"
      "sTime+msec": "starting time of flow including milliseconds (milliseconds are always displayed)"
      "eTime+msec": "end time of flow including milliseconds (milliseconds are always displayed)"
      "dur+msec": "duration of flow including milliseconds (milliseconds are always displayed)"
      "iType": "ICMP type"
      "iCode": "ICMP code"
      "icmpTypeCode": "ICMP type & code"
      # rwstats values
      "Records": "Records"
      "Packets": "Packets"
      "Bytes": "Bytes"
      "cumul_%": "% Cumulative"
      "Date": "Bin date and time"
  field:
    definitions:
      "sIP": "Source IP address. These can be specified during input as IP addresses or CIDR notation."
      "dIP": "Destination IP address. These can be specified during input as IP addresses or CIDR notation."
      "aIP": "Matches source or destination IP address. These can be specified during input as IP addresses or CIDR notation." # proxy
      "sPort": "Source ports can be specified during input as individual ports or hypenated ranges (IE: 0-1024)"
      "dPort": "Destination ports can be specified during input as individual ports or hypenated ranges (IE: 0-1024)"
      "aPort": "This will match against records with a source or destination port matching this value or range (IE: 0-1024)." # proxy
      "protocol": "Pass the record if its IP Suite Protocol is in this INTEGER_LIST, possible values are 0-255."
      "pro": "$t(rwcut.fields.protocol)"
      "packets": "Pass the record if its packet count is in this INTEGER_RANGE or value."
      "bytes": "Pass the record if its average bytes per packet count (bytes/packet) is in this DECIMAL_RANGE."
      "flags": "Pass the record if any of the HIGH_SET/MASK_SET pairs is true when looking at the bitwise OR of the TCP flags across all packets in the flow."
      "sTime": "Starting time of flow (seconds resolution)."
      "duration": "Duration of flow (seconds resolution)."
      "dur": "$t(rwcut.fields.duration)"
      "eTime": "End time of the flow (seconds resolution)."
      "sensor": "Name or ID of the sensor where the flow was collected."
      "sen": "$t(rwcut.fields.sensor)"
      "class": "Binning by class and/or type equates to binning by the integer value used internally to represent the class/type pair. See the rwflowpack configuration."
      "scc": "This is filtering or grouping by source country code. The source country code refers to the country code associated with the source address per flow record."
      "dcc": "This is filtering or grouping by destination country code. The destination country code refers to the country code associated with the destination address per flow record."
      "initialFlags": "Pass the record if the initial HIGH_SET/MASK_SET pairs is true when looking at the bitwise OR of the TCP flags across the FIRST packet in the flow."
      "sessionFlags": "Pass the record if any of the HIGH_SET/MASK_SET pairs is true when looking at the bitwise OR of the TCP flags across all packets in the flow, excluding the first."
      "application": "The application value is the port number that is traditionally used for that type of traffic but is based on packet inspection by the generator. If the application cannot be determined, a 0 is used. Not all flow generators will inspect data to this level."
      "type": "Flow type. Types are defined in silk.conf, they typically refer to the direction of the flow. Examples include; int2"
      "sTime+msec": "starting time of flow including milliseconds (milliseconds are always displayed)"
      "eTime+msec": "end time of flow including milliseconds (milliseconds are always displayed)"
      "dur+msec": "duration of flow including milliseconds (milliseconds are always displayed)"
      "iType": "Pass the record if its ICMP (or ICMPv6) type is in this INTEGER_LIST; possible values 0-255."
      "iCode": "Pass the record if its ICMP (or ICMPv6) code is in this INTEGER_LIST; possible values 0-255."
      "icmpTypeCode": "ICMP type & code."
      # rwstats values
      "Records": "In rwstats, count the number of flow records that mapped to each bin."
      "Packets": "In rwstats, sum the number of packets across all records that mapped to each bin."
      "Bytes": "In rwstats, sum the number of bytes across all records that mapped to each bin."
      "cumul_%": "Cumulative-percentage"
      "Date": "Bin date and time"
  users:
    fields:
      username: "Username"
      email: "Email"
      name: "Name"
      group: "Group"
      actions: "Actions"
    removeAlert:
      name: "Delete user"
      description: "Are you sure you want to delete user?"
      remove: "Delete"
  groups:
    admin: "Admin"
    analyst: "Analyst"
)
