

var stream = require('stream');
var Transform = stream.Transform;
var type = require("type-of");


function eachline(a,b,c){
	var signature = Array.prototype.map.call(arguments, type).join();
	var t = new Transformer();
	switch(signature){
		//stream.pipe(eachline(transformer)).pipe(stdio)
		case "function":
			t.encoding = "utf8";
			t.ondata = a;
			return t;

		//stream.pipe(eachline("hex", transformer)).pipe(stdio)
		case "string":
		case "string,function":
			t.encoding = a;
			t.ondata = b;
			return t;

		//eachline(stream, ondata);
		case "object":
		case "object,function":
			t.encoding = "utf8";
			t.ondata = b;
			a.pipe(t).pipe(new Dummy());
			return t;

		//eachline(stream, "hex", ondata);
		case "object,string":           //Readable,string
		case "object,string,function":  //Readable,string,function
			t.encoding = b;
			t.ondata = c;
			a.pipe(t).pipe(new Dummy());
			return t;
		case "":
			t.encoding = "utf8";
			return t;
	}

	throw new Error("I don't know what you want");
};

module.exports = eachline;
module.exports.in = function(location, cb){
	var args = Array.prototype.slice.call(arguments);
	var web = /(https?):\/\//.exec(location);
	if(web){
		var ev = new (require('events').EventEmitter)();
		location = require('url').parse(location);
		location.agent = false;
		require(web[1]).get(location, function(res){
			args[0] = res;
			var t = eachline.apply(this, args);
			Object.keys(ev._events).forEach(function(event){
				t._events[event] = ev._events[event];
			});
		})
		.end();
		return ev;
	}
	else {
		args[0] = require('fs').createReadStream(location);
		return eachline.apply(this, args);
	}
}



//a dummy writer is needed if we're not pipe'in
function Dummy(){
	stream.Writable.call(this);
}
Dummy.prototype = Object.create(stream.Writable.prototype, { constructor: { value: Dummy }});
Dummy.prototype._write = function(line, encoding, done) {
	done();
};




function Transformer() {
	this._line = 0;
	Transform.call(this);
}
Transformer.prototype = Object.create(Transform.prototype, { constructor: { value: Transformer }});
module.exports.Transformer = Transformer;

function findEOL(bytes, i){
	for(;i<bytes.length;i++){
		var c = bytes[i];
		if(c===13 || c===10){ //CR or LF
			return i;
		}
	}
	return false;
}
Transformer.prototype._transform = function(chunk, encoding, done) {
	var xform = this,
		start = 0,
		enc = !/binary|buffer/.test(this.encoding)? this.encoding : false,
		eol;

	function next() {
		if((eol=findEOL(chunk, start))!==false){

			var line, hasCRLF = chunk[eol]===13 && chunk[eol+1]===10;

			if(xform.remnant){
				line = Buffer.concat([xform.remnant, chunk.slice(start, eol)]);
				delete xform.remnant;
			}
			else {
				line = chunk.slice(start, eol);
			}
			start = eol+(hasCRLF? 2:1);

			var sigd = false;
			function signaled(data) {
				if(sigd) return;
				sigd=true;
				if(data) {
					xform.push(data, xform.encoding);
				}
				next();
			}

			if(enc)
				line= line.toString(enc);
			if(xform.ondata){
				line = xform.ondata(line, xform._line++, signaled);
			}
			else {
				xform._line++;
			}

			signaled(line);
		}
		else {
			if(xform.remnant){//no LF found in this chunk
				xform.remnant = Buffer.concat([xform.remnant, chunk]);;
			}
			else {
				xform.remnant = chunk.slice(start);
			}
			if(!xform.remnant.length) {
				delete xform.remnant;
			}

			return done();
		}
	}

	next();
};

Transformer.prototype._flush = function(done) {
	if(this.remnant) {
		var line = this.encoding && !/binary|buffer/.test(this.encoding)? this.remnant.toString(this.encoding) : this.remnant;
		if(this.ondata)
			line = 	this.ondata(line, this._line++);
		else
			this._line++;
		this.push(line, this.encoding);
	}
	done();
};
