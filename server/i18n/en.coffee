i18n.addResourceBundle "en",
  name: "English"
  dateFormat: "MMMM D, YYYY, h:mm A"
  messages:
    resetPassword:
      subject: 'Reset your password on flowbat.com"'
      html: '
        <div>Hey {{user.profile.name}},</div>
        <div style="margin: 7px 0 0 0;">To reset your password, simply click the link below. Thanks.</div>
        <div style="margin: 7px 0 0 0;"><a href="{{url}}">{{url}}</a></div>
      '
