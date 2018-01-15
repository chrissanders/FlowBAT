(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Random;

var require = meteorInstall({"node_modules":{"meteor":{"random":{"random.js":function(require){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/random/random.js                                                                                     //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
// We use cryptographically strong PRNGs (crypto.getRandomBytes() on the server,
// window.crypto.getRandomValues() in the browser) when available. If these
// PRNGs fail, we fall back to the Alea PRNG, which is not cryptographically
// strong, and we seed it with various sources such as the date, Math.random,
// and window size on the client.  When using crypto.getRandomValues(), our
// primitive is hexString(), from which we construct fraction(). When using
// window.crypto.getRandomValues() or alea, the primitive is fraction and we use
// that to construct hex string.
if (Meteor.isServer) var nodeCrypto = Npm.require('crypto'); // see http://baagoe.org/en/wiki/Better_random_numbers_for_javascript
// for a full discussion and Alea implementation.

var Alea = function () {
  function Mash() {
    var n = 0xefc8249d;

    var mash = function (data) {
      data = data.toString();

      for (var i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        var h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
      }

      return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };

    mash.version = 'Mash 0.9';
    return mash;
  }

  return function (args) {
    var s0 = 0;
    var s1 = 0;
    var s2 = 0;
    var c = 1;

    if (args.length == 0) {
      args = [+new Date()];
    }

    var mash = Mash();
    s0 = mash(' ');
    s1 = mash(' ');
    s2 = mash(' ');

    for (var i = 0; i < args.length; i++) {
      s0 -= mash(args[i]);

      if (s0 < 0) {
        s0 += 1;
      }

      s1 -= mash(args[i]);

      if (s1 < 0) {
        s1 += 1;
      }

      s2 -= mash(args[i]);

      if (s2 < 0) {
        s2 += 1;
      }
    }

    mash = null;

    var random = function () {
      var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32

      s0 = s1;
      s1 = s2;
      return s2 = t - (c = t | 0);
    };

    random.uint32 = function () {
      return random() * 0x100000000; // 2^32
    };

    random.fract53 = function () {
      return random() + (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
    };

    random.version = 'Alea 0.9';
    random.args = args;
    return random;
  }(Array.prototype.slice.call(arguments));
};

var UNMISTAKABLE_CHARS = "23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz";
var BASE64_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" + "0123456789-_"; // `type` is one of `RandomGenerator.Type` as defined below.
//
// options:
// - seeds: (required, only for RandomGenerator.Type.ALEA) an array
//   whose items will be `toString`ed and used as the seed to the Alea
//   algorithm

var RandomGenerator = function (type, options) {
  var self = this;
  self.type = type;

  if (!RandomGenerator.Type[type]) {
    throw new Error("Unknown random generator type: " + type);
  }

  if (type === RandomGenerator.Type.ALEA) {
    if (!options.seeds) {
      throw new Error("No seeds were provided for Alea PRNG");
    }

    self.alea = Alea.apply(null, options.seeds);
  }
}; // Types of PRNGs supported by the `RandomGenerator` class


RandomGenerator.Type = {
  // Use Node's built-in `crypto.getRandomBytes` (cryptographically
  // secure but not seedable, runs only on the server). Reverts to
  // `crypto.getPseudoRandomBytes` in the extremely uncommon case that
  // there isn't enough entropy yet
  NODE_CRYPTO: "NODE_CRYPTO",
  // Use non-IE browser's built-in `window.crypto.getRandomValues`
  // (cryptographically secure but not seedable, runs only in the
  // browser).
  BROWSER_CRYPTO: "BROWSER_CRYPTO",
  // Use the *fast*, seedaable and not cryptographically secure
  // Alea algorithm
  ALEA: "ALEA"
}; /**
    * @name Random.fraction
    * @summary Return a number between 0 and 1, like `Math.random`.
    * @locus Anywhere
    */

RandomGenerator.prototype.fraction = function () {
  var self = this;

  if (self.type === RandomGenerator.Type.ALEA) {
    return self.alea();
  } else if (self.type === RandomGenerator.Type.NODE_CRYPTO) {
    var numerator = parseInt(self.hexString(8), 16);
    return numerator * 2.3283064365386963e-10; // 2^-32
  } else if (self.type === RandomGenerator.Type.BROWSER_CRYPTO) {
    var array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] * 2.3283064365386963e-10; // 2^-32
  } else {
    throw new Error('Unknown random generator type: ' + self.type);
  }
}; /**
    * @name Random.hexString
    * @summary Return a random string of `n` hexadecimal digits.
    * @locus Anywhere
    * @param {Number} n Length of the string
    */

RandomGenerator.prototype.hexString = function (digits) {
  var self = this;

  if (self.type === RandomGenerator.Type.NODE_CRYPTO) {
    var numBytes = Math.ceil(digits / 2);
    var bytes; // Try to get cryptographically strong randomness. Fall back to
    // non-cryptographically strong if not available.

    try {
      bytes = nodeCrypto.randomBytes(numBytes);
    } catch (e) {
      // XXX should re-throw any error except insufficient entropy
      bytes = nodeCrypto.pseudoRandomBytes(numBytes);
    }

    var result = bytes.toString("hex"); // If the number of digits is odd, we'll have generated an extra 4 bits
    // of randomness, so we need to trim the last digit.

    return result.substring(0, digits);
  } else {
    return this._randomString(digits, "0123456789abcdef");
  }
};

RandomGenerator.prototype._randomString = function (charsCount, alphabet) {
  var self = this;
  var digits = [];

  for (var i = 0; i < charsCount; i++) {
    digits[i] = self.choice(alphabet);
  }

  return digits.join("");
}; /**
    * @name Random.id
    * @summary Return a unique identifier, such as `"Jjwjg6gouWLXhMGKW"`, that is
    * likely to be unique in the whole world.
    * @locus Anywhere
    * @param {Number} [n] Optional length of the identifier in characters
    *   (defaults to 17)
    */

RandomGenerator.prototype.id = function (charsCount) {
  var self = this; // 17 characters is around 96 bits of entropy, which is the amount of
  // state in the Alea PRNG.

  if (charsCount === undefined) charsCount = 17;
  return self._randomString(charsCount, UNMISTAKABLE_CHARS);
}; /**
    * @name Random.secret
    * @summary Return a random string of printable characters with 6 bits of
    * entropy per character. Use `Random.secret` for security-critical secrets
    * that are intended for machine, rather than human, consumption.
    * @locus Anywhere
    * @param {Number} [n] Optional length of the secret string (defaults to 43
    *   characters, or 256 bits of entropy)
    */

RandomGenerator.prototype.secret = function (charsCount) {
  var self = this; // Default to 256 bits of entropy, or 43 characters at 6 bits per
  // character.

  if (charsCount === undefined) charsCount = 43;
  return self._randomString(charsCount, BASE64_CHARS);
}; /**
    * @name Random.choice
    * @summary Return a random element of the given array or string.
    * @locus Anywhere
    * @param {Array|String} arrayOrString Array or string to choose from
    */

RandomGenerator.prototype.choice = function (arrayOrString) {
  var index = Math.floor(this.fraction() * arrayOrString.length);
  if (typeof arrayOrString === "string") return arrayOrString.substr(index, 1);else return arrayOrString[index];
}; // instantiate RNG.  Heuristically collect entropy from various sources when a
// cryptographic PRNG isn't available.
// client sources


var height = typeof window !== 'undefined' && window.innerHeight || typeof document !== 'undefined' && document.documentElement && document.documentElement.clientHeight || typeof document !== 'undefined' && document.body && document.body.clientHeight || 1;
var width = typeof window !== 'undefined' && window.innerWidth || typeof document !== 'undefined' && document.documentElement && document.documentElement.clientWidth || typeof document !== 'undefined' && document.body && document.body.clientWidth || 1;
var agent = typeof navigator !== 'undefined' && navigator.userAgent || "";

function createAleaGeneratorWithGeneratedSeed() {
  return new RandomGenerator(RandomGenerator.Type.ALEA, {
    seeds: [new Date(), height, width, agent, Math.random()]
  });
}

;

if (Meteor.isServer) {
  Random = new RandomGenerator(RandomGenerator.Type.NODE_CRYPTO);
} else {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    Random = new RandomGenerator(RandomGenerator.Type.BROWSER_CRYPTO);
  } else {
    // On IE 10 and below, there's no browser crypto API
    // available. Fall back to Alea
    //
    // XXX looks like at the moment, we use Alea in IE 11 as well,
    // which has `window.msCrypto` instead of `window.crypto`.
    Random = createAleaGeneratorWithGeneratedSeed();
  }
} // Create a non-cryptographically secure PRNG with a given seed (using
// the Alea algorithm)


Random.createWithSeeds = function (...seeds) {
  if (seeds.length === 0) {
    throw new Error("No seeds were provided");
  }

  return new RandomGenerator(RandomGenerator.Type.ALEA, {
    seeds: seeds
  });
}; // Used like `Random`, but much faster and not cryptographically
// secure


Random.insecure = createAleaGeneratorWithGeneratedSeed();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deprecated.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/random/deprecated.js                                                                                 //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
// Before this package existed, we used to use this Meteor.uuid()
// implementing the RFC 4122 v4 UUID. It is no longer documented
// and will go away.
// XXX COMPAT WITH 0.5.6
Meteor.uuid = function () {
  var HEX_DIGITS = "0123456789abcdef";
  var s = [];

  for (var i = 0; i < 36; i++) {
    s[i] = Random.choice(HEX_DIGITS);
  }

  s[14] = "4";
  s[19] = HEX_DIGITS.substr(parseInt(s[19], 16) & 0x3 | 0x8, 1);
  s[8] = s[13] = s[18] = s[23] = "-";
  var uuid = s.join("");
  return uuid;
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./node_modules/meteor/random/random.js");
require("./node_modules/meteor/random/deprecated.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.random = {}, {
  Random: Random
});

})();

//# sourceURL=meteor://💻app/packages/random.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcmFuZG9tL3JhbmRvbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcmFuZG9tL2RlcHJlY2F0ZWQuanMiXSwibmFtZXMiOlsiTWV0ZW9yIiwiaXNTZXJ2ZXIiLCJub2RlQ3J5cHRvIiwiTnBtIiwicmVxdWlyZSIsIkFsZWEiLCJNYXNoIiwibiIsIm1hc2giLCJkYXRhIiwidG9TdHJpbmciLCJpIiwibGVuZ3RoIiwiY2hhckNvZGVBdCIsImgiLCJ2ZXJzaW9uIiwiYXJncyIsInMwIiwiczEiLCJzMiIsImMiLCJEYXRlIiwicmFuZG9tIiwidCIsInVpbnQzMiIsImZyYWN0NTMiLCJBcnJheSIsInByb3RvdHlwZSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsIlVOTUlTVEFLQUJMRV9DSEFSUyIsIkJBU0U2NF9DSEFSUyIsIlJhbmRvbUdlbmVyYXRvciIsInR5cGUiLCJvcHRpb25zIiwic2VsZiIsIlR5cGUiLCJFcnJvciIsIkFMRUEiLCJzZWVkcyIsImFsZWEiLCJhcHBseSIsIk5PREVfQ1JZUFRPIiwiQlJPV1NFUl9DUllQVE8iLCJmcmFjdGlvbiIsIm51bWVyYXRvciIsInBhcnNlSW50IiwiaGV4U3RyaW5nIiwiYXJyYXkiLCJVaW50MzJBcnJheSIsIndpbmRvdyIsImNyeXB0byIsImdldFJhbmRvbVZhbHVlcyIsImRpZ2l0cyIsIm51bUJ5dGVzIiwiTWF0aCIsImNlaWwiLCJieXRlcyIsInJhbmRvbUJ5dGVzIiwiZSIsInBzZXVkb1JhbmRvbUJ5dGVzIiwicmVzdWx0Iiwic3Vic3RyaW5nIiwiX3JhbmRvbVN0cmluZyIsImNoYXJzQ291bnQiLCJhbHBoYWJldCIsImNob2ljZSIsImpvaW4iLCJpZCIsInVuZGVmaW5lZCIsInNlY3JldCIsImFycmF5T3JTdHJpbmciLCJpbmRleCIsImZsb29yIiwic3Vic3RyIiwiaGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJkb2N1bWVudCIsImRvY3VtZW50RWxlbWVudCIsImNsaWVudEhlaWdodCIsImJvZHkiLCJ3aWR0aCIsImlubmVyV2lkdGgiLCJjbGllbnRXaWR0aCIsImFnZW50IiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwiY3JlYXRlQWxlYUdlbmVyYXRvcldpdGhHZW5lcmF0ZWRTZWVkIiwiUmFuZG9tIiwiY3JlYXRlV2l0aFNlZWRzIiwiaW5zZWN1cmUiLCJ1dWlkIiwiSEVYX0RJR0lUUyIsInMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBLElBQUlBLE9BQU9DLFFBQVgsRUFDRSxJQUFJQyxhQUFhQyxJQUFJQyxPQUFKLENBQVksUUFBWixDQUFqQixDLENBRUY7QUFDQTs7QUFDQSxJQUFJQyxPQUFPLFlBQVk7QUFDckIsV0FBU0MsSUFBVCxHQUFnQjtBQUNkLFFBQUlDLElBQUksVUFBUjs7QUFFQSxRQUFJQyxPQUFPLFVBQVNDLElBQVQsRUFBZTtBQUN4QkEsYUFBT0EsS0FBS0MsUUFBTCxFQUFQOztBQUNBLFdBQUssSUFBSUMsSUFBSSxDQUFiLEVBQWdCQSxJQUFJRixLQUFLRyxNQUF6QixFQUFpQ0QsR0FBakMsRUFBc0M7QUFDcENKLGFBQUtFLEtBQUtJLFVBQUwsQ0FBZ0JGLENBQWhCLENBQUw7QUFDQSxZQUFJRyxJQUFJLHNCQUFzQlAsQ0FBOUI7QUFDQUEsWUFBSU8sTUFBTSxDQUFWO0FBQ0FBLGFBQUtQLENBQUw7QUFDQU8sYUFBS1AsQ0FBTDtBQUNBQSxZQUFJTyxNQUFNLENBQVY7QUFDQUEsYUFBS1AsQ0FBTDtBQUNBQSxhQUFLTyxJQUFJLFdBQVQsQ0FSb0MsQ0FRZDtBQUN2Qjs7QUFDRCxhQUFPLENBQUNQLE1BQU0sQ0FBUCxJQUFZLHNCQUFuQixDQVp3QixDQVltQjtBQUM1QyxLQWJEOztBQWVBQyxTQUFLTyxPQUFMLEdBQWUsVUFBZjtBQUNBLFdBQU9QLElBQVA7QUFDRDs7QUFFRCxTQUFRLFVBQVVRLElBQVYsRUFBZ0I7QUFDdEIs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QUFPNEYsSUFBUCxHQUFjLFlBQVk7QUFDeEIsTUFBSUMsYUFBYSxrQkFBakI7QUFDQSxNQUFJQyxJQUFJLEVBQVI7O0FBQ0EsT0FBSyxJQUFJbkYsSUFBSSxDQUFiLEVBQWdCQSxJQUFJLEVBQXBCLEVBQXdCQSxHQUF4QixFQUE2QjtBQUMzQm1GLE1BQUVuRixDQUFGLElBQU84RSxPQUFPdEIsTUFBUCxDQUFjMEIsVUFBZCxDQUFQO0FBQ0Q7O0FBQ0RDLElBQUUsRUFBRixJQUFRLEdBQVI7QUFDQUEsSUFBRSxFQUFGLElBQVFELFdBQVdsQixNQUFYLENBQW1CNUIsU0FBUytDLEVBQUUsRUFBRixDQUFULEVBQWUsRUFBZixJQUFxQixHQUF0QixHQUE2QixHQUEvQyxFQUFvRCxDQUFwRCxDQUFSO0FBQ0FBLElBQUUsQ0FBRixJQUFPQSxFQUFFLEVBQUYsSUFBUUEsRUFBRSxFQUFGLElBQVFBLEVBQUUsRUFBRixJQUFRLEdBQS9CO0FBRUEsTUFBSUYsT0FBT0UsRUFBRTFCLElBQUYsQ0FBTyxFQUFQLENBQVg7QUFDQSxTQUFPd0IsSUFBUDtBQUNELENBWkQsQyIsImZpbGUiOiIvcGFja2FnZXMvcmFuZG9tLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gV2UgdXNlIGNyeXB0b2dyYXBoaWNhbGx5IHN0cm9uZyBQUk5HcyAoY3J5cHRvLmdldFJhbmRvbUJ5dGVzKCkgb24gdGhlIHNlcnZlcixcbi8vIHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKCkgaW4gdGhlIGJyb3dzZXIpIHdoZW4gYXZhaWxhYmxlLiBJZiB0aGVzZVxuLy8gUFJOR3MgZmFpbCwgd2UgZmFsbCBiYWNrIHRvIHRoZSBBbGVhIFBSTkcsIHdoaWNoIGlzIG5vdCBjcnlwdG9ncmFwaGljYWxseVxuLy8gc3Ryb25nLCBhbmQgd2Ugc2VlZCBpdCB3aXRoIHZhcmlvdXMgc291cmNlcyBzdWNoIGFzIHRoZSBkYXRlLCBNYXRoLnJhbmRvbSxcbi8vIGFuZCB3aW5kb3cgc2l6ZSBvbiB0aGUgY2xpZW50LiAgV2hlbiB1c2luZyBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKCksIG91clxuLy8gcHJpbWl0aXZlIGlzIGhleFN0cmluZygpLCBmcm9tIHdoaWNoIHdlIGNvbnN0cnVjdCBmcmFjdGlvbigpLiBXaGVuIHVzaW5nXG4vLyB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcygpIG9yIGFsZWEsIHRoZSBwcmltaXRpdmUgaXMgZnJhY3Rpb24gYW5kIHdlIHVzZVxuLy8gdGhhdCB0byBjb25zdHJ1Y3QgaGV4IHN0cmluZy5cblxuaWYgKE1ldGVvci5pc1NlcnZlcilcbiAgdmFyIG5vZGVDcnlwdG8gPSBOcG0ucmVxdWlyZSgnY3J5cHRvJyk7XG5cbi8vIHNlZSBodHRwOi8vYmFhZ29lLm9yZy9lbi93aWtpL0JldHRlcl9yYW5kb21fbnVtYmVyc19mb3JfamF2YXNjcmlwdFxuLy8gZm9yIGEgZnVsbCBkaXNjdXNzaW9uIGFuZCBBbGVhIGltcGxlbWVudGF0aW9uLlxudmFyIEFsZWEgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIE1hc2goKSB7XG4gICAgdmFyIG4gPSAweGVmYzgyNDlkO1xuXG4gICAgdmFyIG1hc2ggPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICBkYXRhID0gZGF0YS50b1N0cmluZygpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG4gKz0gZGF0YS5jaGFyQ29kZUF0KGkpO1xuICAgICAgICB2YXIgaCA9IDAuMDI1MTk2MDMyODI0MTY5MzggKiBuO1xuICAgICAgICBuID0gaCA+Pj4gMDtcbiAgICAgICAgaCAtPSBuO1xuICAgICAgICBoICo9IG47XG4gICAgICAgIG4gPSBoID4+PiAwO1xuICAgICAgICBoIC09IG47XG4gICAgICAgIG4gKz0gaCAqIDB4MTAwMDAwMDAwOyAvLyAyXjMyXG4gICAgICB9XG4gICAgICByZXR1cm4gKG4gPj4+IDApICogMi4zMjgzMDY0MzY1Mzg2OTYzZS0xMDsgLy8gMl4tMzJcbiAgICB9O1xuXG4gICAgbWFzaC52ZXJzaW9uID0gJ01hc2ggMC45JztcbiAgICByZXR1cm4gbWFzaDtcbiAgfVxuXG4gIHJldHVybiAoZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICB2YXIgczAgPSAwO1xuICAgIHZhciBzMSA9IDA7XG4gICAgdmFyIHMyID0gMDtcbiAgICB2YXIgYyA9IDE7XG5cbiAgICBpZiAoYXJncy5sZW5ndGggPT0gMCkge1xuICAgICAgYXJncyA9IFsrbmV3IERhdGVdO1xuICAgIH1cbiAgICB2YXIgbWFzaCA9IE1hc2goKTtcbiAgICBzMCA9IG1hc2goJyAnKTtcbiAgICBzMSA9IG1hc2goJyAnKTtcbiAgICBzMiA9IG1hc2goJyAnKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgczAgLT0gbWFzaChhcmdzW2ldKTtcbiAgICAgIGlmIChzMCA8IDApIHtcbiAgICAgICAgczAgKz0gMTtcbiAgICAgIH1cbiAgICAgIHMxIC09IG1hc2goYXJnc1tpXSk7XG4gICAgICBpZiAoczEgPCAwKSB7XG4gICAgICAgIHMxICs9IDE7XG4gICAgICB9XG4gICAgICBzMiAtPSBtYXNoKGFyZ3NbaV0pO1xuICAgICAgaWYgKHMyIDwgMCkge1xuICAgICAgICBzMiArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBtYXNoID0gbnVsbDtcblxuICAgIHZhciByYW5kb20gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB0ID0gMjA5MTYzOSAqIHMwICsgYyAqIDIuMzI4MzA2NDM2NTM4Njk2M2UtMTA7IC8vIDJeLTMyXG4gICAgICBzMCA9IHMxO1xuICAgICAgczEgPSBzMjtcbiAgICAgIHJldHVybiBzMiA9IHQgLSAoYyA9IHQgfCAwKTtcbiAgICB9O1xuICAgIHJhbmRvbS51aW50MzIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiByYW5kb20oKSAqIDB4MTAwMDAwMDAwOyAvLyAyXjMyXG4gICAgfTtcbiAgICByYW5kb20uZnJhY3Q1MyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJhbmRvbSgpICtcbiAgICAgICAgKHJhbmRvbSgpICogMHgyMDAwMDAgfCAwKSAqIDEuMTEwMjIzMDI0NjI1MTU2NWUtMTY7IC8vIDJeLTUzXG4gICAgfTtcbiAgICByYW5kb20udmVyc2lvbiA9ICdBbGVhIDAuOSc7XG4gICAgcmFuZG9tLmFyZ3MgPSBhcmdzO1xuICAgIHJldHVybiByYW5kb207XG5cbiAgfSAoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xufTtcblxudmFyIFVOTUlTVEFLQUJMRV9DSEFSUyA9IFwiMjM0NTY3ODlBQkNERUZHSEpLTE1OUFFSU1RXWFlaYWJjZGVmZ2hpamttbm9wcXJzdHV2d3h5elwiO1xudmFyIEJBU0U2NF9DSEFSUyA9IFwiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWlwiICtcbiAgXCIwMTIzNDU2Nzg5LV9cIjtcblxuLy8gYHR5cGVgIGlzIG9uZSBvZiBgUmFuZG9tR2VuZXJhdG9yLlR5cGVgIGFzIGRlZmluZWQgYmVsb3cuXG4vL1xuLy8gb3B0aW9uczpcbi8vIC0gc2VlZHM6IChyZXF1aXJlZCwgb25seSBmb3IgUmFuZG9tR2VuZXJhdG9yLlR5cGUuQUxFQSkgYW4gYXJyYXlcbi8vICAgd2hvc2UgaXRlbXMgd2lsbCBiZSBgdG9TdHJpbmdgZWQgYW5kIHVzZWQgYXMgdGhlIHNlZWQgdG8gdGhlIEFsZWFcbi8vICAgYWxnb3JpdGhtXG52YXIgUmFuZG9tR2VuZXJhdG9yID0gZnVuY3Rpb24gKHR5cGUsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnR5cGUgPSB0eXBlO1xuXG4gIGlmICghUmFuZG9tR2VuZXJhdG9yLlR5cGVbdHlwZV0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHJhbmRvbSBnZW5lcmF0b3IgdHlwZTogXCIgKyB0eXBlKTtcbiAgfVxuXG4gIGlmICh0eXBlID09PSBSYW5kb21HZW5lcmF0b3IuVHlwZS5BTEVBKSB7XG4gICAgaWYgKCFvcHRpb25zLnNlZWRzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBzZWVkcyB3ZXJlIHByb3ZpZGVkIGZvciBBbGVhIFBSTkdcIik7XG4gICAgfVxuICAgIHNlbGYuYWxlYSA9IEFsZWEuYXBwbHkobnVsbCwgb3B0aW9ucy5zZWVkcyk7XG4gIH1cbn07XG5cbi8vIFR5cGVzIG9mIFBSTkdzIHN1cHBvcnRlZCBieSB0aGUgYFJhbmRvbUdlbmVyYXRvcmAgY2xhc3NcblJhbmRvbUdlbmVyYXRvci5UeXBlID0ge1xuICAvLyBVc2UgTm9kZSdzIGJ1aWx0LWluIGBjcnlwdG8uZ2V0UmFuZG9tQnl0ZXNgIChjcnlwdG9ncmFwaGljYWxseVxuICAvLyBzZWN1cmUgYnV0IG5vdCBzZWVkYWJsZSwgcnVucyBvbmx5IG9uIHRoZSBzZXJ2ZXIpLiBSZXZlcnRzIHRvXG4gIC8vIGBjcnlwdG8uZ2V0UHNldWRvUmFuZG9tQnl0ZXNgIGluIHRoZSBleHRyZW1lbHkgdW5jb21tb24gY2FzZSB0aGF0XG4gIC8vIHRoZXJlIGlzbid0IGVub3VnaCBlbnRyb3B5IHlldFxuICBOT0RFX0NSWVBUTzogXCJOT0RFX0NSWVBUT1wiLFxuXG4gIC8vIFVzZSBub24tSUUgYnJvd3NlcidzIGJ1aWx0LWluIGB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlc2BcbiAgLy8gKGNyeXB0b2dyYXBoaWNhbGx5IHNlY3VyZSBidXQgbm90IHNlZWRhYmxlLCBydW5zIG9ubHkgaW4gdGhlXG4gIC8vIGJyb3dzZXIpLlxuICBCUk9XU0VSX0NSWVBUTzogXCJCUk9XU0VSX0NSWVBUT1wiLFxuXG4gIC8vIFVzZSB0aGUgKmZhc3QqLCBzZWVkYWFibGUgYW5kIG5vdCBjcnlwdG9ncmFwaGljYWxseSBzZWN1cmVcbiAgLy8gQWxlYSBhbGdvcml0aG1cbiAgQUxFQTogXCJBTEVBXCIsXG59O1xuXG4vKipcbiAqIEBuYW1lIFJhbmRvbS5mcmFjdGlvblxuICogQHN1bW1hcnkgUmV0dXJuIGEgbnVtYmVyIGJldHdlZW4gMCBhbmQgMSwgbGlrZSBgTWF0aC5yYW5kb21gLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKi9cblJhbmRvbUdlbmVyYXRvci5wcm90b3R5cGUuZnJhY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYudHlwZSA9PT0gUmFuZG9tR2VuZXJhdG9yLlR5cGUuQUxFQSkge1xuICAgIHJldHVybiBzZWxmLmFsZWEoKTtcbiAgfSBlbHNlIGlmIChzZWxmLnR5cGUgPT09IFJhbmRvbUdlbmVyYXRvci5UeXBlLk5PREVfQ1JZUFRPKSB7XG4gICAgdmFyIG51bWVyYXRvciA9IHBhcnNlSW50KHNlbGYuaGV4U3RyaW5nKDgpLCAxNik7XG4gICAgcmV0dXJuIG51bWVyYXRvciAqIDIuMzI4MzA2NDM2NTM4Njk2M2UtMTA7IC8vIDJeLTMyXG4gIH0gZWxzZSBpZiAoc2VsZi50eXBlID09PSBSYW5kb21HZW5lcmF0b3IuVHlwZS5CUk9XU0VSX0NSWVBUTykge1xuICAgIHZhciBhcnJheSA9IG5ldyBVaW50MzJBcnJheSgxKTtcbiAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhhcnJheSk7XG4gICAgcmV0dXJuIGFycmF5WzBdICogMi4zMjgzMDY0MzY1Mzg2OTYzZS0xMDsgLy8gMl4tMzJcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gcmFuZG9tIGdlbmVyYXRvciB0eXBlOiAnICsgc2VsZi50eXBlKTtcbiAgfVxufTtcblxuLyoqXG4gKiBAbmFtZSBSYW5kb20uaGV4U3RyaW5nXG4gKiBAc3VtbWFyeSBSZXR1cm4gYSByYW5kb20gc3RyaW5nIG9mIGBuYCBoZXhhZGVjaW1hbCBkaWdpdHMuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7TnVtYmVyfSBuIExlbmd0aCBvZiB0aGUgc3RyaW5nXG4gKi9cblJhbmRvbUdlbmVyYXRvci5wcm90b3R5cGUuaGV4U3RyaW5nID0gZnVuY3Rpb24gKGRpZ2l0cykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLnR5cGUgPT09IFJhbmRvbUdlbmVyYXRvci5UeXBlLk5PREVfQ1JZUFRPKSB7XG4gICAgdmFyIG51bUJ5dGVzID0gTWF0aC5jZWlsKGRpZ2l0cyAvIDIpO1xuICAgIHZhciBieXRlcztcbiAgICAvLyBUcnkgdG8gZ2V0IGNyeXB0b2dyYXBoaWNhbGx5IHN0cm9uZyByYW5kb21uZXNzLiBGYWxsIGJhY2sgdG9cbiAgICAvLyBub24tY3J5cHRvZ3JhcGhpY2FsbHkgc3Ryb25nIGlmIG5vdCBhdmFpbGFibGUuXG4gICAgdHJ5IHtcbiAgICAgIGJ5dGVzID0gbm9kZUNyeXB0by5yYW5kb21CeXRlcyhudW1CeXRlcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gWFhYIHNob3VsZCByZS10aHJvdyBhbnkgZXJyb3IgZXhjZXB0IGluc3VmZmljaWVudCBlbnRyb3B5XG4gICAgICBieXRlcyA9IG5vZGVDcnlwdG8ucHNldWRvUmFuZG9tQnl0ZXMobnVtQnl0ZXMpO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gYnl0ZXMudG9TdHJpbmcoXCJoZXhcIik7XG4gICAgLy8gSWYgdGhlIG51bWJlciBvZiBkaWdpdHMgaXMgb2RkLCB3ZSdsbCBoYXZlIGdlbmVyYXRlZCBhbiBleHRyYSA0IGJpdHNcbiAgICAvLyBvZiByYW5kb21uZXNzLCBzbyB3ZSBuZWVkIHRvIHRyaW0gdGhlIGxhc3QgZGlnaXQuXG4gICAgcmV0dXJuIHJlc3VsdC5zdWJzdHJpbmcoMCwgZGlnaXRzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5fcmFuZG9tU3RyaW5nKGRpZ2l0cywgXCIwMTIzNDU2Nzg5YWJjZGVmXCIpO1xuICB9XG59O1xuXG5SYW5kb21HZW5lcmF0b3IucHJvdG90eXBlLl9yYW5kb21TdHJpbmcgPSBmdW5jdGlvbiAoY2hhcnNDb3VudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHBoYWJldCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkaWdpdHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGFyc0NvdW50OyBpKyspIHtcbiAgICBkaWdpdHNbaV0gPSBzZWxmLmNob2ljZShhbHBoYWJldCk7XG4gIH1cbiAgcmV0dXJuIGRpZ2l0cy5qb2luKFwiXCIpO1xufTtcblxuLyoqXG4gKiBAbmFtZSBSYW5kb20uaWRcbiAqIEBzdW1tYXJ5IFJldHVybiBhIHVuaXF1ZSBpZGVudGlmaWVyLCBzdWNoIGFzIGBcIkpqd2pnNmdvdVdMWGhNR0tXXCJgLCB0aGF0IGlzXG4gKiBsaWtlbHkgdG8gYmUgdW5pcXVlIGluIHRoZSB3aG9sZSB3b3JsZC5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQHBhcmFtIHtOdW1iZXJ9IFtuXSBPcHRpb25hbCBsZW5ndGggb2YgdGhlIGlkZW50aWZpZXIgaW4gY2hhcmFjdGVyc1xuICogICAoZGVmYXVsdHMgdG8gMTcpXG4gKi9cblJhbmRvbUdlbmVyYXRvci5wcm90b3R5cGUuaWQgPSBmdW5jdGlvbiAoY2hhcnNDb3VudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vIDE3IGNoYXJhY3RlcnMgaXMgYXJvdW5kIDk2IGJpdHMgb2YgZW50cm9weSwgd2hpY2ggaXMgdGhlIGFtb3VudCBvZlxuICAvLyBzdGF0ZSBpbiB0aGUgQWxlYSBQUk5HLlxuICBpZiAoY2hhcnNDb3VudCA9PT0gdW5kZWZpbmVkKVxuICAgIGNoYXJzQ291bnQgPSAxNztcblxuICByZXR1cm4gc2VsZi5fcmFuZG9tU3RyaW5nKGNoYXJzQ291bnQsIFVOTUlTVEFLQUJMRV9DSEFSUyk7XG59O1xuXG4vKipcbiAqIEBuYW1lIFJhbmRvbS5zZWNyZXRcbiAqIEBzdW1tYXJ5IFJldHVybiBhIHJhbmRvbSBzdHJpbmcgb2YgcHJpbnRhYmxlIGNoYXJhY3RlcnMgd2l0aCA2IGJpdHMgb2ZcbiAqIGVudHJvcHkgcGVyIGNoYXJhY3Rlci4gVXNlIGBSYW5kb20uc2VjcmV0YCBmb3Igc2VjdXJpdHktY3JpdGljYWwgc2VjcmV0c1xuICogdGhhdCBhcmUgaW50ZW5kZWQgZm9yIG1hY2hpbmUsIHJhdGhlciB0aGFuIGh1bWFuLCBjb25zdW1wdGlvbi5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQHBhcmFtIHtOdW1iZXJ9IFtuXSBPcHRpb25hbCBsZW5ndGggb2YgdGhlIHNlY3JldCBzdHJpbmcgKGRlZmF1bHRzIHRvIDQzXG4gKiAgIGNoYXJhY3RlcnMsIG9yIDI1NiBiaXRzIG9mIGVudHJvcHkpXG4gKi9cblJhbmRvbUdlbmVyYXRvci5wcm90b3R5cGUuc2VjcmV0ID0gZnVuY3Rpb24gKGNoYXJzQ291bnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvLyBEZWZhdWx0IHRvIDI1NiBiaXRzIG9mIGVudHJvcHksIG9yIDQzIGNoYXJhY3RlcnMgYXQgNiBiaXRzIHBlclxuICAvLyBjaGFyYWN0ZXIuXG4gIGlmIChjaGFyc0NvdW50ID09PSB1bmRlZmluZWQpXG4gICAgY2hhcnNDb3VudCA9IDQzO1xuICByZXR1cm4gc2VsZi5fcmFuZG9tU3RyaW5nKGNoYXJzQ291bnQsIEJBU0U2NF9DSEFSUyk7XG59O1xuXG4vKipcbiAqIEBuYW1lIFJhbmRvbS5jaG9pY2VcbiAqIEBzdW1tYXJ5IFJldHVybiBhIHJhbmRvbSBlbGVtZW50IG9mIHRoZSBnaXZlbiBhcnJheSBvciBzdHJpbmcuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7QXJyYXl8U3RyaW5nfSBhcnJheU9yU3RyaW5nIEFycmF5IG9yIHN0cmluZyB0byBjaG9vc2UgZnJvbVxuICovXG5SYW5kb21HZW5lcmF0b3IucHJvdG90eXBlLmNob2ljZSA9IGZ1bmN0aW9uIChhcnJheU9yU3RyaW5nKSB7XG4gIHZhciBpbmRleCA9IE1hdGguZmxvb3IodGhpcy5mcmFjdGlvbigpICogYXJyYXlPclN0cmluZy5sZW5ndGgpO1xuICBpZiAodHlwZW9mIGFycmF5T3JTdHJpbmcgPT09IFwic3RyaW5nXCIpXG4gICAgcmV0dXJuIGFycmF5T3JTdHJpbmcuc3Vic3RyKGluZGV4LCAxKTtcbiAgZWxzZVxuICAgIHJldHVybiBhcnJheU9yU3RyaW5nW2luZGV4XTtcbn07XG5cbi8vIGluc3RhbnRpYXRlIFJORy4gIEhldXJpc3RpY2FsbHkgY29sbGVjdCBlbnRyb3B5IGZyb20gdmFyaW91cyBzb3VyY2VzIHdoZW4gYVxuLy8gY3J5cHRvZ3JhcGhpYyBQUk5HIGlzbid0IGF2YWlsYWJsZS5cblxuLy8gY2xpZW50IHNvdXJjZXNcbnZhciBoZWlnaHQgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmlubmVySGVpZ2h0KSB8fFxuICAgICAgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcbiAgICAgICAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KSB8fFxuICAgICAgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAmJiBkb2N1bWVudC5ib2R5XG4gICAgICAgJiYgZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQpIHx8XG4gICAgICAxO1xuXG52YXIgd2lkdGggPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmlubmVyV2lkdGgpIHx8XG4gICAgICAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICAgICAgICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCkgfHxcbiAgICAgICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnXG4gICAgICAgJiYgZG9jdW1lbnQuYm9keVxuICAgICAgICYmIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgpIHx8XG4gICAgICAxO1xuXG52YXIgYWdlbnQgPSAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudCkgfHwgXCJcIjtcblxuZnVuY3Rpb24gY3JlYXRlQWxlYUdlbmVyYXRvcldpdGhHZW5lcmF0ZWRTZWVkKCkge1xuICByZXR1cm4gbmV3IFJhbmRvbUdlbmVyYXRvcihcbiAgICBSYW5kb21HZW5lcmF0b3IuVHlwZS5BTEVBLFxuICAgIHtzZWVkczogW25ldyBEYXRlLCBoZWlnaHQsIHdpZHRoLCBhZ2VudCwgTWF0aC5yYW5kb20oKV19KTtcbn07XG5cbmlmIChNZXRlb3IuaXNTZXJ2ZXIpIHtcbiAgUmFuZG9tID0gbmV3IFJhbmRvbUdlbmVyYXRvcihSYW5kb21HZW5lcmF0b3IuVHlwZS5OT0RFX0NSWVBUTyk7XG59IGVsc2Uge1xuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3cuY3J5cHRvICYmXG4gICAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcykge1xuICAgIFJhbmRvbSA9IG5ldyBSYW5kb21HZW5lcmF0b3IoUmFuZG9tR2VuZXJhdG9yLlR5cGUuQlJPV1NFUl9DUllQVE8pO1xuICB9IGVsc2Uge1xuICAgIC8vIE9uIElFIDEwIGFuZCBiZWxvdywgdGhlcmUncyBubyBicm93c2VyIGNyeXB0byBBUElcbiAgICAvLyBhdmFpbGFibGUuIEZhbGwgYmFjayB0byBBbGVhXG4gICAgLy9cbiAgICAvLyBYWFggbG9va3MgbGlrZSBhdCB0aGUgbW9tZW50LCB3ZSB1c2UgQWxlYSBpbiBJRSAxMSBhcyB3ZWxsLFxuICAgIC8vIHdoaWNoIGhhcyBgd2luZG93Lm1zQ3J5cHRvYCBpbnN0ZWFkIG9mIGB3aW5kb3cuY3J5cHRvYC5cbiAgICBSYW5kb20gPSBjcmVhdGVBbGVhR2VuZXJhdG9yV2l0aEdlbmVyYXRlZFNlZWQoKTtcbiAgfVxufVxuXG4vLyBDcmVhdGUgYSBub24tY3J5cHRvZ3JhcGhpY2FsbHkgc2VjdXJlIFBSTkcgd2l0aCBhIGdpdmVuIHNlZWQgKHVzaW5nXG4vLyB0aGUgQWxlYSBhbGdvcml0aG0pXG5SYW5kb20uY3JlYXRlV2l0aFNlZWRzID0gZnVuY3Rpb24gKC4uLnNlZWRzKSB7XG4gIGlmIChzZWVkcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBzZWVkcyB3ZXJlIHByb3ZpZGVkXCIpO1xuICB9XG4gIHJldHVybiBuZXcgUmFuZG9tR2VuZXJhdG9yKFJhbmRvbUdlbmVyYXRvci5UeXBlLkFMRUEsIHtzZWVkczogc2VlZHN9KTtcbn07XG5cbi8vIFVzZWQgbGlrZSBgUmFuZG9tYCwgYnV0IG11Y2ggZmFzdGVyIGFuZCBub3QgY3J5cHRvZ3JhcGhpY2FsbHlcbi8vIHNlY3VyZVxuUmFuZG9tLmluc2VjdXJlID0gY3JlYXRlQWxlYUdlbmVyYXRvcldpdGhHZW5lcmF0ZWRTZWVkKCk7XG4iLCIvLyBCZWZvcmUgdGhpcyBwYWNrYWdlIGV4aXN0ZWQsIHdlIHVzZWQgdG8gdXNlIHRoaXMgTWV0ZW9yLnV1aWQoKVxuLy8gaW1wbGVtZW50aW5nIHRoZSBSRkMgNDEyMiB2NCBVVUlELiBJdCBpcyBubyBsb25nZXIgZG9jdW1lbnRlZFxuLy8gYW5kIHdpbGwgZ28gYXdheS5cbi8vIFhYWCBDT01QQVQgV0lUSCAwLjUuNlxuTWV0ZW9yLnV1aWQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBIRVhfRElHSVRTID0gXCIwMTIzNDU2Nzg5YWJjZGVmXCI7XG4gIHZhciBzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgMzY7IGkrKykge1xuICAgIHNbaV0gPSBSYW5kb20uY2hvaWNlKEhFWF9ESUdJVFMpO1xuICB9XG4gIHNbMTRdID0gXCI0XCI7XG4gIHNbMTldID0gSEVYX0RJR0lUUy5zdWJzdHIoKHBhcnNlSW50KHNbMTldLDE2KSAmIDB4MykgfCAweDgsIDEpO1xuICBzWzhdID0gc1sxM10gPSBzWzE4XSA9IHNbMjNdID0gXCItXCI7XG5cbiAgdmFyIHV1aWQgPSBzLmpvaW4oXCJcIik7XG4gIHJldHVybiB1dWlkO1xufTtcbiJdfQ==
