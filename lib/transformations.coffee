# not used by default
class share.User
  constructor: (doc) ->
    _.extend(@, doc)
    @email = @emails?[0]?.address
    @name = @profile.name
    @firstName = @name.split(' ').slice(0, 1).join(' ')
    @lastName = @name.split(' ').slice(1).join(' ')

class share.Config
  constructor: (doc) ->
    _.extend(@, doc)
  wrapCommand: (command) ->
    "ssh " + @getSSHOptions() + " -p " + @port +  " " + @user + "@" + @host + " \"" + command + "\""
  getSSHOptions: ->
    "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=error -i " + @getIdentityFile()
  getIdentityFile: ->
    if @identityFile then @identityFile else process.env.PWD + "/settings/identity"

class share.Query
  constructor: (doc) ->
    _.extend(@, doc)
    @header = []
    @rows = []
    if @result
      parsedResult = share.parseResult(@result)
      if @output is "rwstats"
        parsedResult.shift()
        parsedResult.shift()
        # shift-shift outta here, you redundant rows
      if @output is "rwcount"
        parsedResult.unshift(share.rwcountFields)
      rawHeader = parsedResult.shift()
      for name in rawHeader
        spec =
          _id: name
          name: name.trim()
          isDistinct: false
          isPercentage: false
        if spec.name.indexOf("%") is 0
          spec.isPercentage = true
          spec.name = spec.name.substr(1)
        distinctRegex = /-D.*$/i
        if spec.name.match(distinctRegex)
          spec.isDistinct = true
          spec.name = spec.name.replace(distinctRegex, "")
        @header.push(spec)
      for parsedRow in parsedResult
        row = []
        for parsedValue, index in parsedRow
          row.push({_id: @header[index]._id, value: parsedValue, queryId: @_id})
        @rows.push(row)
  displayName: ->
    if @isQuick then "Quick query #" + @_id else @name or "#" + @_id
  inputCommand: (config) ->
    command = "rwfilter"
    command += " " + @inputOptions()
    if config and config.siteConfigFile
      command += " --site-config-file=" + config.siteConfigFile
    if config and config.dataRootdir
      command += " --data-rootdir=" + config.dataRootdir
    command += " --pass=stdout"
    for exclusion in @inputExclusions()
      command += " | rwfilter --input-pipe=stdin"
      command += " " + exclusion
      if config and config.siteConfigFile
        command += " --site-config-file=" + config.siteConfigFile
      # config.dataRootdir shouldn't be used with exclusions
      command += " --fail=stdout"
    command += " > /tmp/" + @_id + ".rwf"
    if config and config.isSSH
      command = config.wrapCommand(command)
    command
  inputOptions: ->
    if @interface is "builder"
      parameters = []
      if @typesEnabled and @types.length and _.difference(share.queryTypes, @types).length
        value = @types.join(",")
      else
        value = "all"
      parameters.push("--type=" + value)
      if @startDateEnabled and @startDate
        parameters.push("--start-date=" + @startDate)
      if @endDateEnabled and @endDate
        parameters.push("--end-date=" + @endDate)
      if @sensorEnabled and @sensor
        parameters.push("--sensor=" + @sensor)
      if @daddressEnabled and @daddress
        parameters.push("--daddress=" + @daddress)
      if @saddressEnabled and @saddress
        parameters.push("--saddress=" + @saddress)
      if @anyAddressEnabled and @anyAddress
        parameters.push("--any-address=" + @anyAddress)
      if @dipSetEnabled and @dipSet
        parameters.push("--dipset=/tmp/" + @dipSet + ".rws")
      if @sipSetEnabled and @sipSet
        parameters.push("--sipset=/tmp/" + @sipSet + ".rws")
      if @anySetEnabled and @anySet
        parameters.push("--anyset=/tmp/" + @anySet + ".rws")
      if @dportEnabled and @dport
        parameters.push("--dport=" + @dport)
      if @sportEnabled and @sport
        parameters.push("--sport=" + @sport)
      if @aportEnabled and @aport
        parameters.push("--aport=" + @aport)
      if @dccEnabled and @dcc.length
        parameters.push("--dcc=" + @dcc.join(","))
      if @sccEnabled and @scc.length
        parameters.push("--scc=" + @scc.join(","))
      if @protocolEnabled and @protocol
        parameters.push("--protocol=" + @protocol)
      if @flagsAllEnabled and @flagsAll
        parameters.push("--flags-all=" + @flagsAll)
      if @activeTimeEnabled and @activeTime
        parameters.push("--active-time=" + @activeTime)
      if @additionalParametersEnabled and @additionalParameters
        parameters.push(@additionalParameters)
      string = parameters.join(" ")
    else
      string = @cmd
    share.filterOptions(string)
  inputExclusions: ->
    exclusionsCmd = ""
    if @interface is "builder"
      if @additionalExclusionsCmdEnabled
        exclusionsCmd = @additionalExclusionsCmd
    else
      exclusionsCmd = @exclusionsCmd
    exclusionsCmd = share.filterOptions(exclusionsCmd)
    _.compact(exclusionsCmd.split(/\s+(?:OR|\|\|)\s+/i))
  outputCommand: (config, profile) ->
    switch @output
      when "rwcut"
        @outputRwcutCommand(config, profile)
      when "rwstats"
        @outputRwstatsCommand(config, profile)
      when "rwcount"
        @outputRwcountCommand(config, profile)
  outputRwcutCommand: (config, profile) ->
    commands = []
    if @sortField
      rwsortOptions = ["--fields=" + @sortField]
      if @sortReverse
        rwsortOptions.push("--reverse")
      if config and config.siteConfigFile
        rwsortOptions.push("--site-config-file=" + config.siteConfigFile)
      rwsortOptionsString = rwsortOptions.join(" ")
      rwsortOptionsString = share.filterOptions(rwsortOptionsString)
      commands.push("rwsort " + rwsortOptionsString)
    rwcutOptions = ["--num-recs=" + profile.numRecs, "--start-rec-num=" + @startRecNum, "--delimited"]
    if @fields.length
      rwcutOptions.push("--fields=" + _.intersection(@fieldsOrder, @fields).join(","))
    if config and config.siteConfigFile
      rwcutOptions.push("--site-config-file=" + config.siteConfigFile)
    rwcutOptionsString = rwcutOptions.join(" ")
    rwcutOptionsString = share.filterOptions(rwcutOptionsString)
    commands.push("rwcut " + rwcutOptionsString)
    commands[0] += " /tmp/" + @_id + ".rwf"
    command = commands.join(" | ")
    if config and config.isSSH
      command = config.wrapCommand(command)
    command
  outputRwstatsCommand: (config, profile) ->
    defaultRwstatsOptions = ["--delimited"]
    if @interface is "builder"
      rwstatsOptions = defaultRwstatsOptions
      if @rwstatsFields.length
        rwstatsOptions.push("--fields=" + _.intersection(@rwstatsFieldsOrder, @rwstatsFields).join(","))
      rwstatsValues = @rwstatsValues.slice(0)
      rwstatsValuesOrder = @rwstatsValuesOrder.slice(0)
      if @rwstatsPrimaryValue
        rwstatsValues.unshift(@rwstatsPrimaryValue)
        rwstatsValuesOrder.unshift(@rwstatsPrimaryValue)
      if rwstatsValues.length
        values = _.intersection(rwstatsValuesOrder, rwstatsValues)
        for value, index in values
          if value not in share.rwstatsValues
            values[index] = "distinct:" + value
        rwstatsOptions.push("--values=" + values.join(","))
        if values[0] not in share.rwstatsValues
          rwstatsOptions.push("--no-percents")
      rwstatsOptions.push("--" + @rwstatsDirection)
      switch @rwstatsMode
        when "count"
          rwstatsOptions.push("--count=" + @rwstatsCountModeValue)
        when "threshold"
          rwstatsOptions.push("--threshold=" + @rwstatsThresholdModeValue)
        when "percentage"
          rwstatsOptions.push("--percentage=" + @rwstatsPercentageModeValue)
      if @rwstatsBinTimeEnabled
        if @rwstatsBinTime
          rwstatsOptions.push("--bin-time=" + @rwstatsBinTime)
        else
          rwstatsOptions.push("--bin-time")
      if config and config.siteConfigFile
        rwstatsOptions.push("--site-config-file=" + config.siteConfigFile)
      rwstatsOptionsString = rwstatsOptions.join(" ")
    else
      rwstatsOptionsString = @rwstatsCmd + " " + defaultRwstatsOptions.join(" ")
      rwstatsOptionsString = share.filterOptions(rwstatsOptionsString)
    command = "rwstats " + rwstatsOptionsString + " /tmp/" + @_id + ".rwf"
    if config and config.isSSH
      command = config.wrapCommand(command)
    command
  outputRwcountCommand: (config, profile) ->
    defaultRwcountOptions = ["--delimited", "--no-titles"] # --no-titles is necessary, because header is added later
    if @interface is "builder"
      rwcountOptions = defaultRwcountOptions
      if @rwcountBinSizeEnabled
        rwcountOptions.push("--bin-size=" + @rwcountBinSize)
      if @rwcountLoadSchemeEnabled
        rwcountOptions.push("--load-scheme=" + @rwcountLoadScheme)
      if @rwcountSkipZeroes
        rwcountOptions.push("--skip-zeroes")
      if config and config.siteConfigFile
        rwcountOptions.push("--site-config-file=" + config.siteConfigFile)
      rwcountOptionsString = rwcountOptions.join(" ")
    else
      rwcountOptionsString = @rwcountCmd + " " + defaultRwcountOptions.join(" ")
    rwcountOptionsString = share.filterOptions(rwcountOptionsString)
    command = "rwcount " + rwcountOptionsString + " /tmp/" + @_id + ".rwf"
    if @sortField
      fieldIndex = share.rwcountFields.indexOf(@sortField)
      sortOptions = "--field-separator=\\\| --key=+" + (fieldIndex + 1) + "n" + (if @sortReverse then "r" else "")
      sortOptions = share.filterOptions(sortOptions, "\\\\\\|\\+")
      sortCommand = "sort " + sortOptions
      command += " | " + sortCommand
    if profile.numRecs
      headOptions = "--lines=" + (@startRecNum + profile.numRecs - 1)
      headOptions = share.filterOptions(headOptions)
      headCommand = "head " + headOptions
      tailOptions = "--lines=" + profile.numRecs
      tailOptions = share.filterOptions(tailOptions)
      tailCommand = "tail " + tailOptions
      command += " | " + headCommand + " | " + tailCommand
    if config and config.isSSH
      command = config.wrapCommand(command)
    command
  rwstatsCountModeValueIsEnabled: (mode) ->
    @rwstatsMode is "count"
  rwstatsThresholdModeValueIsEnabled: ->
    @rwstatsMode is "threshold"
  rwstatsPercentageModeValueIsEnabled: ->
    @rwstatsMode is "percentage"
  path: ->
    "/query/" + @_id

class share.IPSet
  constructor: (doc) ->
    _.extend(@, doc)
  displayName: ->
    @name or "#" + @_id
  objectSelectName: ->
    @displayName()
  objectSelectValue: ->
    @_id
  path: ->
    "/ipset/" + @_id

share.Transformations =
  user: (user) ->
    if user instanceof share.User or not user then user else new share.User(user)
  config: (config) ->
    if config instanceof share.Config or not config then config else new share.Config(config)
  query: (query) ->
    if query instanceof share.Query or not query then query else new share.Query(query)
  ipset: (ipset) ->
    if ipset instanceof share.IPSet or not ipset then ipset else new share.IPSet(ipset)
