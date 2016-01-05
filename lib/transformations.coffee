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
        if spec.isDistinct
          spec.chartType = "number"
        else
          spec.chartType = share.chartFieldTypes[spec.name] or "string"
        @header.push(spec)
      if @presentation is "chart"
        for parsedRow in parsedResult
          row = []
          for parsedValue, index in parsedRow
            spec = @header[index]
            if @output is "rwcount" and spec.name not in @rwcountFields
              continue
            switch spec.chartType
              when "number"
                parsedValue = parseFloat(parsedValue)
              when "date", "datetime"
                m = moment.utc(parsedValue, "YYYY/MM/DDTHH:mm:ss.SSS")
                parsedValue = m.toDate()
            row.push(parsedValue)
          @rows.push(row)
      else
        for parsedRow in parsedResult
          row = []
          for parsedValue, index in parsedRow
            spec = @header[index]
            row.push({_id: spec._id, value: parsedValue, queryId: @_id})
          @rows.push(row)
      filteredHeader = []
      for spec in @header
        filteredHeader.push(spec)
      @header = filteredHeader
  displayName: ->
    if @isQuick then "Quick query #" + @_id else @name or "#" + @_id
  inputCommand: (config, profile, isPresentation = false) ->
    command = "rwfilter"
    command += " " + @inputOptions(config)
    if config.siteConfigFile
      command += " --site-config-file=" + config.siteConfigFile
    if config.dataRootdir
      command += " --data-rootdir=" + config.dataRootdir
    command += " --pass=stdout"
    for exclusion in @inputExclusions()
      command += " | rwfilter --input-pipe=stdin"
      command += " " + exclusion
      if config.siteConfigFile
        command += " --site-config-file=" + config.siteConfigFile
      # config.dataRootdir shouldn't be used with exclusions
      command += " --fail=stdout"
    command += " > " + (config.dataTempdir or "/tmp") + "/" + @_id + ".rwf"
    if config.isSSH and not isPresentation
      command = config.wrapCommand(command)
    command
  inputOptions: (config) ->
    if @interface is "builder"
      parameters = []
      if @typesEnabled and @types.length and _.difference(share.queryTypes, @types).length
        value = @types.join(",")
      else
        value = "all"
      parameters.push("--type=" + value)
      if @startDateType is "interval"
        if @startDateEnabled and @startDate
          parameters.push("--start-date=" + @startDate)
        if @endDateEnabled and @endDate
          parameters.push("--end-date=" + @endDate)
        if @activeTimeEnabled and @activeTime
          parameters.push("--active-time=" + @activeTime)
      else
        if @startDateOffsetEnabled and @startDateOffset
          startDateOffsetNumber = share.intval(@startDateOffset)
          eTimeMoment = moment.utc()
          sTimeMoment = eTimeMoment.clone().subtract(startDateOffsetNumber, 'minutes')
          parameters.push("--start-date=" + sTimeMoment.format("YYYY/MM/DD:HH"))
          parameters.push("--end-date=" + eTimeMoment.format("YYYY/MM/DD:HH"))
          parameters.push("--active-time=" + sTimeMoment.format("YYYY/MM/DDTHH:mm:ss.SSS") + "-" + eTimeMoment.format("YYYY/MM/DDTHH:mm:ss.SSS"))
      if @sensorEnabled and @sensor
        parameters.push("--sensor=" + @sensor)
      if @daddressEnabled and @daddress
        parameters.push("--daddress=" + @daddress)
      if @saddressEnabled and @saddress
        parameters.push("--saddress=" + @saddress)
      if @anyAddressEnabled and @anyAddress
        parameters.push("--any-address=" + @anyAddress)
      if @dipSetEnabled and @dipSet
        parameters.push("--dipset=" + (config.dataTempdir or "/tmp") + "/" + @dipSet + ".rws")
      if @sipSetEnabled and @sipSet
        parameters.push("--sipset=" + (config.dataTempdir or "/tmp") + "/" + @sipSet + ".rws")
      if @anySetEnabled and @anySet
        parameters.push("--anyset=" + (config.dataTempdir or "/tmp") + "/" + @anySet + ".rws")
      if @tupleFileEnabled and @tupleFile
        parameters.push("--tuple-file=" + (config.dataTempdir or "/tmp") + "/" + @tupleFile + ".tuple")
      if @tupleDirectionEnabled and @tupleDirection
        parameters.push("--tuple-direction=" + @tupleDirection)
      if @tupleDelimiterEnabled and @tupleDelimiter
        parameters.push("--tuple-delimiter=" + @tupleDelimiter)
      if @tupleFieldsEnabled and @tupleFields
        parameters.push("--tuple-fields=" + @tupleFields)
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
  outputCommand: (config, profile, isPresentation = false) ->
    switch @output
      when "rwcut"
        @outputRwcutCommand(config, profile, isPresentation)
      when "rwstats"
        @outputRwstatsCommand(config, profile, isPresentation)
      when "rwcount"
        @outputRwcountCommand(config, profile, isPresentation)
  outputRwcutCommand: (config, profile, isPresentation = false) ->
    commands = []
    if @sortField
      rwsortOptions = ["--fields=" + @sortField]
      if @sortReverse
        rwsortOptions.push("--reverse")
      if config.siteConfigFile
        rwsortOptions.push("--site-config-file=" + config.siteConfigFile)
      rwsortOptionsString = rwsortOptions.join(" ")
      rwsortOptionsString = share.filterOptions(rwsortOptionsString)
      commands.push("rwsort " + rwsortOptionsString)
    rwcutOptions = ["--num-recs=" + profile.numRecs, "--start-rec-num=" + @startRecNum, "--delimited"]
    if @fields.length
      rwcutOptions.push("--fields=" + _.intersection(@fieldsOrder, @fields).join(","))
    if config.siteConfigFile
      rwcutOptions.push("--site-config-file=" + config.siteConfigFile)
    rwcutOptionsString = rwcutOptions.join(" ")
    rwcutOptionsString = share.filterOptions(rwcutOptionsString)
    commands.push("rwcut " + rwcutOptionsString)
    commands[0] += " " + (config.dataTempdir or "/tmp") + "/" + @_id + ".rwf"
    command = commands.join(" | ")
    if config.isSSH and not isPresentation
      command = config.wrapCommand(command)
    command
  outputRwstatsCommand: (config, profile, isPresentation = false) ->
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
      if config.siteConfigFile
        rwstatsOptions.push("--site-config-file=" + config.siteConfigFile)
      rwstatsOptionsString = rwstatsOptions.join(" ")
    else
      rwstatsOptionsString = @rwstatsCmd + " " + defaultRwstatsOptions.join(" ")
      rwstatsOptionsString = share.filterOptions(rwstatsOptionsString)
    command = "rwstats " + rwstatsOptionsString
    command += " " + (config.dataTempdir or "/tmp") + "/" + @_id + ".rwf"
    if config.isSSH and not isPresentation
      command = config.wrapCommand(command)
    command
  outputRwcountCommand: (config, profile, isPresentation = false) ->
    defaultRwcountOptions = ["--delimited", "--no-titles"] # --no-titles is necessary, because header is added later
    if @interface is "builder"
      rwcountOptions = defaultRwcountOptions
      if @rwcountBinSizeEnabled
        rwcountOptions.push("--bin-size=" + @rwcountBinSize)
      if @rwcountLoadSchemeEnabled
        rwcountOptions.push("--load-scheme=" + @rwcountLoadScheme)
      if @rwcountSkipZeroes
        rwcountOptions.push("--skip-zeroes")
      if config.siteConfigFile
        rwcountOptions.push("--site-config-file=" + config.siteConfigFile)
      rwcountOptionsString = rwcountOptions.join(" ")
    else
      rwcountOptionsString = @rwcountCmd + " " + defaultRwcountOptions.join(" ")
    rwcountOptionsString = share.filterOptions(rwcountOptionsString)
    command = "rwcount " + rwcountOptionsString
    command += " " + (config.dataTempdir or "/tmp") + "/" + @_id + ".rwf"
    if @presentation is "table"
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
    if config.isSSH and not isPresentation
      command = config.wrapCommand(command)
    command
  rwstatsCountModeValueIsEnabled: ->
    @rwstatsMode is "count"
  rwstatsThresholdModeValueIsEnabled: ->
    @rwstatsMode is "threshold"
  rwstatsPercentageModeValueIsEnabled: ->
    @rwstatsMode is "percentage"
  availableChartTypes: ->
    share.availableChartTypes[@output]
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

class share.Tuple
  constructor: (doc) ->
    _.extend(@, doc)
  displayName: ->
    @name or "#" + @_id
  objectSelectName: ->
    @displayName()
  objectSelectValue: ->
    @_id
  path: ->
    "/tuple/" + @_id

share.Transformations =
  user: (user) ->
    if user instanceof share.User or not user then user else new share.User(user)
  config: (config) ->
    if config instanceof share.Config or not config then config else new share.Config(config)
  query: (query) ->
    if query instanceof share.Query or not query then query else new share.Query(query)
  ipset: (ipset) ->
    if ipset instanceof share.IPSet or not ipset then ipset else new share.IPSet(ipset)
  tuple: (tuple) ->
    if tuple instanceof share.Tuple or not tuple then tuple else new share.Tuple(tuple)
