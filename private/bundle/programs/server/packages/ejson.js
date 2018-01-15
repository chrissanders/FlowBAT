(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Base64 = Package.base64.Base64;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var v, EJSON;

var require = meteorInstall({"node_modules":{"meteor":{"ejson":{"ejson.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/ejson/ejson.js                                                                                        //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
module.export({
  EJSON: () => EJSON
});
/**
 * @namespace
 * @summary Namespace for EJSON functions
 */const EJSON = {}; // Custom type interface definition
/**
 * @class CustomType
 * @instanceName customType
 * @memberOf EJSON
 * @summary The interface that a class must satisfy to be able to become an
 * EJSON custom type via EJSON.addType.
 */ /**
     * @function typeName
     * @memberOf EJSON.CustomType
     * @summary Return the tag used to identify this type.  This must match the
     *          tag used to register this type with
     *          [`EJSON.addType`](#ejson_add_type).
     * @locus Anywhere
     * @instance
     */ /**
         * @function toJSONValue
         * @memberOf EJSON.CustomType
         * @summary Serialize this instance into a JSON-compatible value.
         * @locus Anywhere
         * @instance
         */ /**
             * @function clone
             * @memberOf EJSON.CustomType
             * @summary Return a value `r` such that `this.equals(r)` is true, and
             *          modifications to `r` do not affect `this` and vice versa.
             * @locus Anywhere
             * @instance
             */ /**
                 * @function equals
                 * @memberOf EJSON.CustomType
                 * @summary Return `true` if `other` has a value equal to `this`; `false`
                 *          otherwise.
                 * @locus Anywhere
                 * @param {Object} other Another object to compare this to.
                 * @instance
                 */
const customTypes = {};

const hasOwn = (obj, prop) => ({}).hasOwnProperty.call(obj, prop);

const isArguments = obj => obj != null && hasOwn(obj, 'callee');

const isInfOrNan = obj => Number.isNaN(obj) || obj === Infinity || obj === -Infinity; // Add a custom type, using a method of your choice to get to and
// from a basic JSON-able representation.  The factory argument
// is a function of JSON-able --> your object
// The type you add must have:
// - A toJSONValue() method, so that Meteor can serialize it
// - a typeName() method, to show how to look it up in our type table.
// It is okay if these methods are monkey-patched on.
// EJSON.clone will use toJSONValue and the given factory to produce
// a clone, but you may specify a method clone() that will be
// used instead.
// Similarly, EJSON.equals will use toJSONValue to make comparisons,
// but you may provide a method equals() instead.
/**
 * @summary Add a custom datatype to EJSON.
 * @locus Anywhere
 * @param {String} name A tag for your custom type; must be unique among
 *                      custom data types defined in your project, and must
 *                      match the result of your type's `typeName` method.
 * @param {Function} factory A function that deserializes a JSON-compatible
 *                           value into an instance of your type.  This should
 *                           match the serialization performed by your
 *                           type's `toJSONValue` method.
 */

EJSON.addType = (name, factory) => {
  if (hasOwn(customTypes, name)) {
    throw new Error(`Type ${name} already present`);
  }

  customTypes[name] = factory;
};

const builtinConverters = [{
  // Date
  matchJSONValue(obj) {
    return hasOwn(obj, '$date') && Object.keys(obj).length === 1;
  },

  matchObject(obj) {
    return obj instanceof Date;
  },

  toJSONValue(obj) {
    return {
      $date: obj.getTime()
    };
  },

  fromJSONValue(obj) {
    return new Date(obj.$date);
  }

}, {
  // RegExp
  matchJSONValue(obj) {
    return hasOwn(obj, '$regexp') && hasOwn(obj, '$flags') && Object.keys(obj).length === 2;
  },

  matchObject(obj) {
    return obj instanceof RegExp;
  },

  toJSONValue(regexp) {
    return {
      $regexp: regexp.source,
      $flags: regexp.flags
    };
  },

  fromJSONValue(obj) {
    // Replaces duplicate / invalid flags.
    return new RegExp(obj.$regexp, obj.$flags // Cut off flags at 50 chars to avoid abusing RegExp for DOS.
    .slice(0, 50).replace(/[^gimuy]/g, '').replace(/(.)(?=.*\1)/g, ''));
  }

}, {
  // NaN, Inf, -Inf. (These are the only objects with typeof !== 'object'
  // which we match.)
  matchJSONValue(obj) {
    return hasOwn(obj, '$InfNaN') && Object.keys(obj).length === 1;
  },

  matchObject: isInfOrNan,

  toJSONValue(obj) {
    let sign;

    if (Number.isNaN(obj)) {
      sign = 0;
    } else if (obj === Infinity) {
      sign = 1;
    } else {
      sign = -1;
    }

    return {
      $InfNaN: sign
    };
  },

  fromJSONValue(obj) {
    return obj.$InfNaN / 0;
  }

}, {
  // Binary
  matchJSONValue(obj) {
    return hasOwn(obj, '$binary') && Object.keys(obj).length === 1;
  },

  matchObject(obj) {
    return typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array || obj && hasOwn(obj, '$Uint8ArrayPolyfill');
  },

  toJSONValue(obj) {
    return {
      $binary: Base64.encode(obj)
    };
  },

  fromJSONValue(obj) {
    return Base64.decode(obj.$binary);
  }

}, {
  // Escaping one level
  matchJSONValue(obj) {
    return hasOwn(obj, '$escape') && Object.keys(obj).length === 1;
  },

  matchObject(obj) {
    let match = false;

    if (obj) {
      const keyCount = Object.keys(obj).length;

      if (keyCount === 1 || keyCount === 2) {
        match = builtinConverters.some(converter => converter.matchJSONValue(obj));
      }
    }

    return match;
  },

  toJSONValue(obj) {
    const newObj = {};
    Object.keys(obj).forEach(key => {
      newObj[key] = EJSON.toJSONValue(obj[key]);
    });
    return {
      $escape: newObj
    };
  },

  fromJSONValue(obj) {
    const newObj = {};
    Object.keys(obj.$escape).forEach(key => {
      newObj[key] = EJSON.fromJSONValue(obj.$escape[key]);
    });
    return newObj;
  }

}, {
  // Custom
  matchJSONValue(obj) {
    return hasOwn(obj, '$type') && hasOwn(obj, '$value') && Object.keys(obj).length === 2;
  },

  matchObject(obj) {
    return EJSON._isCustomType(obj);
  },

  toJSONValue(obj) {
    const jsonValue = Meteor._noYieldsAllowed(() => obj.toJSONValue());

    return {
      $type: obj.typeName(),
      $value: jsonValue
    };
  },

  fromJSONValue(obj) {
    const typeName = obj.$type;

    if (!hasOwn(customTypes, typeName)) {
      throw new Error(`Custom EJSON type ${typeName} is not defined`);
    }

    const converter = customTypes[typeName];
    return Meteor._noYieldsAllowed(() => converter(obj.$value));
  }

}];

EJSON._isCustomType = obj => obj && typeof obj.toJSONValue === 'function' && typeof obj.typeName === 'function' && hasOwn(customTypes, obj.typeName());

EJSON._getTypes = () => customTypes;

EJSON._getConverters = () => builtinConverters; // Either return the JSON-compatible version of the argument, or undefined (if
// the item isn't itself replaceable, but maybe some fields in it are)


const toJSONValueHelper = item => {
  for (let i = 0; i < builtinConverters.length; i++) {
    const converter = builtinConverters[i];

    if (converter.matchObject(item)) {
      return converter.toJSONValue(item);
    }
  }

  return undefined;
}; // for both arrays and objects, in-place modification.


const adjustTypesToJSONValue = obj => {
  // Is it an atom that we need to adjust?
  if (obj === null) {
    return null;
  }

  const maybeChanged = toJSONValueHelper(obj);

  if (maybeChanged !== undefined) {
    return maybeChanged;
  } // Other atoms are unchanged.


  if (typeof obj !== 'object') {
    return obj;
  } // Iterate over array or object structure.


  Object.keys(obj).forEach(key => {
    const value = obj[key];

    if (typeof value !== 'object' && value !== undefined && !isInfOrNan(value)) {
      return; // continue
    }

    const changed = toJSONValueHelper(value);

    if (changed) {
      obj[key] = changed;
      return; // on to the next key
    } // if we get here, value is an object but not adjustable
    // at this level.  recurse.


    adjustTypesToJSONValue(value);
  });
  return obj;
};

EJSON._adjustTypesToJSONValue = adjustTypesToJSONValue; /**
                                                         * @summary Serialize an EJSON-compatible value into its plain JSON
                                                         *          representation.
                                                         * @locus Anywhere
                                                         * @param {EJSON} val A value to serialize to plain JSON.
                                                         */

EJSON.toJSONValue = item => {
  const changed = toJSONValueHelper(item);

  if (changed !== undefined) {
    return changed;
  }

  let newItem = item;

  if (typeof item === 'object') {
    newItem = EJSON.clone(item);
    adjustTypesToJSONValue(newItem);
  }

  return newItem;
}; // Either return the argument changed to have the non-json
// rep of itself (the Object version) or the argument itself.
// DOES NOT RECURSE.  For actually getting the fully-changed value, use
// EJSON.fromJSONValue


const fromJSONValueHelper = value => {
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value);

    if (keys.length <= 2 && keys.every(k => typeof k === 'string' && k.substr(0, 1) === '$')) {
      for (let i = 0; i < builtinConverters.length; i++) {
        const converter = builtinConverters[i];

        if (converter.matchJSONValue(value)) {
          return converter.fromJSONValue(value);
        }
      }
    }
  }

  return value;
}; // for both arrays and objects. Tries its best to just
// use the object you hand it, but may return something
// different if the object you hand it itself needs changing.


const adjustTypesFromJSONValue = obj => {
  if (obj === null) {
    return null;
  }

  const maybeChanged = fromJSONValueHelper(obj);

  if (maybeChanged !== obj) {
    return maybeChanged;
  } // Other atoms are unchanged.


  if (typeof obj !== 'object') {
    return obj;
  }

  Object.keys(obj).forEach(key => {
    const value = obj[key];

    if (typeof value === 'object') {
      const changed = fromJSONValueHelper(value);

      if (value !== changed) {
        obj[key] = changed;
        return;
      } // if we get here, value is an object but not adjustable
      // at this level.  recurse.


      adjustTypesFromJSONValue(value);
    }
  });
  return obj;
};

EJSON._adjustTypesFromJSONValue = adjustTypesFromJSONValue; /**
                                                             * @summary Deserialize an EJSON value from its plain JSON representation.
                                                             * @locus Anywhere
                                                             * @param {JSONCompatible} val A value to deserialize into EJSON.
                                                             */

EJSON.fromJSONValue = item => {
  let changed = fromJSONValueHelper(item);

  if (changed === item && typeof item === 'object') {
    changed = EJSON.clone(item);
    adjustTypesFromJSONValue(changed);
  }

  return changed;
}; /**
    * @summary Serialize a value to a string. For EJSON values, the serialization
    *          fully represents the value. For non-EJSON values, serializes the
    *          same way as `JSON.stringify`.
    * @locus Anywhere
    * @param {EJSON} val A value to stringify.
    * @param {Object} [options]
    * @param {Boolean | Integer | String} options.indent Indents objects and
    * arrays for easy readability.  When `true`, indents by 2 spaces; when an
    * integer, indents by that number of spaces; and when a string, uses the
    * string as the indentation pattern.
    * @param {Boolean} options.canonical When `true`, stringifies keys in an
    *                                    object in sorted order.
    */

EJSON.stringify = (item, options) => {
  let serialized;
  const json = EJSON.toJSONValue(item);

  if (options && (options.canonical || options.indent)) {
    let canonicalStringify;
    module.watch(require("./stringify"), {
      default(v) {
        canonicalStringify = v;
      }

    }, 0);
    serialized = canonicalStringify(json, options);
  } else {
    serialized = JSON.stringify(json);
  }

  return serialized;
}; /**
    * @summary Parse a string into an EJSON value. Throws an error if the string
    *          is not valid EJSON.
    * @locus Anywhere
    * @param {String} str A string to parse into an EJSON value.
    */

EJSON.parse = item => {
  if (typeof item !== 'string') {
    throw new Error('EJSON.parse argument should be a string');
  }

  return EJSON.fromJSONValue(JSON.parse(item));
}; /**
    * @summary Returns true if `x` is a buffer of binary data, as returned from
    *          [`EJSON.newBinary`](#ejson_new_binary).
    * @param {Object} x The variable to check.
    * @locus Anywhere
    */

EJSON.isBinary = obj => {
  return !!(typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array || obj && obj.$Uint8ArrayPolyfill);
}; /**
    * @summary Return true if `a` and `b` are equal to each other.  Return false
    *          otherwise.  Uses the `equals` method on `a` if present, otherwise
    *          performs a deep comparison.
    * @locus Anywhere
    * @param {EJSON} a
    * @param {EJSON} b
    * @param {Object} [options]
    * @param {Boolean} options.keyOrderSensitive Compare in key sensitive order,
    * if supported by the JavaScript implementation.  For example, `{a: 1, b: 2}`
    * is equal to `{b: 2, a: 1}` only when `keyOrderSensitive` is `false`.  The
    * default is `false`.
    */

EJSON.equals = (a, b, options) => {
  let i;
  const keyOrderSensitive = !!(options && options.keyOrderSensitive);

  if (a === b) {
    return true;
  } // This differs from the IEEE spec for NaN equality, b/c we don't want
  // anything ever with a NaN to be poisoned from becoming equal to anything.


  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  } // if either one is falsy, they'd have to be === to be equal


  if (!a || !b) {
    return false;
  }

  if (!(typeof a === 'object' && typeof b === 'object')) {
    return false;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.valueOf() === b.valueOf();
  }

  if (EJSON.isBinary(a) && EJSON.isBinary(b)) {
    if (a.length !== b.length) {
      return false;
    }

    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  if (typeof a.equals === 'function') {
    return a.equals(b, options);
  }

  if (typeof b.equals === 'function') {
    return b.equals(a, options);
  }

  if (a instanceof Array) {
    if (!(b instanceof Array)) {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    for (i = 0; i < a.length; i++) {
      if (!EJSON.equals(a[i], b[i], options)) {
        return false;
      }
    }

    return true;
  } // fallback for custom types that don't implement their own equals


  switch (EJSON._isCustomType(a) + EJSON._isCustomType(b)) {
    case 1:
      return false;

    case 2:
      return EJSON.equals(EJSON.toJSONValue(a), EJSON.toJSONValue(b));

    default: // Do nothing
  } // fall back to structural equality of objects


  let ret;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (keyOrderSensitive) {
    i = 0;
    ret = aKeys.every(key => {
      if (i >= bKeys.length) {
        return false;
      }

      if (key !== bKeys[i]) {
        return false;
      }

      if (!EJSON.equals(a[key], b[bKeys[i]], options)) {
        return false;
      }

      i++;
      return true;
    });
  } else {
    i = 0;
    ret = aKeys.every(key => {
      if (!hasOwn(b, key)) {
        return false;
      }

      if (!EJSON.equals(a[key], b[key], options)) {
        return false;
      }

      i++;
      return true;
    });
  }

  return ret && i === bKeys.length;
}; /**
    * @summary Return a deep copy of `val`.
    * @locus Anywhere
    * @param {EJSON} val A value to copy.
    */

EJSON.clone = v => {
  let ret;

  if (typeof v !== 'object') {
    return v;
  }

  if (v === null) {
    return null; // null has typeof "object"
  }

  if (v instanceof Date) {
    return new Date(v.getTime());
  } // RegExps are not really EJSON elements (eg we don't define a serialization
  // for them), but they're immutable anyway, so we can support them in clone.


  if (v instanceof RegExp) {
    return v;
  }

  if (EJSON.isBinary(v)) {
    ret = EJSON.newBinary(v.length);

    for (let i = 0; i < v.length; i++) {
      ret[i] = v[i];
    }

    return ret;
  }

  if (Array.isArray(v)) {
    return v.map(value => EJSON.clone(value));
  }

  if (isArguments(v)) {
    return Array.from(v).map(value => EJSON.clone(value));
  } // handle general user-defined typed Objects if they have a clone method


  if (typeof v.clone === 'function') {
    return v.clone();
  } // handle other custom types


  if (EJSON._isCustomType(v)) {
    return EJSON.fromJSONValue(EJSON.clone(EJSON.toJSONValue(v)), true);
  } // handle other objects


  ret = {};
  Object.keys(v).forEach(key => {
    ret[key] = EJSON.clone(v[key]);
  });
  return ret;
}; /**
    * @summary Allocate a new buffer of binary data that EJSON can serialize.
    * @locus Anywhere
    * @param {Number} size The number of bytes of binary data to allocate.
    */ // EJSON.newBinary is the public documented API for this functionality,
// but the implementation is in the 'base64' package to avoid
// introducing a circular dependency. (If the implementation were here,
// then 'base64' would have to use EJSON.newBinary, and 'ejson' would
// also have to use 'base64'.)


EJSON.newBinary = Base64.newBinary;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"stringify.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/ejson/stringify.js                                                                                    //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
// Based on json2.js from https://github.com/douglascrockford/JSON-js
//
//    json2.js
//    2012-10-08
//
//    Public Domain.
//
//    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
function quote(string) {
  return JSON.stringify(string);
}

const str = (key, holder, singleIndent, outerIndent, canonical) => {
  const value = holder[key]; // What happens next depends on the value's type.

  switch (typeof value) {
    case 'string':
      return quote(value);

    case 'number':
      // JSON numbers must be finite. Encode non-finite numbers as null.
      return isFinite(value) ? String(value) : 'null';

    case 'boolean':
      return String(value);
    // If the type is 'object', we might be dealing with an object or an array or
    // null.

    case 'object':
      // Due to a specification blunder in ECMAScript, typeof null is 'object',
      // so watch out for that case.
      if (!value) {
        return 'null';
      } // Make an array to hold the partial results of stringifying this object
      // value.


      const innerIndent = outerIndent + singleIndent;
      const partial = []; // Is the value an array?

      if (Array.isArray(value) || {}.hasOwnProperty.call(value, 'callee')) {
        // The value is an array. Stringify every element. Use null as a
        // placeholder for non-JSON values.
        const length = value.length;

        for (let i = 0; i < length; i += 1) {
          partial[i] = str(i, value, singleIndent, innerIndent, canonical) || 'null';
        } // Join all of the elements together, separated with commas, and wrap
        // them in brackets.


        let v;

        if (partial.length === 0) {
          v = '[]';
        } else if (innerIndent) {
          v = '[\n' + innerIndent + partial.join(',\n' + innerIndent) + '\n' + outerIndent + ']';
        } else {
          v = '[' + partial.join(',') + ']';
        }

        return v;
      } // Iterate through all of the keys in the object.


      let keys = Object.keys(value);

      if (canonical) {
        keys = keys.sort();
      }

      keys.forEach(k => {
        v = str(k, value, singleIndent, innerIndent, canonical);

        if (v) {
          partial.push(quote(k) + (innerIndent ? ': ' : ':') + v);
        }
      }); // Join all of the member texts together, separated with commas,
      // and wrap them in braces.

      if (partial.length === 0) {
        v = '{}';
      } else if (innerIndent) {
        v = '{\n' + innerIndent + partial.join(',\n' + innerIndent) + '\n' + outerIndent + '}';
      } else {
        v = '{' + partial.join(',') + '}';
      }

      return v;

    default: // Do nothing
  }
}; // If the JSON object does not yet have a stringify method, give it one.


const canonicalStringify = (value, options) => {
  // Make a fake root object containing our value under the key of ''.
  // Return the result of stringifying the value.
  const allOptions = Object.assign({
    indent: '',
    canonical: false
  }, options);

  if (allOptions.indent === true) {
    allOptions.indent = '  ';
  } else if (typeof allOptions.indent === 'number') {
    let newIndent = '';

    for (let i = 0; i < allOptions.indent; i++) {
      newIndent += ' ';
    }

    allOptions.indent = newIndent;
  }

  return str('', {
    '': value
  }, allOptions.indent, '', allOptions.canonical);
};

module.exportDefault(canonicalStringify);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/ejson/ejson.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.ejson = exports, {
  EJSON: EJSON
});

})();

//# sourceURL=meteor://💻app/packages/ejson.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZWpzb24vZWpzb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2Vqc29uL3N0cmluZ2lmeS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJFSlNPTiIsImN1c3RvbVR5cGVzIiwiaGFzT3duIiwib2JqIiwicHJvcCIsImhhc093blByb3BlcnR5IiwiY2FsbCIsImlzQXJndW1lbnRzIiwiaXNJbmZPck5hbiIsIk51bWJlciIsImlzTmFOIiwiSW5maW5pdHkiLCJhZGRUeXBlIiwibmFtZSIsImZhY3RvcnkiLCJFcnJvciIsImJ1aWx0aW5Db252ZXJ0ZXJzIiwibWF0Y2hKU09OVmFsdWUiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwibWF0Y2hPYmplY3QiLCJEYXRlIiwidG9KU09OVmFsdWUiLCIkZGF0ZSIsImdldFRpbWUiLCJmcm9tSlNPTlZhbHVlIiwiUmVnRXhwIiwicmVnZXhwIiwiJHJlZ2V4cCIsInNvdXJjZSIsIiRmbGFncyIsImZsYWdzIiwic2xpY2UiLCJyZXBsYWNlIiwic2lnbiIsIiRJbmZOYU4iLCJVaW50OEFycmF5IiwiJGJpbmFyeSIsIkJhc2U2NCIsImVuY29kZSIsImRlY29kZSIsIm1hdGNoIiwia2V5Q291bnQiLCJzb21lIiwiY29udmVydGVyIiwibmV3T2JqIiwiZm9yRWFjaCIsImtleSIsIiRlc2NhcGUiLCJfaXNDdXN0b21UeXBlIiwianNvblZhbHVlIiwiTWV0ZW9yIiwiX25vWWllbGRzQWxsb3dlZCIsIiR0eXBlIiwidHlwZU5hbWUiLCIkdmFsdWUiLCJfZ2V0VHlwZXMiLCJfZ2V0Q29udmVydGVycyIsInRvSlNPTlZhbHVlSGVscGVyIiwiaXRlbSIsImkiLCJ1bmRlZmluZWQiLCJhZGp1c3RUeXBlc1RvSlNPTlZhbHVlIiwibWF5YmVDaGFuZ2VkIiwidmFsdWUiLCJjaGFuZ2VkIiwiX2FkanVzdFR5cGVzVG9KU09OVmFsdWUiLCJuZXdJdGVtIiwiY2xvbmUiLCJmcm9tSlNPTlZhbHVlSGVscGVyIiwiZXZlcnkiLCJrIiwic3Vic3RyIiwiYWRqdXN0VHlwZXNGcm9tSlNPTlZhbHVlIiwiX2FkanVzdFR5cGVzRnJvbUpTT05WYWx1ZSIsInN0cmluZ2lmeSIsIm9wdGlvbnMiLCJzZXJpYWxpemVkIiwianNvbiIsImNhbm9uaWNhbCIsImluZGVudCIsImNhbm9uaWNhbFN0cmluZ2lmeSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiSlNPTiIsInBhcnNlIiwiaXNCaW5hcnkiLCIkVWludDhBcnJheVBvbHlmaWxsIiwiZXF1YWxzIiwiYSIsImIiLCJrZXlPcmRlclNlbnNpdGl2ZSIsInZhbHVlT2YiLCJBcnJheSIsInJldCIsImFLZXlzIiwiYktleXMiLCJuZXdCaW5hcnkiLCJpc0FycmF5IiwibWFwIiwiZnJvbSIsInF1b3RlIiwic3RyaW5nIiwic3RyIiwiaG9sZGVyIiwic2luZ2xlSW5kZW50Iiwib3V0ZXJJbmRlbnQiLCJpc0Zpbml0ZSIsIlN0cmluZyIsImlubmVySW5kZW50IiwicGFydGlhbCIsImpvaW4iLCJzb3J0IiwicHVzaCIsImFsbE9wdGlvbnMiLCJhc3NpZ24iLCJuZXdJbmRlbnQiLCJleHBvcnREZWZhdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsU0FBTSxNQUFJQTtBQUFYLENBQWQ7QUFBQTs7O0dBSUEsTUFBTUEsUUFBUSxFQUFkLEMsQ0FFQTtBQUNBOzs7Ozs7SUFRQTs7Ozs7Ozs7UUFVQTs7Ozs7O1lBUUE7Ozs7Ozs7Z0JBU0E7Ozs7Ozs7OztBQVVBLE1BQU1DLGNBQWMsRUFBcEI7O0FBRUEsTUFBTUMsU0FBUyxDQUFDQyxHQUFELEVBQU1DLElBQU4sS0FBZSxDQUFDLEVBQUQsRUFBS0MsY0FBTCxDQUFvQkMsSUFBcEIsQ0FBeUJILEdBQXpCLEVBQThCQyxJQUE5QixDQUE5Qjs7QUFFQSxNQUFNRyxjQUFjSixPQUFPQSxPQUFPLElBQVAsSUFBZUQsT0FBT0MsR0FBUCxFQUFZLFFBQVosQ0FBMUM7O0FBRUEsTUFBTUssYUFDSkwsT0FBT00sT0FBT0MsS0FBUCxDQUFhUCxHQUFiLEtBQXFCQSxRQUFRUSxRQUE3QixJQUF5Q1IsUUFBUSxDQUFDUSxRQUQzRCxDLENBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7OztBQVdBWCxNQUFNWSxPQUFOLEdBQWdCLENBQUNDLElBQUQsRUFBT0MsT0FBUCxLQUFtQjtBQUNqQyxNQUFJWixPQUFPRCxXQUFQLEVBQW9CWSxJQUFwQixDQUFKLEVBQStCO0FBQzdCLFVBQU0sSUFBSUUsS0FBSixDQUFXLFFBQU9GLElBQUssa0JBQXZCLENBQU47QUFDRDs7QUFDRFosY0FBWVksSUFBWixJQUFvQkMsT0FBcEI7QUFDRCxDQUxEOztBQU9BLE1BQU1FLG9CQUFvQixDQUN4QjtBQUFFO0FBQ0FDLGlCQUFlZCxHQUFmLEVBQW9CO0FBQ2xCLFdBQU9ELE9BQU9DLEdBQVAsRUFBWSxPQUFaLEtBQXdCZSxPQUFPQyxJQUFQLENBQVloQixHQUFaLEVBQWlCaUIsTUFBakIsS0FBNEIsQ0FBM0Q7QUFDRCxHQUhIOztBQUlFQyxjQUFZbEIsR0FBWixFQUFpQjtBQUNmLFdBQU9BLGVBQWVtQixJQUF0QjtBQUNELEdBTkg7O0FBT0VDLGNBQVlwQixHQUFaLEVBQWlCO0FBQ2YsV0FBTztBQUFDcUIsYUFBT3JCLElBQUlzQixPQUFKO0FBQVIsS0FBUDtBQUNELEdBVEg7O0FBVUVDLGdCQUFjdkIsR0FBZCxFQUFtQjtBQUNqQixXQUFPLElBQUltQixJQUFKLENBQVNuQixJQUFJcUIsS0FBYixDQUFQO0FBQ0Q7O0FBWkgsQ0FEd0IsRUFleEI7QUFBRTtBQUNBUCxpQkFBZWQsR0FBZixFQUFvQjtBQUNsQixXQUFPRCxPQUFPQyxHQUFQLEVBQVksU0FBWixLQUNGRCxPQUFPQyxHQUFQLEVBQVksUUFBWixDQURFLElBRUZlLE9BQU9DLElBQVAsQ0FBWWhCLEdBQVosRUFBaUJpQixNQUFqQixLQUE0QixDQUZqQztBQUdELEdBTEg7O0FBTUVDLGNBQVlsQixHQUFaLEVBQWlCO0FBQ2YsV0FBT0EsZUFBZXdCLE1BQXRCO0FBQ0QsR0FSSDs7QUFTRUosY0FBWUssTUFBWixFQUFvQjtBQUNsQixXQUFPO0FBQ0xDLGVBQVNELE9BQU9FLE1BRFg7QUFFTEMsY0FBUUgsT0FBT0k7QUFGVixLQUFQO0FBSUQsR0FkSDs7QUFlRU4sZ0JBQWN2QixHQUFkLEVBQW1CO0FBQ2pCO0FBQ0EsV0FBTyxJQUFJd0IsTUFBSixDQUNMeEIsSUFBSTBCLE9BREMsRUFFTDFCLElBQUk0QixNQUFKLENBQ0U7QUFERixLQUVHRSxLQUZILENBRVMsQ0FGVCxFQUVZLEVBRlosRUFHR0MsT0FISCxDQUdXLFdBSFgsRUFHdUIsRUFIdkIsRUFJR0EsT0FKSCxDQUlXLGNBSlgsRUFJMkIsRUFKM0IsQ0FGSyxDQUFQO0FBUUQ7O0FBekJILENBZndCLEVBMEN4QjtBQUFFO0FBQ0E7QUFDQWpCLGlCQUFlZCxHQUFmLEVBQW9CO0FBQ2xCLFdBQU9ELE9BQU9DLEdBQVAsRUFBWSxTQUFaLEtBQTBCZSxPQUFPQyxJQUFQLENBQVloQixHQUFaLEVBQWlCaUIsTUFBakIsS0FBNEIsQ0FBN0Q7QUFDRCxHQUpIOztBQUtFQyxlQUFhYixVQUxmOztBQU1FZSxjQUFZcEIsR0FBWixFQUFpQjtBQUNmLFFBQUlnQyxJQUFKOztBQUNBLFFBQUkxQixPQUFPQyxLQUFQLENBQWFQLEdBQWIsQ0FBSixFQUF1QjtBQUNyQmdDLGFBQU8sQ0FBUDtBQUNELEtBRkQsTUFFTyxJQUFJaEMsUUFBUVEsUUFBWixFQUFzQjtBQUMzQndCLGFBQU8sQ0FBUDtBQUNELEtBRk0sTUFFQTtBQUNMQSxhQUFPLENBQUMsQ0FBUjtBQUNEOztBQUNELFdBQU87QUFBQ0MsZUFBU0Q7QUFBVixLQUFQO0FBQ0QsR0FoQkg7O0FBaUJFVCxnQkFBY3ZCLEdBQWQsRUFBbUI7QUFDakIsV0FBT0EsSUFBSWlDLE9BQUosR0FBYyxDQUFyQjtBQUNEOztBQW5CSCxDQTFDd0IsRUErRHhCO0FBQUU7QUFDQW5CLGlCQUFlZCxHQUFmLEVBQW9CO0FBQ2xCLFdBQU9ELE9BQU9DLEdBQVAsRUFBWSxTQUFaLEtBQTBCZSxPQUFPQyxJQUFQLENBQVloQixHQUFaLEVBQWlCaUIsTUFBakIsS0FBNEIsQ0FBN0Q7QUFDRCxHQUhIOztBQUlFQyxjQUFZbEIsR0FBWixFQUFpQjtBQUNmLFdBQU8sT0FBT2tDLFVBQVAsS0FBc0IsV0FBdEIsSUFBcUNsQyxlQUFla0MsVUFBcEQsSUFDRGxDLE9BQU9ELE9BQU9DLEdBQVAsRUFBWSxxQkFBWixDQURiO0FBRUQsR0FQSDs7QUFRRW9CLGNBQVlwQixHQUFaLEVBQWlCO0FBQ2YsV0FBTztBQUFDbUMsZUFBU0MsT0FBT0MsTUFBUCxDQUFjckMsR0FBZDtBQUFWLEtBQVA7QUFDRCxHQVZIOztBQVdFdUIsZ0JBQWN2QixHQUFkLEVBQW1CO0FBQ2pCLFdBQU9vQyxPQUFPRSxNQUFQLENBQWN0QyxJQUFJbUMsT0FBbEIsQ0FBUDtBQUNEOztBQWJILENBL0R3QixFQThFeEI7QUFBRTtBQUNBckIsaUJBQWVkLEdBQWYsRUFBb0I7QUFDbEIsV0FBT0QsT0FBT0MsR0FBUCxFQUFZLFNBQVosS0FBMEJlLE9BQU9DLElBQVAsQ0FBWWhCLEdBQVosRUFBaUJpQixNQUFqQixLQUE0QixDQUE3RDtBQUNELEdBSEg7O0FBSUVDLGNBQVlsQixHQUFaLEVBQWlCO0FBQ2YsUUFBSXVDLFFBQVEsS0FBWjs7QUFDQSxRQUFJdkMsR0FBSixFQUFTO0FBQ1AsWUFBTXdDLFdBQVd6QixPQUFPQyxJQUFQLENBQVloQixHQUFaLEVBQWlCaUIsTUFBbEM7O0FBQ0EsVUFBSXVCLGFBQWEsQ0FBYixJQUFrQkEsYUFBYSxDQUFuQyxFQUFzQztBQUNwQ0QsZ0JBQ0UxQixrQkFBa0I0QixJQUFsQixDQUF1QkMsYUFBYUEsVUFBVTVCLGNBQVYsQ0FBeUJkLEdBQXpCLENBQXBDLENBREY7QUFFRDtBQUNGOztBQUNELFdBQU91QyxLQUFQO0FBQ0QsR0FkSDs7QUFlRW5CLGNBQVlwQixHQUFaLEVBQWlCO0FBQ2YsVUFBTTJDLFNBQVMsRUFBZjtBQUNBNUIsV0FBT0MsSUFBUCxDQUFZaEIsR0FBWixFQUFpQjRDLE9BQWpCLENBQXlCQyxPQUFPO0FBQzlCRixhQUFPRSxHQUFQLElBQWNoRCxNQUFNdUIsV0FBTixDQUFrQnBCLElBQUk2QyxHQUFKLENBQWxCLENBQWQ7QUFDRCxLQUZEO0FBR0EsV0FBTztBQUFDQyxlQUFTSDtBQUFWLEtBQVA7QUFDRCxHQXJCSDs7QUFzQkVwQixnQkFBY3ZCLEdBQWQsRUFBbUI7QUFDakIsVUFBTTJDLFNBQVMsRUFBZjtBQUNBNUIsV0FBT0MsSUFBUCxDQUFZaEIsSUFBSThDLE9BQWhCLEVBQXlCRixPQUF6QixDQUFpQ0MsT0FBTztBQUN0Q0YsYUFBT0UsR0FBUCxJQUFjaEQsTUFBTTBCLGFBQU4sQ0FBb0J2QixJQUFJOEMsT0FBSixDQUFZRCxHQUFaLENBQXBCLENBQWQ7QUFDRCxLQUZEO0FBR0EsV0FBT0YsTUFBUDtBQUNEOztBQTVCSCxDQTlFd0IsRUE0R3hCO0FBQUU7QUFDQTdCLGlCQUFlZCxHQUFmLEVBQW9CO0FBQ2xCLFdBQU9ELE9BQU9DLEdBQVAsRUFBWSxPQUFaLEtBQ0ZELE9BQU9DLEdBQVAsRUFBWSxRQUFaLENBREUsSUFDdUJlLE9BQU9DLElBQVAsQ0FBWWhCLEdBQVosRUFBaUJpQixNQUFqQixLQUE0QixDQUQxRDtBQUVELEdBSkg7O0FBS0VDLGNBQVlsQixHQUFaLEVBQWlCO0FBQ2YsV0FBT0gsTUFBTWtELGFBQU4sQ0FBb0IvQyxHQUFwQixDQUFQO0FBQ0QsR0FQSDs7QUFRRW9CLGNBQVlwQixHQUFaLEVBQWlCO0FBQ2YsVUFBTWdELFlBQVlDLE9BQU9DLGdCQUFQLENBQXdCLE1BQU1sRCxJQUFJb0IsV0FBSixFQUE5QixDQUFsQjs7QUFDQSxXQUFPO0FBQUMrQixhQUFPbkQsSUFBSW9ELFFBQUosRUFBUjtBQUF3QkMsY0FBUUw7QUFBaEMsS0FBUDtBQUNELEdBWEg7O0FBWUV6QixnQkFBY3ZCLEdBQWQsRUFBbUI7QUFDakIsVUFBTW9ELFdBQVdwRCxJQUFJbUQsS0FBckI7O0FBQ0EsUUFBSSxDQUFDcEQsT0FBT0QsV0FBUCxFQUFvQnNELFFBQXBCLENBQUwsRUFBb0M7QUFDbEMsWUFBTSxJQUFJeEMsS0FBSixDQUFXLHFCQUFvQndDLFFBQVMsaUJBQXhDLENBQU47QUFDRDs7QUFDRCxVQUFNVixZQUFZNUMsWUFBWXNELFFBQVosQ0FBbEI7QUFDQSxXQUFPSCxPQUFPQyxnQkFBUCxDQUF3QixNQUFNUixVQUFVMUMsSUFBSXFELE1BQWQsQ0FBOUIsQ0FBUDtBQUNEOztBQW5CSCxDQTVHd0IsQ0FBMUI7O0FBbUlBeEQsTUFBTWtELGFBQU4sR0FBdUIvQyxHQUFELElBQ3BCQSxPQUNBLE9BQU9BLElBQUlvQixXQUFYLEtBQTJCLFVBRDNCLElBRUEsT0FBT3BCLElBQUlvRCxRQUFYLEtBQXdCLFVBRnhCLElBR0FyRCxPQUFPRCxXQUFQLEVBQW9CRSxJQUFJb0QsUUFBSixFQUFwQixDQUpGOztBQU9BdkQsTUFBTXlELFNBQU4sR0FBa0IsTUFBTXhELFdBQXhCOztBQUVBRCxNQUFNMEQsY0FBTixHQUF1QixNQUFNMUMsaUJBQTdCLEMsQ0FFQTtBQUNBOzs7QUFDQSxNQUFNMkMsb0JBQW9CQyxRQUFRO0FBQ2hDLE9BQUssSUFBSUMsSUFBSSxDQUFiLEVBQWdCQSxJQUFJN0Msa0JBQWtCSSxNQUF0QyxFQUE4Q3lDLEdBQTlDLEVBQW1EO0FBQ2pELFVBQU1oQixZQUFZN0Isa0JBQWtCNkMsQ0FBbEIsQ0FBbEI7O0FBQ0EsUUFBSWhCLFVBQVV4QixXQUFWLENBQXNCdUMsSUFBdEIsQ0FBSixFQUFpQztBQUMvQixhQUFPZixVQUFVdEIsV0FBVixDQUFzQnFDLElBQXRCLENBQVA7QUFDRDtBQUNGOztBQUNELFNBQU9FLFNBQVA7QUFDRCxDQVJELEMsQ0FVQTs7O0FBQ0EsTUFBTUMseUJBQXlCNUQsT0FBTztBQUNwQztBQUNBLE1BQUlBLFFBQVEsSUFBWixFQUFrQjtBQUNoQixXQUFPLElBQVA7QUFDRDs7QUFFRCxRQUFNNkQsZUFBZUwsa0JBQWtCeEQsR0FBbEIsQ0FBckI7O0FBQ0EsTUFBSTZELGlCQUFpQkYsU0FBckIsRUFBZ0M7QUFDOUIsV0FBT0UsWUFBUDtBQUNELEdBVG1DLENBV3BDOzs7QUFDQSxNQUFJLE9BQU83RCxHQUFQLEtBQWUsUUFBbkIsRUFBNkI7QUFDM0IsV0FBT0EsR0FBUDtBQUNELEdBZG1DLENBZ0JwQzs7O0FBQ0FlLFNBQU9DLElBQVAsQ0FBWWhCLEdBQVosRUFBaUI0QyxPQUFqQixDQUF5QkMsT0FBTztBQUM5QixVQUFNaUIsUUFBUTlELElBQUk2QyxHQUFKLENBQWQ7O0FBQ0EsUUFBSSxPQUFPaUIsS0FBUCxLQUFpQixRQUFqQixJQUE2QkEsVUFBVUgsU0FBdkMsSUFDQSxDQUFDdEQsV0FBV3lELEtBQVgsQ0FETCxFQUN3QjtBQUN0QixhQURzQixDQUNkO0FBQ1Q7O0FBRUQsVUFBTUMsVUFBVVAsa0JBQWtCTSxLQUFsQixDQUFoQjs7QUFDQSxRQUFJQyxPQUFKLEVBQWE7QUFDWC9ELFVBQUk2QyxHQUFKLElBQVdrQixPQUFYO0FBQ0EsYUFGVyxDQUVIO0FBQ1QsS0FYNkIsQ0FZOUI7QUFDQTs7O0FBQ0FILDJCQUF1QkUsS0FBdkI7QUFDRCxHQWZEO0FBZ0JBLFNBQU85RCxHQUFQO0FBQ0QsQ0FsQ0Q7O0FBb0NBSCxNQUFNbUUsdUJBQU4sR0FBZ0NKLHNCQUFoQyxDLENBRUE7Ozs7Ozs7QUFNQS9ELE1BQU11QixXQUFOLEdBQW9CcUMsUUFBUTtBQUMxQixRQUFNTSxVQUFVUCxrQkFBa0JDLElBQWxCLENBQWhCOztBQUNBLE1BQUlNLFlBQVlKLFNBQWhCLEVBQTJCO0FBQ3pCLFdBQU9JLE9BQVA7QUFDRDs7QUFFRCxNQUFJRSxVQUFVUixJQUFkOztBQUNBLE1BQUksT0FBT0EsSUFBUCxLQUFnQixRQUFwQixFQUE4QjtBQUM1QlEsY0FBVXBFLE1BQU1xRSxLQUFOLENBQVlULElBQVosQ0FBVjtBQUNBRywyQkFBdUJLLE9BQXZCO0FBQ0Q7O0FBQ0QsU0FBT0EsT0FBUDtBQUNELENBWkQsQyxDQWNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQSxNQUFNRSxzQkFBc0JMLFNBQVM7QUFDbkMsTUFBSSxPQUFPQSxLQUFQLEtBQWlCLFFBQWpCLElBQTZCQSxVQUFVLElBQTNDLEVBQWlEO0FBQy9DLFVBQU05QyxPQUFPRCxPQUFPQyxJQUFQLENBQVk4QyxLQUFaLENBQWI7O0FBQ0EsUUFBSTlDLEtBQUtDLE1BQUwsSUFBZSxDQUFmLElBQ0dELEtBQUtvRCxLQUFMLENBQVdDLEtBQUssT0FBT0EsQ0FBUCxLQUFhLFFBQWIsSUFBeUJBLEVBQUVDLE1BQUYsQ0FBUyxDQUFULEVBQVksQ0FBWixNQUFtQixHQUE1RCxDQURQLEVBQ3lFO0FBQ3ZFLFdBQUssSUFBSVosSUFBSSxDQUFiLEVBQWdCQSxJQUFJN0Msa0JBQWtCSSxNQUF0QyxFQUE4Q3lDLEdBQTlDLEVBQW1EO0FBQ2pELGNBQU1oQixZQUFZN0Isa0JBQWtCNkMsQ0FBbEIsQ0FBbEI7O0FBQ0EsWUFBSWhCLFVBQVU1QixjQUFWLENBQXlCZ0QsS0FBekIsQ0FBSixFQUFxQztBQUNuQyxpQkFBT3BCLFVBQVVuQixhQUFWLENBQXdCdUMsS0FBeEIsQ0FBUDtBQUNEO0FBQ0Y7QUFDRjtBQUNGOztBQUNELFNBQU9BLEtBQVA7QUFDRCxDQWRELEMsQ0FnQkE7QUFDQTtBQUNBOzs7QUFDQSxNQUFNUywyQkFBMkJ2RSxPQUFPO0FBQ3RDLE1BQUlBLFFBQVEsSUFBWixFQUFrQjtBQUNoQixXQUFPLElBQVA7QUFDRDs7QUFFRCxRQUFNNkQsZUFBZU0sb0JBQW9CbkUsR0FBcEIsQ0FBckI7O0FBQ0EsTUFBSTZELGlCQUFpQjdELEdBQXJCLEVBQTBCO0FBQ3hCLFdBQU82RCxZQUFQO0FBQ0QsR0FScUMsQ0FVdEM7OztBQUNBLE1BQUksT0FBTzdELEdBQVAsS0FBZSxRQUFuQixFQUE2QjtBQUMzQixXQUFPQSxHQUFQO0FBQ0Q7O0FBRURlLFNBQU9DLElBQVAsQ0FBWWhCLEdBQVosRUFBaUI0QyxPQUFqQixDQUF5QkMsT0FBTztBQUM5QixVQUFNaUIsUUFBUTlELElBQUk2QyxHQUFKLENBQWQ7O0FBQ0EsUUFBSSxPQUFPaUIsS0FBUCxLQUFpQixRQUFyQixFQUErQjtBQUM3QixZQUFNQyxVQUFVSSxvQkFBb0JMLEtBQXBCLENBQWhCOztBQUNBLFVBQUlBLFVBQVVDLE9BQWQsRUFBdUI7QUFDckIvRCxZQUFJNkMsR0FBSixJQUFXa0IsT0FBWDtBQUNBO0FBQ0QsT0FMNEIsQ0FNN0I7QUFDQTs7O0FBQ0FRLCtCQUF5QlQsS0FBekI7QUFDRDtBQUNGLEdBWkQ7QUFhQSxTQUFPOUQsR0FBUDtBQUNELENBN0JEOztBQStCQUgsTUFBTTJFLHlCQUFOLEdBQWtDRCx3QkFBbEMsQyxDQUVBOzs7Ozs7QUFLQTFFLE1BQU0wQixhQUFOLEdBQXNCa0MsUUFBUTtBQUM1QixNQUFJTSxVQUFVSSxvQkFBb0JWLElBQXBCLENBQWQ7O0FBQ0EsTUFBSU0sWUFBWU4sSUFBWixJQUFvQixPQUFPQSxJQUFQLEtBQWdCLFFBQXhDLEVBQWtEO0FBQ2hETSxjQUFVbEUsTUFBTXFFLEtBQU4sQ0FBWVQsSUFBWixDQUFWO0FBQ0FjLDZCQUF5QlIsT0FBekI7QUFDRDs7QUFDRCxTQUFPQSxPQUFQO0FBQ0QsQ0FQRCxDLENBU0E7Ozs7Ozs7Ozs7Ozs7OztBQWNBbEUsTUFBTTRFLFNBQU4sR0FBa0IsQ0FBQ2hCLElBQUQsRUFBT2lCLE9BQVAsS0FBbUI7QUFDbkMsTUFBSUMsVUFBSjtBQUNBLFFBQU1DLE9BQU8vRSxNQUFNdUIsV0FBTixDQUFrQnFDLElBQWxCLENBQWI7O0FBQ0EsTUFBSWlCLFlBQVlBLFFBQVFHLFNBQVIsSUFBcUJILFFBQVFJLE1BQXpDLENBQUosRUFBc0Q7QUF2WXhELFFBQUlDLGtCQUFKO0FBQXVCcEYsV0FBT3FGLEtBQVAsQ0FBYUMsUUFBUSxhQUFSLENBQWIsRUFBb0M7QUFBQ0MsY0FBUUMsQ0FBUixFQUFVO0FBQUNKLDZCQUFtQkksQ0FBbkI7QUFBcUI7O0FBQWpDLEtBQXBDLEVBQXVFLENBQXZFO0FBeVluQlIsaUJBQWFJLG1CQUFtQkgsSUFBbkIsRUFBeUJGLE9BQXpCLENBQWI7QUFDRCxHQUhELE1BR087QUFDTEMsaUJBQWFTLEtBQUtYLFNBQUwsQ0FBZUcsSUFBZixDQUFiO0FBQ0Q7O0FBQ0QsU0FBT0QsVUFBUDtBQUNELENBVkQsQyxDQVlBOzs7Ozs7O0FBTUE5RSxNQUFNd0YsS0FBTixHQUFjNUIsUUFBUTtBQUNwQixNQUFJLE9BQU9BLElBQVAsS0FBZ0IsUUFBcEIsRUFBOEI7QUFDNUIsVUFBTSxJQUFJN0MsS0FBSixDQUFVLHlDQUFWLENBQU47QUFDRDs7QUFDRCxTQUFPZixNQUFNMEIsYUFBTixDQUFvQjZELEtBQUtDLEtBQUwsQ0FBVzVCLElBQVgsQ0FBcEIsQ0FBUDtBQUNELENBTEQsQyxDQU9BOzs7Ozs7O0FBTUE1RCxNQUFNeUYsUUFBTixHQUFpQnRGLE9BQU87QUFDdEIsU0FBTyxDQUFDLEVBQUcsT0FBT2tDLFVBQVAsS0FBc0IsV0FBdEIsSUFBcUNsQyxlQUFla0MsVUFBckQsSUFDUGxDLE9BQU9BLElBQUl1RixtQkFETixDQUFSO0FBRUQsQ0FIRCxDLENBS0E7Ozs7Ozs7Ozs7Ozs7O0FBYUExRixNQUFNMkYsTUFBTixHQUFlLENBQUNDLENBQUQsRUFBSUMsQ0FBSixFQUFPaEIsT0FBUCxLQUFtQjtBQUNoQyxNQUFJaEIsQ0FBSjtBQUNBLFFBQU1pQyxvQkFBb0IsQ0FBQyxFQUFFakIsV0FBV0EsUUFBUWlCLGlCQUFyQixDQUEzQjs7QUFDQSxNQUFJRixNQUFNQyxDQUFWLEVBQWE7QUFDWCxXQUFPLElBQVA7QUFDRCxHQUwrQixDQU9oQztBQUNBOzs7QUFDQSxNQUFJcEYsT0FBT0MsS0FBUCxDQUFha0YsQ0FBYixLQUFtQm5GLE9BQU9DLEtBQVAsQ0FBYW1GLENBQWIsQ0FBdkIsRUFBd0M7QUFDdEMsV0FBTyxJQUFQO0FBQ0QsR0FYK0IsQ0FhaEM7OztBQUNBLE1BQUksQ0FBQ0QsQ0FBRCxJQUFNLENBQUNDLENBQVgsRUFBYztBQUNaLFdBQU8sS0FBUDtBQUNEOztBQUVELE1BQUksRUFBRSxPQUFPRCxDQUFQLEtBQWEsUUFBYixJQUF5QixPQUFPQyxDQUFQLEtBQWEsUUFBeEMsQ0FBSixFQUF1RDtBQUNyRCxXQUFPLEtBQVA7QUFDRDs7QUFFRCxNQUFJRCxhQUFhdEUsSUFBYixJQUFxQnVFLGFBQWF2RSxJQUF0QyxFQUE0QztBQUMxQyxXQUFPc0UsRUFBRUcsT0FBRixPQUFnQkYsRUFBRUUsT0FBRixFQUF2QjtBQUNEOztBQUVELE1BQUkvRixNQUFNeUYsUUFBTixDQUFlRyxDQUFmLEtBQXFCNUYsTUFBTXlGLFFBQU4sQ0FBZUksQ0FBZixDQUF6QixFQUE0QztBQUMxQyxRQUFJRCxFQUFFeEUsTUFBRixLQUFheUUsRUFBRXpFLE1BQW5CLEVBQTJCO0FBQ3pCLGFBQU8sS0FBUDtBQUNEOztBQUNELFNBQUt5QyxJQUFJLENBQVQsRUFBWUEsSUFBSStCLEVBQUV4RSxNQUFsQixFQUEwQnlDLEdBQTFCLEVBQStCO0FBQzdCLFVBQUkrQixFQUFFL0IsQ0FBRixNQUFTZ0MsRUFBRWhDLENBQUYsQ0FBYixFQUFtQjtBQUNqQixlQUFPLEtBQVA7QUFDRDtBQUNGOztBQUNELFdBQU8sSUFBUDtBQUNEOztBQUVELE1BQUksT0FBUStCLEVBQUVELE1BQVYsS0FBc0IsVUFBMUIsRUFBc0M7QUFDcEMsV0FBT0MsRUFBRUQsTUFBRixDQUFTRSxDQUFULEVBQVloQixPQUFaLENBQVA7QUFDRDs7QUFFRCxNQUFJLE9BQVFnQixFQUFFRixNQUFWLEtBQXNCLFVBQTFCLEVBQXNDO0FBQ3BDLFdBQU9FLEVBQUVGLE1BQUYsQ0FBU0MsQ0FBVCxFQUFZZixPQUFaLENBQVA7QUFDRDs7QUFFRCxNQUFJZSxhQUFhSSxLQUFqQixFQUF3QjtBQUN0QixRQUFJLEVBQUVILGFBQWFHLEtBQWYsQ0FBSixFQUEyQjtBQUN6QixhQUFPLEtBQVA7QUFDRDs7QUFDRCxRQUFJSixFQUFFeEUsTUFBRixLQUFheUUsRUFBRXpFLE1BQW5CLEVBQTJCO0FBQ3pCLGFBQU8sS0FBUDtBQUNEOztBQUNELFNBQUt5QyxJQUFJLENBQVQsRUFBWUEsSUFBSStCLEVBQUV4RSxNQUFsQixFQUEwQnlDLEdBQTFCLEVBQStCO0FBQzdCLFVBQUksQ0FBQzdELE1BQU0yRixNQUFOLENBQWFDLEVBQUUvQixDQUFGLENBQWIsRUFBbUJnQyxFQUFFaEMsQ0FBRixDQUFuQixFQUF5QmdCLE9BQXpCLENBQUwsRUFBd0M7QUFDdEMsZUFBTyxLQUFQO0FBQ0Q7QUFDRjs7QUFDRCxXQUFPLElBQVA7QUFDRCxHQTNEK0IsQ0E2RGhDOzs7QUFDQSxVQUFRN0UsTUFBTWtELGFBQU4sQ0FBb0IwQyxDQUFwQixJQUF5QjVGLE1BQU1rRCxhQUFOLENBQW9CMkMsQ0FBcEIsQ0FBakM7QUFDRSxTQUFLLENBQUw7QUFBUSxhQUFPLEtBQVA7O0FBQ1IsU0FBSyxDQUFMO0FBQVEsYUFBTzdGLE1BQU0yRixNQUFOLENBQWEzRixNQUFNdUIsV0FBTixDQUFrQnFFLENBQWxCLENBQWIsRUFBbUM1RixNQUFNdUIsV0FBTixDQUFrQnNFLENBQWxCLENBQW5DLENBQVA7O0FBQ1IsWUFIRixDQUdXO0FBSFgsR0E5RGdDLENBb0VoQzs7O0FBQ0EsTUFBSUksR0FBSjtBQUNBLFFBQU1DLFFBQVFoRixPQUFPQyxJQUFQLENBQVl5RSxDQUFaLENBQWQ7QUFDQSxRQUFNTyxRQUFRakYsT0FBT0MsSUFBUCxDQUFZMEUsQ0FBWixDQUFkOztBQUNBLE1BQUlDLGlCQUFKLEVBQXVCO0FBQ3JCakMsUUFBSSxDQUFKO0FBQ0FvQyxVQUFNQyxNQUFNM0IsS0FBTixDQUFZdkIsT0FBTztBQUN2QixVQUFJYSxLQUFLc0MsTUFBTS9FLE1BQWYsRUFBdUI7QUFDckIsZUFBTyxLQUFQO0FBQ0Q7O0FBQ0QsVUFBSTRCLFFBQVFtRCxNQUFNdEMsQ0FBTixDQUFaLEVBQXNCO0FBQ3BCLGVBQU8sS0FBUDtBQUNEOztBQUNELFVBQUksQ0FBQzdELE1BQU0yRixNQUFOLENBQWFDLEVBQUU1QyxHQUFGLENBQWIsRUFBcUI2QyxFQUFFTSxNQUFNdEMsQ0FBTixDQUFGLENBQXJCLEVBQWtDZ0IsT0FBbEMsQ0FBTCxFQUFpRDtBQUMvQyxlQUFPLEtBQVA7QUFDRDs7QUFDRGhCO0FBQ0EsYUFBTyxJQUFQO0FBQ0QsS0FaSyxDQUFOO0FBYUQsR0FmRCxNQWVPO0FBQ0xBLFFBQUksQ0FBSjtBQUNBb0MsVUFBTUMsTUFBTTNCLEtBQU4sQ0FBWXZCLE9BQU87QUFDdkIsVUFBSSxDQUFDOUMsT0FBTzJGLENBQVAsRUFBVTdDLEdBQVYsQ0FBTCxFQUFxQjtBQUNuQixlQUFPLEtBQVA7QUFDRDs7QUFDRCxVQUFJLENBQUNoRCxNQUFNMkYsTUFBTixDQUFhQyxFQUFFNUMsR0FBRixDQUFiLEVBQXFCNkMsRUFBRTdDLEdBQUYsQ0FBckIsRUFBNkI2QixPQUE3QixDQUFMLEVBQTRDO0FBQzFDLGVBQU8sS0FBUDtBQUNEOztBQUNEaEI7QUFDQSxhQUFPLElBQVA7QUFDRCxLQVRLLENBQU47QUFVRDs7QUFDRCxTQUFPb0MsT0FBT3BDLE1BQU1zQyxNQUFNL0UsTUFBMUI7QUFDRCxDQXJHRCxDLENBdUdBOzs7Ozs7QUFLQXBCLE1BQU1xRSxLQUFOLEdBQWNpQixLQUFLO0FBQ2pCLE1BQUlXLEdBQUo7O0FBQ0EsTUFBSSxPQUFPWCxDQUFQLEtBQWEsUUFBakIsRUFBMkI7QUFDekIsV0FBT0EsQ0FBUDtBQUNEOztBQUVELE1BQUlBLE1BQU0sSUFBVixFQUFnQjtBQUNkLFdBQU8sSUFBUCxDQURjLENBQ0Q7QUFDZDs7QUFFRCxNQUFJQSxhQUFhaEUsSUFBakIsRUFBdUI7QUFDckIsV0FBTyxJQUFJQSxJQUFKLENBQVNnRSxFQUFFN0QsT0FBRixFQUFULENBQVA7QUFDRCxHQVpnQixDQWNqQjtBQUNBOzs7QUFDQSxNQUFJNkQsYUFBYTNELE1BQWpCLEVBQXlCO0FBQ3ZCLFdBQU8yRCxDQUFQO0FBQ0Q7O0FBRUQsTUFBSXRGLE1BQU15RixRQUFOLENBQWVILENBQWYsQ0FBSixFQUF1QjtBQUNyQlcsVUFBTWpHLE1BQU1vRyxTQUFOLENBQWdCZCxFQUFFbEUsTUFBbEIsQ0FBTjs7QUFDQSxTQUFLLElBQUl5QyxJQUFJLENBQWIsRUFBZ0JBLElBQUl5QixFQUFFbEUsTUFBdEIsRUFBOEJ5QyxHQUE5QixFQUFtQztBQUNqQ29DLFVBQUlwQyxDQUFKLElBQVN5QixFQUFFekIsQ0FBRixDQUFUO0FBQ0Q7O0FBQ0QsV0FBT29DLEdBQVA7QUFDRDs7QUFFRCxNQUFJRCxNQUFNSyxPQUFOLENBQWNmLENBQWQsQ0FBSixFQUFzQjtBQUNwQixXQUFPQSxFQUFFZ0IsR0FBRixDQUFNckMsU0FBU2pFLE1BQU1xRSxLQUFOLENBQVlKLEtBQVosQ0FBZixDQUFQO0FBQ0Q7O0FBRUQsTUFBSTFELFlBQVkrRSxDQUFaLENBQUosRUFBb0I7QUFDbEIsV0FBT1UsTUFBTU8sSUFBTixDQUFXakIsQ0FBWCxFQUFjZ0IsR0FBZCxDQUFrQnJDLFNBQVNqRSxNQUFNcUUsS0FBTixDQUFZSixLQUFaLENBQTNCLENBQVA7QUFDRCxHQWxDZ0IsQ0FvQ2pCOzs7QUFDQSxNQUFJLE9BQU9xQixFQUFFakIsS0FBVCxLQUFtQixVQUF2QixFQUFtQztBQUNqQyxXQUFPaUIsRUFBRWpCLEtBQUYsRUFBUDtBQUNELEdBdkNnQixDQXlDakI7OztBQUNBLE1BQUlyRSxNQUFNa0QsYUFBTixDQUFvQm9DLENBQXBCLENBQUosRUFBNEI7QUFDMUIsV0FBT3RGLE1BQU0wQixhQUFOLENBQW9CMUIsTUFBTXFFLEtBQU4sQ0FBWXJFLE1BQU11QixXQUFOLENBQWtCK0QsQ0FBbEIsQ0FBWixDQUFwQixFQUF1RCxJQUF2RCxDQUFQO0FBQ0QsR0E1Q2dCLENBOENqQjs7O0FBQ0FXLFFBQU0sRUFBTjtBQUNBL0UsU0FBT0MsSUFBUCxDQUFZbUUsQ0FBWixFQUFldkMsT0FBZixDQUF3QkMsR0FBRCxJQUFTO0FBQzlCaUQsUUFBSWpELEdBQUosSUFBV2hELE1BQU1xRSxLQUFOLENBQVlpQixFQUFFdEMsR0FBRixDQUFaLENBQVg7QUFDRCxHQUZEO0FBR0EsU0FBT2lELEdBQVA7QUFDRCxDQXBERCxDLENBc0RBOzs7O09BS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FqRyxNQUFNb0csU0FBTixHQUFrQjdELE9BQU82RCxTQUF6QixDOzs7Ozs7Ozs7OztBQ2ptQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBLFNBQVNJLEtBQVQsQ0FBZUMsTUFBZixFQUF1QjtBQUNyQixTQUFPbEIsS0FBS1gsU0FBTCxDQUFlNkIsTUFBZixDQUFQO0FBQ0Q7O0FBRUQsTUFBTUMsTUFBTSxDQUFDMUQsR0FBRCxFQUFNMkQsTUFBTixFQUFjQyxZQUFkLEVBQTRCQyxXQUE1QixFQUF5QzdCLFNBQXpDLEtBQXVEO0FBQ2pFLFFBQU1mLFFBQVEwQyxPQUFPM0QsR0FBUCxDQUFkLENBRGlFLENBR2pFOztBQUNBLFVBQVEsT0FBT2lCLEtBQWY7QUFDQSxTQUFLLFFBQUw7QUFDRSxhQUFPdUMsTUFBTXZDLEtBQU4sQ0FBUDs7QUFDRixTQUFLLFFBQUw7QUFDRTtBQUNBLGFBQU82QyxTQUFTN0MsS0FBVCxJQUFrQjhDLE9BQU85QyxLQUFQLENBQWxCLEdBQWtDLE1BQXpDOztBQUNGLFNBQUssU0FBTDtBQUNFLGFBQU84QyxPQUFPOUMsS0FBUCxDQUFQO0FBQ0Y7QUFDQTs7QUFDQSxTQUFLLFFBQUw7QUFDRTtBQUNBO0FBQ0EsVUFBSSxDQUFDQSxLQUFMLEVBQVk7QUFDVixlQUFPLE1BQVA7QUFDRCxPQUxILENBTUU7QUFDQTs7O0FBQ0EsWUFBTStDLGNBQWNILGNBQWNELFlBQWxDO0FBQ0EsWUFBTUssVUFBVSxFQUFoQixDQVRGLENBV0U7O0FBQ0EsVUFBSWpCLE1BQU1LLE9BQU4sQ0FBY3BDLEtBQWQsS0FBeUIsRUFBRCxDQUFLNUQsY0FBTCxDQUFvQkMsSUFBcEIsQ0FBeUIyRCxLQUF6QixFQUFnQyxRQUFoQyxDQUE1QixFQUF1RTtBQUNyRTtBQUNBO0FBQ0EsY0FBTTdDLFNBQVM2QyxNQUFNN0MsTUFBckI7O0FBQ0EsYUFBSyxJQUFJeUMsSUFBSSxDQUFiLEVBQWdCQSxJQUFJekMsTUFBcEIsRUFBNEJ5QyxLQUFLLENBQWpDLEVBQW9DO0FBQ2xDb0Qsa0JBQVFwRCxDQUFSLElBQ0U2QyxJQUFJN0MsQ0FBSixFQUFPSSxLQUFQLEVBQWMyQyxZQUFkLEVBQTRCSSxXQUE1QixFQUF5Q2hDLFNBQXpDLEtBQXVELE1BRHpEO0FBRUQsU0FQb0UsQ0FTckU7QUFDQTs7O0FBQ0EsWUFBSU0sQ0FBSjs7QUFDQSxZQUFJMkIsUUFBUTdGLE1BQVIsS0FBbUIsQ0FBdkIsRUFBMEI7QUFDeEJrRSxjQUFJLElBQUo7QUFDRCxTQUZELE1BRU8sSUFBSTBCLFdBQUosRUFBaUI7QUFDdEIxQixjQUFJLFFBQ0YwQixXQURFLEdBRUZDLFFBQVFDLElBQVIsQ0FBYSxRQUNiRixXQURBLENBRkUsR0FJRixJQUpFLEdBS0ZILFdBTEUsR0FNRixHQU5GO0FBT0QsU0FSTSxNQVFBO0FBQ0x2QixjQUFJLE1BQU0yQixRQUFRQyxJQUFSLENBQWEsR0FBYixDQUFOLEdBQTBCLEdBQTlCO0FBQ0Q7O0FBQ0QsZUFBTzVCLENBQVA7QUFDRCxPQXRDSCxDQXdDRTs7O0FBQ0EsVUFBSW5FLE9BQU9ELE9BQU9DLElBQVAsQ0FBWThDLEtBQVosQ0FBWDs7QUFDQSxVQUFJZSxTQUFKLEVBQWU7QUFDYjdELGVBQU9BLEtBQUtnRyxJQUFMLEVBQVA7QUFDRDs7QUFDRGhHLFdBQUs0QixPQUFMLENBQWF5QixLQUFLO0FBQ2hCYyxZQUFJb0IsSUFBSWxDLENBQUosRUFBT1AsS0FBUCxFQUFjMkMsWUFBZCxFQUE0QkksV0FBNUIsRUFBeUNoQyxTQUF6QyxDQUFKOztBQUNBLFlBQUlNLENBQUosRUFBTztBQUNMMkIsa0JBQVFHLElBQVIsQ0FBYVosTUFBTWhDLENBQU4sS0FBWXdDLGNBQWMsSUFBZCxHQUFxQixHQUFqQyxJQUF3QzFCLENBQXJEO0FBQ0Q7QUFDRixPQUxELEVBN0NGLENBb0RFO0FBQ0E7O0FBQ0EsVUFBSTJCLFFBQVE3RixNQUFSLEtBQW1CLENBQXZCLEVBQTBCO0FBQ3hCa0UsWUFBSSxJQUFKO0FBQ0QsT0FGRCxNQUVPLElBQUkwQixXQUFKLEVBQWlCO0FBQ3RCMUIsWUFBSSxRQUNGMEIsV0FERSxHQUVGQyxRQUFRQyxJQUFSLENBQWEsUUFDYkYsV0FEQSxDQUZFLEdBSUYsSUFKRSxHQUtGSCxXQUxFLEdBTUYsR0FORjtBQU9ELE9BUk0sTUFRQTtBQUNMdkIsWUFBSSxNQUFNMkIsUUFBUUMsSUFBUixDQUFhLEdBQWIsQ0FBTixHQUEwQixHQUE5QjtBQUNEOztBQUNELGFBQU81QixDQUFQOztBQUVGLFlBL0VBLENBK0VTO0FBL0VUO0FBaUZELENBckZELEMsQ0F1RkE7OztBQUNBLE1BQU1KLHFCQUFxQixDQUFDakIsS0FBRCxFQUFRWSxPQUFSLEtBQW9CO0FBQzdDO0FBQ0E7QUFDQSxRQUFNd0MsYUFBYW5HLE9BQU9vRyxNQUFQLENBQWM7QUFDL0JyQyxZQUFRLEVBRHVCO0FBRS9CRCxlQUFXO0FBRm9CLEdBQWQsRUFHaEJILE9BSGdCLENBQW5COztBQUlBLE1BQUl3QyxXQUFXcEMsTUFBWCxLQUFzQixJQUExQixFQUFnQztBQUM5Qm9DLGVBQVdwQyxNQUFYLEdBQW9CLElBQXBCO0FBQ0QsR0FGRCxNQUVPLElBQUksT0FBT29DLFdBQVdwQyxNQUFsQixLQUE2QixRQUFqQyxFQUEyQztBQUNoRCxRQUFJc0MsWUFBWSxFQUFoQjs7QUFDQSxTQUFLLElBQUkxRCxJQUFJLENBQWIsRUFBZ0JBLElBQUl3RCxXQUFXcEMsTUFBL0IsRUFBdUNwQixHQUF2QyxFQUE0QztBQUMxQzBELG1CQUFhLEdBQWI7QUFDRDs7QUFDREYsZUFBV3BDLE1BQVgsR0FBb0JzQyxTQUFwQjtBQUNEOztBQUNELFNBQU9iLElBQUksRUFBSixFQUFRO0FBQUMsUUFBSXpDO0FBQUwsR0FBUixFQUFxQm9ELFdBQVdwQyxNQUFoQyxFQUF3QyxFQUF4QyxFQUE0Q29DLFdBQVdyQyxTQUF2RCxDQUFQO0FBQ0QsQ0FqQkQ7O0FBckdBbEYsT0FBTzBILGFBQVAsQ0F3SGV0QyxrQkF4SGYsRSIsImZpbGUiOiIvcGFja2FnZXMvZWpzb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBuYW1lc3BhY2VcbiAqIEBzdW1tYXJ5IE5hbWVzcGFjZSBmb3IgRUpTT04gZnVuY3Rpb25zXG4gKi9cbmNvbnN0IEVKU09OID0ge307XG5cbi8vIEN1c3RvbSB0eXBlIGludGVyZmFjZSBkZWZpbml0aW9uXG4vKipcbiAqIEBjbGFzcyBDdXN0b21UeXBlXG4gKiBAaW5zdGFuY2VOYW1lIGN1c3RvbVR5cGVcbiAqIEBtZW1iZXJPZiBFSlNPTlxuICogQHN1bW1hcnkgVGhlIGludGVyZmFjZSB0aGF0IGEgY2xhc3MgbXVzdCBzYXRpc2Z5IHRvIGJlIGFibGUgdG8gYmVjb21lIGFuXG4gKiBFSlNPTiBjdXN0b20gdHlwZSB2aWEgRUpTT04uYWRkVHlwZS5cbiAqL1xuXG4vKipcbiAqIEBmdW5jdGlvbiB0eXBlTmFtZVxuICogQG1lbWJlck9mIEVKU09OLkN1c3RvbVR5cGVcbiAqIEBzdW1tYXJ5IFJldHVybiB0aGUgdGFnIHVzZWQgdG8gaWRlbnRpZnkgdGhpcyB0eXBlLiAgVGhpcyBtdXN0IG1hdGNoIHRoZVxuICogICAgICAgICAgdGFnIHVzZWQgdG8gcmVnaXN0ZXIgdGhpcyB0eXBlIHdpdGhcbiAqICAgICAgICAgIFtgRUpTT04uYWRkVHlwZWBdKCNlanNvbl9hZGRfdHlwZSkuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBpbnN0YW5jZVxuICovXG5cbi8qKlxuICogQGZ1bmN0aW9uIHRvSlNPTlZhbHVlXG4gKiBAbWVtYmVyT2YgRUpTT04uQ3VzdG9tVHlwZVxuICogQHN1bW1hcnkgU2VyaWFsaXplIHRoaXMgaW5zdGFuY2UgaW50byBhIEpTT04tY29tcGF0aWJsZSB2YWx1ZS5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGluc3RhbmNlXG4gKi9cblxuLyoqXG4gKiBAZnVuY3Rpb24gY2xvbmVcbiAqIEBtZW1iZXJPZiBFSlNPTi5DdXN0b21UeXBlXG4gKiBAc3VtbWFyeSBSZXR1cm4gYSB2YWx1ZSBgcmAgc3VjaCB0aGF0IGB0aGlzLmVxdWFscyhyKWAgaXMgdHJ1ZSwgYW5kXG4gKiAgICAgICAgICBtb2RpZmljYXRpb25zIHRvIGByYCBkbyBub3QgYWZmZWN0IGB0aGlzYCBhbmQgdmljZSB2ZXJzYS5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGluc3RhbmNlXG4gKi9cblxuLyoqXG4gKiBAZnVuY3Rpb24gZXF1YWxzXG4gKiBAbWVtYmVyT2YgRUpTT04uQ3VzdG9tVHlwZVxuICogQHN1bW1hcnkgUmV0dXJuIGB0cnVlYCBpZiBgb3RoZXJgIGhhcyBhIHZhbHVlIGVxdWFsIHRvIGB0aGlzYDsgYGZhbHNlYFxuICogICAgICAgICAgb3RoZXJ3aXNlLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAcGFyYW0ge09iamVjdH0gb3RoZXIgQW5vdGhlciBvYmplY3QgdG8gY29tcGFyZSB0aGlzIHRvLlxuICogQGluc3RhbmNlXG4gKi9cblxuY29uc3QgY3VzdG9tVHlwZXMgPSB7fTtcblxuY29uc3QgaGFzT3duID0gKG9iaiwgcHJvcCkgPT4gKHt9KS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG5cbmNvbnN0IGlzQXJndW1lbnRzID0gb2JqID0+IG9iaiAhPSBudWxsICYmIGhhc093bihvYmosICdjYWxsZWUnKTtcblxuY29uc3QgaXNJbmZPck5hbiA9XG4gIG9iaiA9PiBOdW1iZXIuaXNOYU4ob2JqKSB8fCBvYmogPT09IEluZmluaXR5IHx8IG9iaiA9PT0gLUluZmluaXR5O1xuXG4vLyBBZGQgYSBjdXN0b20gdHlwZSwgdXNpbmcgYSBtZXRob2Qgb2YgeW91ciBjaG9pY2UgdG8gZ2V0IHRvIGFuZFxuLy8gZnJvbSBhIGJhc2ljIEpTT04tYWJsZSByZXByZXNlbnRhdGlvbi4gIFRoZSBmYWN0b3J5IGFyZ3VtZW50XG4vLyBpcyBhIGZ1bmN0aW9uIG9mIEpTT04tYWJsZSAtLT4geW91ciBvYmplY3Rcbi8vIFRoZSB0eXBlIHlvdSBhZGQgbXVzdCBoYXZlOlxuLy8gLSBBIHRvSlNPTlZhbHVlKCkgbWV0aG9kLCBzbyB0aGF0IE1ldGVvciBjYW4gc2VyaWFsaXplIGl0XG4vLyAtIGEgdHlwZU5hbWUoKSBtZXRob2QsIHRvIHNob3cgaG93IHRvIGxvb2sgaXQgdXAgaW4gb3VyIHR5cGUgdGFibGUuXG4vLyBJdCBpcyBva2F5IGlmIHRoZXNlIG1ldGhvZHMgYXJlIG1vbmtleS1wYXRjaGVkIG9uLlxuLy8gRUpTT04uY2xvbmUgd2lsbCB1c2UgdG9KU09OVmFsdWUgYW5kIHRoZSBnaXZlbiBmYWN0b3J5IHRvIHByb2R1Y2Vcbi8vIGEgY2xvbmUsIGJ1dCB5b3UgbWF5IHNwZWNpZnkgYSBtZXRob2QgY2xvbmUoKSB0aGF0IHdpbGwgYmVcbi8vIHVzZWQgaW5zdGVhZC5cbi8vIFNpbWlsYXJseSwgRUpTT04uZXF1YWxzIHdpbGwgdXNlIHRvSlNPTlZhbHVlIHRvIG1ha2UgY29tcGFyaXNvbnMsXG4vLyBidXQgeW91IG1heSBwcm92aWRlIGEgbWV0aG9kIGVxdWFscygpIGluc3RlYWQuXG4vKipcbiAqIEBzdW1tYXJ5IEFkZCBhIGN1c3RvbSBkYXRhdHlwZSB0byBFSlNPTi5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgQSB0YWcgZm9yIHlvdXIgY3VzdG9tIHR5cGU7IG11c3QgYmUgdW5pcXVlIGFtb25nXG4gKiAgICAgICAgICAgICAgICAgICAgICBjdXN0b20gZGF0YSB0eXBlcyBkZWZpbmVkIGluIHlvdXIgcHJvamVjdCwgYW5kIG11c3RcbiAqICAgICAgICAgICAgICAgICAgICAgIG1hdGNoIHRoZSByZXN1bHQgb2YgeW91ciB0eXBlJ3MgYHR5cGVOYW1lYCBtZXRob2QuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmYWN0b3J5IEEgZnVuY3Rpb24gdGhhdCBkZXNlcmlhbGl6ZXMgYSBKU09OLWNvbXBhdGlibGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgaW50byBhbiBpbnN0YW5jZSBvZiB5b3VyIHR5cGUuICBUaGlzIHNob3VsZFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaCB0aGUgc2VyaWFsaXphdGlvbiBwZXJmb3JtZWQgYnkgeW91clxuICogICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlJ3MgYHRvSlNPTlZhbHVlYCBtZXRob2QuXG4gKi9cbkVKU09OLmFkZFR5cGUgPSAobmFtZSwgZmFjdG9yeSkgPT4ge1xuICBpZiAoaGFzT3duKGN1c3RvbVR5cGVzLCBuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVHlwZSAke25hbWV9IGFscmVhZHkgcHJlc2VudGApO1xuICB9XG4gIGN1c3RvbVR5cGVzW25hbWVdID0gZmFjdG9yeTtcbn07XG5cbmNvbnN0IGJ1aWx0aW5Db252ZXJ0ZXJzID0gW1xuICB7IC8vIERhdGVcbiAgICBtYXRjaEpTT05WYWx1ZShvYmopIHtcbiAgICAgIHJldHVybiBoYXNPd24ob2JqLCAnJGRhdGUnKSAmJiBPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMTtcbiAgICB9LFxuICAgIG1hdGNoT2JqZWN0KG9iaikge1xuICAgICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIERhdGU7XG4gICAgfSxcbiAgICB0b0pTT05WYWx1ZShvYmopIHtcbiAgICAgIHJldHVybiB7JGRhdGU6IG9iai5nZXRUaW1lKCl9O1xuICAgIH0sXG4gICAgZnJvbUpTT05WYWx1ZShvYmopIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZShvYmouJGRhdGUpO1xuICAgIH0sXG4gIH0sXG4gIHsgLy8gUmVnRXhwXG4gICAgbWF0Y2hKU09OVmFsdWUob2JqKSB7XG4gICAgICByZXR1cm4gaGFzT3duKG9iaiwgJyRyZWdleHAnKVxuICAgICAgICAmJiBoYXNPd24ob2JqLCAnJGZsYWdzJylcbiAgICAgICAgJiYgT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDI7XG4gICAgfSxcbiAgICBtYXRjaE9iamVjdChvYmopIHtcbiAgICAgIHJldHVybiBvYmogaW5zdGFuY2VvZiBSZWdFeHA7XG4gICAgfSxcbiAgICB0b0pTT05WYWx1ZShyZWdleHApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICRyZWdleHA6IHJlZ2V4cC5zb3VyY2UsXG4gICAgICAgICRmbGFnczogcmVnZXhwLmZsYWdzXG4gICAgICB9O1xuICAgIH0sXG4gICAgZnJvbUpTT05WYWx1ZShvYmopIHtcbiAgICAgIC8vIFJlcGxhY2VzIGR1cGxpY2F0ZSAvIGludmFsaWQgZmxhZ3MuXG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cChcbiAgICAgICAgb2JqLiRyZWdleHAsXG4gICAgICAgIG9iai4kZmxhZ3NcbiAgICAgICAgICAvLyBDdXQgb2ZmIGZsYWdzIGF0IDUwIGNoYXJzIHRvIGF2b2lkIGFidXNpbmcgUmVnRXhwIGZvciBET1MuXG4gICAgICAgICAgLnNsaWNlKDAsIDUwKVxuICAgICAgICAgIC5yZXBsYWNlKC9bXmdpbXV5XS9nLCcnKVxuICAgICAgICAgIC5yZXBsYWNlKC8oLikoPz0uKlxcMSkvZywgJycpXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG4gIHsgLy8gTmFOLCBJbmYsIC1JbmYuIChUaGVzZSBhcmUgdGhlIG9ubHkgb2JqZWN0cyB3aXRoIHR5cGVvZiAhPT0gJ29iamVjdCdcbiAgICAvLyB3aGljaCB3ZSBtYXRjaC4pXG4gICAgbWF0Y2hKU09OVmFsdWUob2JqKSB7XG4gICAgICByZXR1cm4gaGFzT3duKG9iaiwgJyRJbmZOYU4nKSAmJiBPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMTtcbiAgICB9LFxuICAgIG1hdGNoT2JqZWN0OiBpc0luZk9yTmFuLFxuICAgIHRvSlNPTlZhbHVlKG9iaikge1xuICAgICAgbGV0IHNpZ247XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKG9iaikpIHtcbiAgICAgICAgc2lnbiA9IDA7XG4gICAgICB9IGVsc2UgaWYgKG9iaiA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgc2lnbiA9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzaWduID0gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4geyRJbmZOYU46IHNpZ259O1xuICAgIH0sXG4gICAgZnJvbUpTT05WYWx1ZShvYmopIHtcbiAgICAgIHJldHVybiBvYmouJEluZk5hTiAvIDA7XG4gICAgfSxcbiAgfSxcbiAgeyAvLyBCaW5hcnlcbiAgICBtYXRjaEpTT05WYWx1ZShvYmopIHtcbiAgICAgIHJldHVybiBoYXNPd24ob2JqLCAnJGJpbmFyeScpICYmIE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID09PSAxO1xuICAgIH0sXG4gICAgbWF0Y2hPYmplY3Qob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnICYmIG9iaiBpbnN0YW5jZW9mIFVpbnQ4QXJyYXlcbiAgICAgICAgfHwgKG9iaiAmJiBoYXNPd24ob2JqLCAnJFVpbnQ4QXJyYXlQb2x5ZmlsbCcpKTtcbiAgICB9LFxuICAgIHRvSlNPTlZhbHVlKG9iaikge1xuICAgICAgcmV0dXJuIHskYmluYXJ5OiBCYXNlNjQuZW5jb2RlKG9iail9O1xuICAgIH0sXG4gICAgZnJvbUpTT05WYWx1ZShvYmopIHtcbiAgICAgIHJldHVybiBCYXNlNjQuZGVjb2RlKG9iai4kYmluYXJ5KTtcbiAgICB9LFxuICB9LFxuICB7IC8vIEVzY2FwaW5nIG9uZSBsZXZlbFxuICAgIG1hdGNoSlNPTlZhbHVlKG9iaikge1xuICAgICAgcmV0dXJuIGhhc093bihvYmosICckZXNjYXBlJykgJiYgT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDE7XG4gICAgfSxcbiAgICBtYXRjaE9iamVjdChvYmopIHtcbiAgICAgIGxldCBtYXRjaCA9IGZhbHNlO1xuICAgICAgaWYgKG9iaikge1xuICAgICAgICBjb25zdCBrZXlDb3VudCA9IE9iamVjdC5rZXlzKG9iaikubGVuZ3RoO1xuICAgICAgICBpZiAoa2V5Q291bnQgPT09IDEgfHwga2V5Q291bnQgPT09IDIpIHtcbiAgICAgICAgICBtYXRjaCA9XG4gICAgICAgICAgICBidWlsdGluQ29udmVydGVycy5zb21lKGNvbnZlcnRlciA9PiBjb252ZXJ0ZXIubWF0Y2hKU09OVmFsdWUob2JqKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9LFxuICAgIHRvSlNPTlZhbHVlKG9iaikge1xuICAgICAgY29uc3QgbmV3T2JqID0ge307XG4gICAgICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgbmV3T2JqW2tleV0gPSBFSlNPTi50b0pTT05WYWx1ZShvYmpba2V5XSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB7JGVzY2FwZTogbmV3T2JqfTtcbiAgICB9LFxuICAgIGZyb21KU09OVmFsdWUob2JqKSB7XG4gICAgICBjb25zdCBuZXdPYmogPSB7fTtcbiAgICAgIE9iamVjdC5rZXlzKG9iai4kZXNjYXBlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgIG5ld09ialtrZXldID0gRUpTT04uZnJvbUpTT05WYWx1ZShvYmouJGVzY2FwZVtrZXldKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5ld09iajtcbiAgICB9LFxuICB9LFxuICB7IC8vIEN1c3RvbVxuICAgIG1hdGNoSlNPTlZhbHVlKG9iaikge1xuICAgICAgcmV0dXJuIGhhc093bihvYmosICckdHlwZScpXG4gICAgICAgICYmIGhhc093bihvYmosICckdmFsdWUnKSAmJiBPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMjtcbiAgICB9LFxuICAgIG1hdGNoT2JqZWN0KG9iaikge1xuICAgICAgcmV0dXJuIEVKU09OLl9pc0N1c3RvbVR5cGUob2JqKTtcbiAgICB9LFxuICAgIHRvSlNPTlZhbHVlKG9iaikge1xuICAgICAgY29uc3QganNvblZhbHVlID0gTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoKCkgPT4gb2JqLnRvSlNPTlZhbHVlKCkpO1xuICAgICAgcmV0dXJuIHskdHlwZTogb2JqLnR5cGVOYW1lKCksICR2YWx1ZToganNvblZhbHVlfTtcbiAgICB9LFxuICAgIGZyb21KU09OVmFsdWUob2JqKSB7XG4gICAgICBjb25zdCB0eXBlTmFtZSA9IG9iai4kdHlwZTtcbiAgICAgIGlmICghaGFzT3duKGN1c3RvbVR5cGVzLCB0eXBlTmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDdXN0b20gRUpTT04gdHlwZSAke3R5cGVOYW1lfSBpcyBub3QgZGVmaW5lZGApO1xuICAgICAgfVxuICAgICAgY29uc3QgY29udmVydGVyID0gY3VzdG9tVHlwZXNbdHlwZU5hbWVdO1xuICAgICAgcmV0dXJuIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKCgpID0+IGNvbnZlcnRlcihvYmouJHZhbHVlKSk7XG4gICAgfSxcbiAgfSxcbl07XG5cbkVKU09OLl9pc0N1c3RvbVR5cGUgPSAob2JqKSA9PiAoXG4gIG9iaiAmJlxuICB0eXBlb2Ygb2JqLnRvSlNPTlZhbHVlID09PSAnZnVuY3Rpb24nICYmXG4gIHR5cGVvZiBvYmoudHlwZU5hbWUgPT09ICdmdW5jdGlvbicgJiZcbiAgaGFzT3duKGN1c3RvbVR5cGVzLCBvYmoudHlwZU5hbWUoKSlcbik7XG5cbkVKU09OLl9nZXRUeXBlcyA9ICgpID0+IGN1c3RvbVR5cGVzO1xuXG5FSlNPTi5fZ2V0Q29udmVydGVycyA9ICgpID0+IGJ1aWx0aW5Db252ZXJ0ZXJzO1xuXG4vLyBFaXRoZXIgcmV0dXJuIHRoZSBKU09OLWNvbXBhdGlibGUgdmVyc2lvbiBvZiB0aGUgYXJndW1lbnQsIG9yIHVuZGVmaW5lZCAoaWZcbi8vIHRoZSBpdGVtIGlzbid0IGl0c2VsZiByZXBsYWNlYWJsZSwgYnV0IG1heWJlIHNvbWUgZmllbGRzIGluIGl0IGFyZSlcbmNvbnN0IHRvSlNPTlZhbHVlSGVscGVyID0gaXRlbSA9PiB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYnVpbHRpbkNvbnZlcnRlcnMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjb252ZXJ0ZXIgPSBidWlsdGluQ29udmVydGVyc1tpXTtcbiAgICBpZiAoY29udmVydGVyLm1hdGNoT2JqZWN0KGl0ZW0pKSB7XG4gICAgICByZXR1cm4gY29udmVydGVyLnRvSlNPTlZhbHVlKGl0ZW0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxuLy8gZm9yIGJvdGggYXJyYXlzIGFuZCBvYmplY3RzLCBpbi1wbGFjZSBtb2RpZmljYXRpb24uXG5jb25zdCBhZGp1c3RUeXBlc1RvSlNPTlZhbHVlID0gb2JqID0+IHtcbiAgLy8gSXMgaXQgYW4gYXRvbSB0aGF0IHdlIG5lZWQgdG8gYWRqdXN0P1xuICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBtYXliZUNoYW5nZWQgPSB0b0pTT05WYWx1ZUhlbHBlcihvYmopO1xuICBpZiAobWF5YmVDaGFuZ2VkICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbWF5YmVDaGFuZ2VkO1xuICB9XG5cbiAgLy8gT3RoZXIgYXRvbXMgYXJlIHVuY2hhbmdlZC5cbiAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8vIEl0ZXJhdGUgb3ZlciBhcnJheSBvciBvYmplY3Qgc3RydWN0dXJlLlxuICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goa2V5ID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IG9ialtrZXldO1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnICYmIHZhbHVlICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgIWlzSW5mT3JOYW4odmFsdWUpKSB7XG4gICAgICByZXR1cm47IC8vIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgY29uc3QgY2hhbmdlZCA9IHRvSlNPTlZhbHVlSGVscGVyKHZhbHVlKTtcbiAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgb2JqW2tleV0gPSBjaGFuZ2VkO1xuICAgICAgcmV0dXJuOyAvLyBvbiB0byB0aGUgbmV4dCBrZXlcbiAgICB9XG4gICAgLy8gaWYgd2UgZ2V0IGhlcmUsIHZhbHVlIGlzIGFuIG9iamVjdCBidXQgbm90IGFkanVzdGFibGVcbiAgICAvLyBhdCB0aGlzIGxldmVsLiAgcmVjdXJzZS5cbiAgICBhZGp1c3RUeXBlc1RvSlNPTlZhbHVlKHZhbHVlKTtcbiAgfSk7XG4gIHJldHVybiBvYmo7XG59O1xuXG5FSlNPTi5fYWRqdXN0VHlwZXNUb0pTT05WYWx1ZSA9IGFkanVzdFR5cGVzVG9KU09OVmFsdWU7XG5cbi8qKlxuICogQHN1bW1hcnkgU2VyaWFsaXplIGFuIEVKU09OLWNvbXBhdGlibGUgdmFsdWUgaW50byBpdHMgcGxhaW4gSlNPTlxuICogICAgICAgICAgcmVwcmVzZW50YXRpb24uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7RUpTT059IHZhbCBBIHZhbHVlIHRvIHNlcmlhbGl6ZSB0byBwbGFpbiBKU09OLlxuICovXG5FSlNPTi50b0pTT05WYWx1ZSA9IGl0ZW0gPT4ge1xuICBjb25zdCBjaGFuZ2VkID0gdG9KU09OVmFsdWVIZWxwZXIoaXRlbSk7XG4gIGlmIChjaGFuZ2VkICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gY2hhbmdlZDtcbiAgfVxuXG4gIGxldCBuZXdJdGVtID0gaXRlbTtcbiAgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xuICAgIG5ld0l0ZW0gPSBFSlNPTi5jbG9uZShpdGVtKTtcbiAgICBhZGp1c3RUeXBlc1RvSlNPTlZhbHVlKG5ld0l0ZW0pO1xuICB9XG4gIHJldHVybiBuZXdJdGVtO1xufTtcblxuLy8gRWl0aGVyIHJldHVybiB0aGUgYXJndW1lbnQgY2hhbmdlZCB0byBoYXZlIHRoZSBub24tanNvblxuLy8gcmVwIG9mIGl0c2VsZiAodGhlIE9iamVjdCB2ZXJzaW9uKSBvciB0aGUgYXJndW1lbnQgaXRzZWxmLlxuLy8gRE9FUyBOT1QgUkVDVVJTRS4gIEZvciBhY3R1YWxseSBnZXR0aW5nIHRoZSBmdWxseS1jaGFuZ2VkIHZhbHVlLCB1c2Vcbi8vIEVKU09OLmZyb21KU09OVmFsdWVcbmNvbnN0IGZyb21KU09OVmFsdWVIZWxwZXIgPSB2YWx1ZSA9PiB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgICBpZiAoa2V5cy5sZW5ndGggPD0gMlxuICAgICAgICAmJiBrZXlzLmV2ZXJ5KGsgPT4gdHlwZW9mIGsgPT09ICdzdHJpbmcnICYmIGsuc3Vic3RyKDAsIDEpID09PSAnJCcpKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ1aWx0aW5Db252ZXJ0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGNvbnZlcnRlciA9IGJ1aWx0aW5Db252ZXJ0ZXJzW2ldO1xuICAgICAgICBpZiAoY29udmVydGVyLm1hdGNoSlNPTlZhbHVlKHZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBjb252ZXJ0ZXIuZnJvbUpTT05WYWx1ZSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuLy8gZm9yIGJvdGggYXJyYXlzIGFuZCBvYmplY3RzLiBUcmllcyBpdHMgYmVzdCB0byBqdXN0XG4vLyB1c2UgdGhlIG9iamVjdCB5b3UgaGFuZCBpdCwgYnV0IG1heSByZXR1cm4gc29tZXRoaW5nXG4vLyBkaWZmZXJlbnQgaWYgdGhlIG9iamVjdCB5b3UgaGFuZCBpdCBpdHNlbGYgbmVlZHMgY2hhbmdpbmcuXG5jb25zdCBhZGp1c3RUeXBlc0Zyb21KU09OVmFsdWUgPSBvYmogPT4ge1xuICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBtYXliZUNoYW5nZWQgPSBmcm9tSlNPTlZhbHVlSGVscGVyKG9iaik7XG4gIGlmIChtYXliZUNoYW5nZWQgIT09IG9iaikge1xuICAgIHJldHVybiBtYXliZUNoYW5nZWQ7XG4gIH1cblxuICAvLyBPdGhlciBhdG9tcyBhcmUgdW5jaGFuZ2VkLlxuICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgT2JqZWN0LmtleXMob2JqKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBvYmpba2V5XTtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgY29uc3QgY2hhbmdlZCA9IGZyb21KU09OVmFsdWVIZWxwZXIodmFsdWUpO1xuICAgICAgaWYgKHZhbHVlICE9PSBjaGFuZ2VkKSB7XG4gICAgICAgIG9ialtrZXldID0gY2hhbmdlZDtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gaWYgd2UgZ2V0IGhlcmUsIHZhbHVlIGlzIGFuIG9iamVjdCBidXQgbm90IGFkanVzdGFibGVcbiAgICAgIC8vIGF0IHRoaXMgbGV2ZWwuICByZWN1cnNlLlxuICAgICAgYWRqdXN0VHlwZXNGcm9tSlNPTlZhbHVlKHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufTtcblxuRUpTT04uX2FkanVzdFR5cGVzRnJvbUpTT05WYWx1ZSA9IGFkanVzdFR5cGVzRnJvbUpTT05WYWx1ZTtcblxuLyoqXG4gKiBAc3VtbWFyeSBEZXNlcmlhbGl6ZSBhbiBFSlNPTiB2YWx1ZSBmcm9tIGl0cyBwbGFpbiBKU09OIHJlcHJlc2VudGF0aW9uLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAcGFyYW0ge0pTT05Db21wYXRpYmxlfSB2YWwgQSB2YWx1ZSB0byBkZXNlcmlhbGl6ZSBpbnRvIEVKU09OLlxuICovXG5FSlNPTi5mcm9tSlNPTlZhbHVlID0gaXRlbSA9PiB7XG4gIGxldCBjaGFuZ2VkID0gZnJvbUpTT05WYWx1ZUhlbHBlcihpdGVtKTtcbiAgaWYgKGNoYW5nZWQgPT09IGl0ZW0gJiYgdHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XG4gICAgY2hhbmdlZCA9IEVKU09OLmNsb25lKGl0ZW0pO1xuICAgIGFkanVzdFR5cGVzRnJvbUpTT05WYWx1ZShjaGFuZ2VkKTtcbiAgfVxuICByZXR1cm4gY2hhbmdlZDtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgU2VyaWFsaXplIGEgdmFsdWUgdG8gYSBzdHJpbmcuIEZvciBFSlNPTiB2YWx1ZXMsIHRoZSBzZXJpYWxpemF0aW9uXG4gKiAgICAgICAgICBmdWxseSByZXByZXNlbnRzIHRoZSB2YWx1ZS4gRm9yIG5vbi1FSlNPTiB2YWx1ZXMsIHNlcmlhbGl6ZXMgdGhlXG4gKiAgICAgICAgICBzYW1lIHdheSBhcyBgSlNPTi5zdHJpbmdpZnlgLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAcGFyYW0ge0VKU09OfSB2YWwgQSB2YWx1ZSB0byBzdHJpbmdpZnkuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge0Jvb2xlYW4gfCBJbnRlZ2VyIHwgU3RyaW5nfSBvcHRpb25zLmluZGVudCBJbmRlbnRzIG9iamVjdHMgYW5kXG4gKiBhcnJheXMgZm9yIGVhc3kgcmVhZGFiaWxpdHkuICBXaGVuIGB0cnVlYCwgaW5kZW50cyBieSAyIHNwYWNlczsgd2hlbiBhblxuICogaW50ZWdlciwgaW5kZW50cyBieSB0aGF0IG51bWJlciBvZiBzcGFjZXM7IGFuZCB3aGVuIGEgc3RyaW5nLCB1c2VzIHRoZVxuICogc3RyaW5nIGFzIHRoZSBpbmRlbnRhdGlvbiBwYXR0ZXJuLlxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmNhbm9uaWNhbCBXaGVuIGB0cnVlYCwgc3RyaW5naWZpZXMga2V5cyBpbiBhblxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QgaW4gc29ydGVkIG9yZGVyLlxuICovXG5FSlNPTi5zdHJpbmdpZnkgPSAoaXRlbSwgb3B0aW9ucykgPT4ge1xuICBsZXQgc2VyaWFsaXplZDtcbiAgY29uc3QganNvbiA9IEVKU09OLnRvSlNPTlZhbHVlKGl0ZW0pO1xuICBpZiAob3B0aW9ucyAmJiAob3B0aW9ucy5jYW5vbmljYWwgfHwgb3B0aW9ucy5pbmRlbnQpKSB7XG4gICAgaW1wb3J0IGNhbm9uaWNhbFN0cmluZ2lmeSBmcm9tICcuL3N0cmluZ2lmeSc7XG4gICAgc2VyaWFsaXplZCA9IGNhbm9uaWNhbFN0cmluZ2lmeShqc29uLCBvcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICBzZXJpYWxpemVkID0gSlNPTi5zdHJpbmdpZnkoanNvbik7XG4gIH1cbiAgcmV0dXJuIHNlcmlhbGl6ZWQ7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IFBhcnNlIGEgc3RyaW5nIGludG8gYW4gRUpTT04gdmFsdWUuIFRocm93cyBhbiBlcnJvciBpZiB0aGUgc3RyaW5nXG4gKiAgICAgICAgICBpcyBub3QgdmFsaWQgRUpTT04uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgQSBzdHJpbmcgdG8gcGFyc2UgaW50byBhbiBFSlNPTiB2YWx1ZS5cbiAqL1xuRUpTT04ucGFyc2UgPSBpdGVtID0+IHtcbiAgaWYgKHR5cGVvZiBpdGVtICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBFcnJvcignRUpTT04ucGFyc2UgYXJndW1lbnQgc2hvdWxkIGJlIGEgc3RyaW5nJyk7XG4gIH1cbiAgcmV0dXJuIEVKU09OLmZyb21KU09OVmFsdWUoSlNPTi5wYXJzZShpdGVtKSk7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IFJldHVybnMgdHJ1ZSBpZiBgeGAgaXMgYSBidWZmZXIgb2YgYmluYXJ5IGRhdGEsIGFzIHJldHVybmVkIGZyb21cbiAqICAgICAgICAgIFtgRUpTT04ubmV3QmluYXJ5YF0oI2Vqc29uX25ld19iaW5hcnkpLlxuICogQHBhcmFtIHtPYmplY3R9IHggVGhlIHZhcmlhYmxlIHRvIGNoZWNrLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKi9cbkVKU09OLmlzQmluYXJ5ID0gb2JqID0+IHtcbiAgcmV0dXJuICEhKCh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgb2JqIGluc3RhbmNlb2YgVWludDhBcnJheSkgfHxcbiAgICAob2JqICYmIG9iai4kVWludDhBcnJheVBvbHlmaWxsKSk7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IFJldHVybiB0cnVlIGlmIGBhYCBhbmQgYGJgIGFyZSBlcXVhbCB0byBlYWNoIG90aGVyLiAgUmV0dXJuIGZhbHNlXG4gKiAgICAgICAgICBvdGhlcndpc2UuICBVc2VzIHRoZSBgZXF1YWxzYCBtZXRob2Qgb24gYGFgIGlmIHByZXNlbnQsIG90aGVyd2lzZVxuICogICAgICAgICAgcGVyZm9ybXMgYSBkZWVwIGNvbXBhcmlzb24uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7RUpTT059IGFcbiAqIEBwYXJhbSB7RUpTT059IGJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5rZXlPcmRlclNlbnNpdGl2ZSBDb21wYXJlIGluIGtleSBzZW5zaXRpdmUgb3JkZXIsXG4gKiBpZiBzdXBwb3J0ZWQgYnkgdGhlIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb24uICBGb3IgZXhhbXBsZSwgYHthOiAxLCBiOiAyfWBcbiAqIGlzIGVxdWFsIHRvIGB7YjogMiwgYTogMX1gIG9ubHkgd2hlbiBga2V5T3JkZXJTZW5zaXRpdmVgIGlzIGBmYWxzZWAuICBUaGVcbiAqIGRlZmF1bHQgaXMgYGZhbHNlYC5cbiAqL1xuRUpTT04uZXF1YWxzID0gKGEsIGIsIG9wdGlvbnMpID0+IHtcbiAgbGV0IGk7XG4gIGNvbnN0IGtleU9yZGVyU2Vuc2l0aXZlID0gISEob3B0aW9ucyAmJiBvcHRpb25zLmtleU9yZGVyU2Vuc2l0aXZlKTtcbiAgaWYgKGEgPT09IGIpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIFRoaXMgZGlmZmVycyBmcm9tIHRoZSBJRUVFIHNwZWMgZm9yIE5hTiBlcXVhbGl0eSwgYi9jIHdlIGRvbid0IHdhbnRcbiAgLy8gYW55dGhpbmcgZXZlciB3aXRoIGEgTmFOIHRvIGJlIHBvaXNvbmVkIGZyb20gYmVjb21pbmcgZXF1YWwgdG8gYW55dGhpbmcuXG4gIGlmIChOdW1iZXIuaXNOYU4oYSkgJiYgTnVtYmVyLmlzTmFOKGIpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBpZiBlaXRoZXIgb25lIGlzIGZhbHN5LCB0aGV5J2QgaGF2ZSB0byBiZSA9PT0gdG8gYmUgZXF1YWxcbiAgaWYgKCFhIHx8ICFiKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCEodHlwZW9mIGEgPT09ICdvYmplY3QnICYmIHR5cGVvZiBiID09PSAnb2JqZWN0JykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoYSBpbnN0YW5jZW9mIERhdGUgJiYgYiBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICByZXR1cm4gYS52YWx1ZU9mKCkgPT09IGIudmFsdWVPZigpO1xuICB9XG5cbiAgaWYgKEVKU09OLmlzQmluYXJ5KGEpICYmIEVKU09OLmlzQmluYXJ5KGIpKSB7XG4gICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgKGEuZXF1YWxzKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBhLmVxdWFscyhiLCBvcHRpb25zKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgKGIuZXF1YWxzKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBiLmVxdWFscyhhLCBvcHRpb25zKTtcbiAgfVxuXG4gIGlmIChhIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICBpZiAoIShiIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghRUpTT04uZXF1YWxzKGFbaV0sIGJbaV0sIG9wdGlvbnMpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBmYWxsYmFjayBmb3IgY3VzdG9tIHR5cGVzIHRoYXQgZG9uJ3QgaW1wbGVtZW50IHRoZWlyIG93biBlcXVhbHNcbiAgc3dpdGNoIChFSlNPTi5faXNDdXN0b21UeXBlKGEpICsgRUpTT04uX2lzQ3VzdG9tVHlwZShiKSkge1xuICAgIGNhc2UgMTogcmV0dXJuIGZhbHNlO1xuICAgIGNhc2UgMjogcmV0dXJuIEVKU09OLmVxdWFscyhFSlNPTi50b0pTT05WYWx1ZShhKSwgRUpTT04udG9KU09OVmFsdWUoYikpO1xuICAgIGRlZmF1bHQ6IC8vIERvIG5vdGhpbmdcbiAgfVxuXG4gIC8vIGZhbGwgYmFjayB0byBzdHJ1Y3R1cmFsIGVxdWFsaXR5IG9mIG9iamVjdHNcbiAgbGV0IHJldDtcbiAgY29uc3QgYUtleXMgPSBPYmplY3Qua2V5cyhhKTtcbiAgY29uc3QgYktleXMgPSBPYmplY3Qua2V5cyhiKTtcbiAgaWYgKGtleU9yZGVyU2Vuc2l0aXZlKSB7XG4gICAgaSA9IDA7XG4gICAgcmV0ID0gYUtleXMuZXZlcnkoa2V5ID0+IHtcbiAgICAgIGlmIChpID49IGJLZXlzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoa2V5ICE9PSBiS2V5c1tpXSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIUVKU09OLmVxdWFscyhhW2tleV0sIGJbYktleXNbaV1dLCBvcHRpb25zKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpKys7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBpID0gMDtcbiAgICByZXQgPSBhS2V5cy5ldmVyeShrZXkgPT4ge1xuICAgICAgaWYgKCFoYXNPd24oYiwga2V5KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIUVKU09OLmVxdWFscyhhW2tleV0sIGJba2V5XSwgb3B0aW9ucykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaSsrO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHJldCAmJiBpID09PSBiS2V5cy5sZW5ndGg7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IFJldHVybiBhIGRlZXAgY29weSBvZiBgdmFsYC5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQHBhcmFtIHtFSlNPTn0gdmFsIEEgdmFsdWUgdG8gY29weS5cbiAqL1xuRUpTT04uY2xvbmUgPSB2ID0+IHtcbiAgbGV0IHJldDtcbiAgaWYgKHR5cGVvZiB2ICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiB2O1xuICB9XG5cbiAgaWYgKHYgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDsgLy8gbnVsbCBoYXMgdHlwZW9mIFwib2JqZWN0XCJcbiAgfVxuXG4gIGlmICh2IGluc3RhbmNlb2YgRGF0ZSkge1xuICAgIHJldHVybiBuZXcgRGF0ZSh2LmdldFRpbWUoKSk7XG4gIH1cblxuICAvLyBSZWdFeHBzIGFyZSBub3QgcmVhbGx5IEVKU09OIGVsZW1lbnRzIChlZyB3ZSBkb24ndCBkZWZpbmUgYSBzZXJpYWxpemF0aW9uXG4gIC8vIGZvciB0aGVtKSwgYnV0IHRoZXkncmUgaW1tdXRhYmxlIGFueXdheSwgc28gd2UgY2FuIHN1cHBvcnQgdGhlbSBpbiBjbG9uZS5cbiAgaWYgKHYgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICByZXR1cm4gdjtcbiAgfVxuXG4gIGlmIChFSlNPTi5pc0JpbmFyeSh2KSkge1xuICAgIHJldCA9IEVKU09OLm5ld0JpbmFyeSh2Lmxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2Lmxlbmd0aDsgaSsrKSB7XG4gICAgICByZXRbaV0gPSB2W2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodikpIHtcbiAgICByZXR1cm4gdi5tYXAodmFsdWUgPT4gRUpTT04uY2xvbmUodmFsdWUpKTtcbiAgfVxuXG4gIGlmIChpc0FyZ3VtZW50cyh2KSkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHYpLm1hcCh2YWx1ZSA9PiBFSlNPTi5jbG9uZSh2YWx1ZSkpO1xuICB9XG5cbiAgLy8gaGFuZGxlIGdlbmVyYWwgdXNlci1kZWZpbmVkIHR5cGVkIE9iamVjdHMgaWYgdGhleSBoYXZlIGEgY2xvbmUgbWV0aG9kXG4gIGlmICh0eXBlb2Ygdi5jbG9uZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB2LmNsb25lKCk7XG4gIH1cblxuICAvLyBoYW5kbGUgb3RoZXIgY3VzdG9tIHR5cGVzXG4gIGlmIChFSlNPTi5faXNDdXN0b21UeXBlKHYpKSB7XG4gICAgcmV0dXJuIEVKU09OLmZyb21KU09OVmFsdWUoRUpTT04uY2xvbmUoRUpTT04udG9KU09OVmFsdWUodikpLCB0cnVlKTtcbiAgfVxuXG4gIC8vIGhhbmRsZSBvdGhlciBvYmplY3RzXG4gIHJldCA9IHt9O1xuICBPYmplY3Qua2V5cyh2KS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICByZXRba2V5XSA9IEVKU09OLmNsb25lKHZba2V5XSk7XG4gIH0pO1xuICByZXR1cm4gcmV0O1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBBbGxvY2F0ZSBhIG5ldyBidWZmZXIgb2YgYmluYXJ5IGRhdGEgdGhhdCBFSlNPTiBjYW4gc2VyaWFsaXplLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAcGFyYW0ge051bWJlcn0gc2l6ZSBUaGUgbnVtYmVyIG9mIGJ5dGVzIG9mIGJpbmFyeSBkYXRhIHRvIGFsbG9jYXRlLlxuICovXG4vLyBFSlNPTi5uZXdCaW5hcnkgaXMgdGhlIHB1YmxpYyBkb2N1bWVudGVkIEFQSSBmb3IgdGhpcyBmdW5jdGlvbmFsaXR5LFxuLy8gYnV0IHRoZSBpbXBsZW1lbnRhdGlvbiBpcyBpbiB0aGUgJ2Jhc2U2NCcgcGFja2FnZSB0byBhdm9pZFxuLy8gaW50cm9kdWNpbmcgYSBjaXJjdWxhciBkZXBlbmRlbmN5LiAoSWYgdGhlIGltcGxlbWVudGF0aW9uIHdlcmUgaGVyZSxcbi8vIHRoZW4gJ2Jhc2U2NCcgd291bGQgaGF2ZSB0byB1c2UgRUpTT04ubmV3QmluYXJ5LCBhbmQgJ2Vqc29uJyB3b3VsZFxuLy8gYWxzbyBoYXZlIHRvIHVzZSAnYmFzZTY0Jy4pXG5FSlNPTi5uZXdCaW5hcnkgPSBCYXNlNjQubmV3QmluYXJ5O1xuXG5leHBvcnQgeyBFSlNPTiB9O1xuIiwiLy8gQmFzZWQgb24ganNvbjIuanMgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vZG91Z2xhc2Nyb2NrZm9yZC9KU09OLWpzXG4vL1xuLy8gICAganNvbjIuanNcbi8vICAgIDIwMTItMTAtMDhcbi8vXG4vLyAgICBQdWJsaWMgRG9tYWluLlxuLy9cbi8vICAgIE5PIFdBUlJBTlRZIEVYUFJFU1NFRCBPUiBJTVBMSUVELiBVU0UgQVQgWU9VUiBPV04gUklTSy5cblxuZnVuY3Rpb24gcXVvdGUoc3RyaW5nKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShzdHJpbmcpO1xufVxuXG5jb25zdCBzdHIgPSAoa2V5LCBob2xkZXIsIHNpbmdsZUluZGVudCwgb3V0ZXJJbmRlbnQsIGNhbm9uaWNhbCkgPT4ge1xuICBjb25zdCB2YWx1ZSA9IGhvbGRlcltrZXldO1xuXG4gIC8vIFdoYXQgaGFwcGVucyBuZXh0IGRlcGVuZHMgb24gdGhlIHZhbHVlJ3MgdHlwZS5cbiAgc3dpdGNoICh0eXBlb2YgdmFsdWUpIHtcbiAgY2FzZSAnc3RyaW5nJzpcbiAgICByZXR1cm4gcXVvdGUodmFsdWUpO1xuICBjYXNlICdudW1iZXInOlxuICAgIC8vIEpTT04gbnVtYmVycyBtdXN0IGJlIGZpbml0ZS4gRW5jb2RlIG5vbi1maW5pdGUgbnVtYmVycyBhcyBudWxsLlxuICAgIHJldHVybiBpc0Zpbml0ZSh2YWx1ZSkgPyBTdHJpbmcodmFsdWUpIDogJ251bGwnO1xuICBjYXNlICdib29sZWFuJzpcbiAgICByZXR1cm4gU3RyaW5nKHZhbHVlKTtcbiAgLy8gSWYgdGhlIHR5cGUgaXMgJ29iamVjdCcsIHdlIG1pZ2h0IGJlIGRlYWxpbmcgd2l0aCBhbiBvYmplY3Qgb3IgYW4gYXJyYXkgb3JcbiAgLy8gbnVsbC5cbiAgY2FzZSAnb2JqZWN0JzpcbiAgICAvLyBEdWUgdG8gYSBzcGVjaWZpY2F0aW9uIGJsdW5kZXIgaW4gRUNNQVNjcmlwdCwgdHlwZW9mIG51bGwgaXMgJ29iamVjdCcsXG4gICAgLy8gc28gd2F0Y2ggb3V0IGZvciB0aGF0IGNhc2UuXG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuICdudWxsJztcbiAgICB9XG4gICAgLy8gTWFrZSBhbiBhcnJheSB0byBob2xkIHRoZSBwYXJ0aWFsIHJlc3VsdHMgb2Ygc3RyaW5naWZ5aW5nIHRoaXMgb2JqZWN0XG4gICAgLy8gdmFsdWUuXG4gICAgY29uc3QgaW5uZXJJbmRlbnQgPSBvdXRlckluZGVudCArIHNpbmdsZUluZGVudDtcbiAgICBjb25zdCBwYXJ0aWFsID0gW107XG5cbiAgICAvLyBJcyB0aGUgdmFsdWUgYW4gYXJyYXk/XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8ICh7fSkuaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgJ2NhbGxlZScpKSB7XG4gICAgICAvLyBUaGUgdmFsdWUgaXMgYW4gYXJyYXkuIFN0cmluZ2lmeSBldmVyeSBlbGVtZW50LiBVc2UgbnVsbCBhcyBhXG4gICAgICAvLyBwbGFjZWhvbGRlciBmb3Igbm9uLUpTT04gdmFsdWVzLlxuICAgICAgY29uc3QgbGVuZ3RoID0gdmFsdWUubGVuZ3RoO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBwYXJ0aWFsW2ldID1cbiAgICAgICAgICBzdHIoaSwgdmFsdWUsIHNpbmdsZUluZGVudCwgaW5uZXJJbmRlbnQsIGNhbm9uaWNhbCkgfHwgJ251bGwnO1xuICAgICAgfVxuXG4gICAgICAvLyBKb2luIGFsbCBvZiB0aGUgZWxlbWVudHMgdG9nZXRoZXIsIHNlcGFyYXRlZCB3aXRoIGNvbW1hcywgYW5kIHdyYXBcbiAgICAgIC8vIHRoZW0gaW4gYnJhY2tldHMuXG4gICAgICBsZXQgdjtcbiAgICAgIGlmIChwYXJ0aWFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2ID0gJ1tdJztcbiAgICAgIH0gZWxzZSBpZiAoaW5uZXJJbmRlbnQpIHtcbiAgICAgICAgdiA9ICdbXFxuJyArXG4gICAgICAgICAgaW5uZXJJbmRlbnQgK1xuICAgICAgICAgIHBhcnRpYWwuam9pbignLFxcbicgK1xuICAgICAgICAgIGlubmVySW5kZW50KSArXG4gICAgICAgICAgJ1xcbicgK1xuICAgICAgICAgIG91dGVySW5kZW50ICtcbiAgICAgICAgICAnXSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2ID0gJ1snICsgcGFydGlhbC5qb2luKCcsJykgKyAnXSc7XG4gICAgICB9XG4gICAgICByZXR1cm4gdjtcbiAgICB9XG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggYWxsIG9mIHRoZSBrZXlzIGluIHRoZSBvYmplY3QuXG4gICAgbGV0IGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gICAgaWYgKGNhbm9uaWNhbCkge1xuICAgICAga2V5cyA9IGtleXMuc29ydCgpO1xuICAgIH1cbiAgICBrZXlzLmZvckVhY2goayA9PiB7XG4gICAgICB2ID0gc3RyKGssIHZhbHVlLCBzaW5nbGVJbmRlbnQsIGlubmVySW5kZW50LCBjYW5vbmljYWwpO1xuICAgICAgaWYgKHYpIHtcbiAgICAgICAgcGFydGlhbC5wdXNoKHF1b3RlKGspICsgKGlubmVySW5kZW50ID8gJzogJyA6ICc6JykgKyB2KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEpvaW4gYWxsIG9mIHRoZSBtZW1iZXIgdGV4dHMgdG9nZXRoZXIsIHNlcGFyYXRlZCB3aXRoIGNvbW1hcyxcbiAgICAvLyBhbmQgd3JhcCB0aGVtIGluIGJyYWNlcy5cbiAgICBpZiAocGFydGlhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHYgPSAne30nO1xuICAgIH0gZWxzZSBpZiAoaW5uZXJJbmRlbnQpIHtcbiAgICAgIHYgPSAne1xcbicgK1xuICAgICAgICBpbm5lckluZGVudCArXG4gICAgICAgIHBhcnRpYWwuam9pbignLFxcbicgK1xuICAgICAgICBpbm5lckluZGVudCkgK1xuICAgICAgICAnXFxuJyArXG4gICAgICAgIG91dGVySW5kZW50ICtcbiAgICAgICAgJ30nO1xuICAgIH0gZWxzZSB7XG4gICAgICB2ID0gJ3snICsgcGFydGlhbC5qb2luKCcsJykgKyAnfSc7XG4gICAgfVxuICAgIHJldHVybiB2O1xuXG4gIGRlZmF1bHQ6IC8vIERvIG5vdGhpbmdcbiAgfVxufTtcblxuLy8gSWYgdGhlIEpTT04gb2JqZWN0IGRvZXMgbm90IHlldCBoYXZlIGEgc3RyaW5naWZ5IG1ldGhvZCwgZ2l2ZSBpdCBvbmUuXG5jb25zdCBjYW5vbmljYWxTdHJpbmdpZnkgPSAodmFsdWUsIG9wdGlvbnMpID0+IHtcbiAgLy8gTWFrZSBhIGZha2Ugcm9vdCBvYmplY3QgY29udGFpbmluZyBvdXIgdmFsdWUgdW5kZXIgdGhlIGtleSBvZiAnJy5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHQgb2Ygc3RyaW5naWZ5aW5nIHRoZSB2YWx1ZS5cbiAgY29uc3QgYWxsT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgIGluZGVudDogJycsXG4gICAgY2Fub25pY2FsOiBmYWxzZSxcbiAgfSwgb3B0aW9ucyk7XG4gIGlmIChhbGxPcHRpb25zLmluZGVudCA9PT0gdHJ1ZSkge1xuICAgIGFsbE9wdGlvbnMuaW5kZW50ID0gJyAgJztcbiAgfSBlbHNlIGlmICh0eXBlb2YgYWxsT3B0aW9ucy5pbmRlbnQgPT09ICdudW1iZXInKSB7XG4gICAgbGV0IG5ld0luZGVudCA9ICcnO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWxsT3B0aW9ucy5pbmRlbnQ7IGkrKykge1xuICAgICAgbmV3SW5kZW50ICs9ICcgJztcbiAgICB9XG4gICAgYWxsT3B0aW9ucy5pbmRlbnQgPSBuZXdJbmRlbnQ7XG4gIH1cbiAgcmV0dXJuIHN0cignJywgeycnOiB2YWx1ZX0sIGFsbE9wdGlvbnMuaW5kZW50LCAnJywgYWxsT3B0aW9ucy5jYW5vbmljYWwpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY2Fub25pY2FsU3RyaW5naWZ5O1xuIl19
