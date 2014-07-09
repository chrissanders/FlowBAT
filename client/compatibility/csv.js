toCSV = function(dataArray) {
    var delim = ',', qualifier = '"', escape = '\\', encloseNumbers = true, keys = false;

    function hasVal(it) {
        return it !== null && it !== '';
    }

    if (typeof arguments[0] === 'object') {
        delim = arguments[0].delimiter || delim;
        delim = arguments[0].separator || delim;
        qualifier = arguments[0].qualifier || qualifier;
        encloseNumbers = !!arguments[0].encloseNumbers;
        escape = arguments[0].escape || escape;
        keys = !!arguments[0].keys;
    } else if (typeof arguments[0] === 'string') {
        delim = arguments[0];
    }

    if (typeof arguments[1] === 'string')
        qualifier = arguments[1];

    if (arguments[1] === null)
        qualifier = null;

    var rep = escape + qualifier;
    var buildString = [];
    for (var i = 0; i < dataArray.length; ++i) {
        var shouldQualify = hasVal(qualifier);
        if (typeof dataArray[i] == 'number')
            shouldQualify &= encloseNumbers;

        if (shouldQualify)
            buildString.push(qualifier);

        if (dataArray[i] !== null && dataArray[i] !== undefined) {
            var d = dataArray[i].toString().split(qualifier).join(rep);
            buildString.push(d);
        } else
            buildString.push('');

        if (shouldQualify)
            buildString.push(qualifier);

        if (delim)
            buildString.push(delim);
    }

    //chop last delim
    //console.log(buildString.length)
    buildString.length = buildString.length - 1;
    return buildString.join('');
};