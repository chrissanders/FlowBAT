#eachline

Streams2 line reader / stream transformer.

First let me say: I did **NOT** want to write yet another line reader! 
I couldn't find one that is working with node's new `Streams2` objects.

The [byline](https://github.com/jahewson/node-byline) module has taken a first stab at it, 
but it isn't working. (as of [32bf791e38](https://github.com/jahewson/node-byline/commit/32bf791e387a46c720b604d8d5807eeb8f668ddf))

**So here we are...**
```javascript
var fs = require('fs');
var eachline = require('eachline');
var stream = fs.createReadStream(__dirname+'/.gitignore');

eachline(stream, function(line){
  console.log(line);
});
```

However, if you're just looking to open a file:
```javascript
var eachline = require('eachline');
eachline.in(__dirname+'/.gitignore', function(line){
  console.log(line);
});
```

...or if you need a simple http GET:
```javascript
var eachline = require('eachline');
var url = 'https://raw.github.com/williamwicks/node-eachline/master/.gitignore';
eachline.in(url, function(line){
  console.log(line);
});
```

##Transforming Streams
[eachline](https://github.com/williamwicks/node-eachline) uses `Streams2`'s transformation 
feature allowing you to throw [eachline](https://github.com/williamwicks/node-eachline) between `.pipe()`s
to modify output as needed.

```javascript
var fs = require('fs');
var eachline = require('eachline');
var file = fs.createReadStream(__dirname+'/.gitignore');

var transformer = eachline(function(data){
  return data.substr(0, 2)+'\n';
});

file.pipe(transformer).pipe(process.stdout);
```

##API
###eachline()
Use with a `pipe()` to re-chunk the stream into lines.

###eachline([encoding,] callback)
Use with `pipe()` optionally specifying the encoding.

###eachline(ReadableStream,[ encoding,] callback)
Got that stream ready? Pass it in, get them lines. Easy-peasy.

###eachline.in(url, callback)<br>
eachline.in(filepath, callback)
Just a helper function to make these simple tasks cleaner.

It returns the `Transform` stream so you can listen to the events.
```javascript
var linecount = 0;
var eachline = require('eachline');
eachline.in(__dirname+'/.gitignore', function(data){
	linecount++;
})
.on('finish', function(){
	console.log(linecount + " lines found");
});
```

**callback(data, lineno[ ,next])**<BR>
The `callback` arguments above will be called for every line found in the `ReadableStream`.

It will be passed the `data` and `lineno` arguments. You can optionally defined a
3rd argument to get asynchronous flow. `eachline` examines `callback.length` to detirmine
if asynchronous flow should be used. If found, you must call `next()` to continue reading.

For Stream transformations, any value `return`'d will be written to the next `pipe()` in the chain.


License
=======

The MIT License (MIT)

Copyright (c) 2013 William Wicks

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
