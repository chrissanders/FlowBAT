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
      email: "Email"
      emailPlaceholder: "Email address"
      name: "Name"
      namePlaceholder: "Name and surname"
      party: "Political party"
      partyPlaceholder: ""
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
      "sPort": "Source port"
      "dPort": "Destination port"
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
      "type": "Sensor type"
      "sTime+msec": "starting time of flow including milliseconds (milliseconds are always displayed)"
      "eTime+msec": "end time of flow including milliseconds (milliseconds are always displayed)"
      "dur+msec": "duration of flow including milliseconds (milliseconds are always displayed)"
      "iType": "ICMP type"
      "iCode": "ICMP code"
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
    user: "User"
)
