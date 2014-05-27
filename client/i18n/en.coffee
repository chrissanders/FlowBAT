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
    invite:
      setPassword: "Set your password to begin using the application:"
    profile:
      header: "Profile settings"
      name: "Name"
      namePlaceholder: "Name and surname"
      password: "Password"
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
      mode: "Mode"
      wrongVerificationCode: "Verification code doesn\'t match."
      messages:
        name:
          required: "Please specify your name"
        phone:
          phone: "Please specify full phone number (with country code)"
    meeting:
      namePlaceholder: "Meeting name"
      nameIsEmpty: "Type meeting name here"
      owner: "Meeting creator"
      createdAt: "Meeting added at"
      updatedAt: "Meeting edited at"
      actions:
        insert: "Add meeting"
        update: "Edit meeting"
        save: "Save meeting"
        remove: "Delete meeting"
        removeConfirmation: "Deleting a meeting will wipe it completely. If you just want to hide it, you can click \"archive\" (next to \"delete\"). Are you sure you want to delete this meeting?"
    sak:
      namePlaceholder: "Case name"
      nameIsEmpty: "Type case name here"
      numberPlaceholder: "NN/YY"
      numberIsEmpty: "NN/YY"
      maximumDurationPlaceholder: ""
      talkDurationPlaceholder: ""
      replyDurationPlaceholder: ""
      answerDurationPlaceholder: ""
      owner: "Case creator"
      createdAt: "Case added at"
      updatedAt: "Case edited at"
      actions:
        insert: "Add case"
        update: "Edit case"
        save: "Save case"
        remove: "Delete case"
        removeConfirmation: "Deleting a case will wipe it completely. Are you sure you want to delete this case?"
    talk:
      owner: "Talk creator"
      createdAt: "Talk added at"
      updatedAt: "Talk edited at"
      actions:
        insert: "Add talk"
        update: "Edit talk"
        save: "Save talk"
        remove: "Delete talk"
        removeConfirmation: "Deleting a talk will wipe it completely. Are you sure you want to delete this talk?"
    reply:
      owner: "Reply creator"
      createdAt: "Reply added at"
      updatedAt: "Reply edited at"
      actions:
        insert: "Add reply"
        update: "Edit reply"
        save: "Save reply"
        remove: "Delete reply"
        removeConfirmation: "Deleting a reply will wipe it completely. Are you sure you want to delete this reply?"
  defaults:
    meeting:
      name: "New meeting"
    sak:
      name: "New case"
    talk: {}
    reply: {}
)
