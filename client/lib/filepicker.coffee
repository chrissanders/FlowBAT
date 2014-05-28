share.MeetingFilepicker = {
  showUpload: (callback) ->
    if filepicker
      filepicker.setKey("AsD6uwhWBROacXlusmNVtz")
      filepicker.pickAndStore({
        maxSize: 25*1024*1024,
        services: [
          'COMPUTER',
          'WEBCAM',
          'URL',
          'DROPBOX',
          'GOOGLE_DRIVE',
          'GMAIL',
          'FACEBOOK',
          'INSTAGRAM',
          'FLICKR',
          'PICASA',
          'EVERNOTE',
          'BOX',
          'SKYDRIVE',
          'FTP',
          'WEBDAV',
          'GITHUB'
        ],
        openTo: 'COMPUTER',
      },{
        path: '/meeting/'
      },
      callback,
      (FPError) ->
        if FPError.code == 101
          return
        console.log(FPError.toString())
      )
    else
      setTimeout ->
        share.MeetingFilepicker.showUpload(callback)
      , 500
  showUploadImage: (callback) ->
    if filepicker
      filepicker.setKey("AsD6uwhWBROacXlusmNVtz")
      filepicker.pickAndStore({
        maxSize: 25*1024*1024,
        services: [
          'COMPUTER',
          'WEBCAM',
          'URL',
          'DROPBOX',
          'GOOGLE_DRIVE',
          'GMAIL',
          'FACEBOOK',
          'INSTAGRAM',
          'FLICKR',
          'PICASA',
          'EVERNOTE',
          'BOX',
          'SKYDRIVE',
          'FTP',
          'WEBDAV',
          'GITHUB'
        ],
        openTo: 'COMPUTER',
        multiple: false
      },{
        path: '/meeting/'
      },
      callback,
      (FPError) ->
        if FPError.code == 101
          return
        console.log(FPError.toString())
      )
    else
      setTimeout ->
        share.MeetingFilepicker.showUploadImage(callback)
      , 500
}
