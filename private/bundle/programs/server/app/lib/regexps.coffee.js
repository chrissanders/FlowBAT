(function(){__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.linkRegExp = new RegExp(['(', '\\s|[^a-zA-Z0-9.\\+_\\/"\\>\\-]|^', ')(?:', '(', '[a-zA-Z0-9\\+_\\-]+', '(?:', '\\.[a-zA-Z0-9\\+_\\-]+', ')*@', ')?(', 'http:\\/\\/|https:\\/\\/|ftp:\\/\\/', ')?(?:(', '(?:(?:[a-z0-9_%\\-_+]*[a-z][a-z0-9_%\\-_+]*[.:])+)', ')(', '(?:com|ca|co|edu|gov|net|org|dev|biz|cat|int|pro|tel|mil|aero|asia|coop|info|jobs|mobi|museum|name|post|travel|local|[0-9]{2,}|[a-z]{2})', ')|file:\\/\\/)(', '(?:', '[\\/|\\?]', '(?:', '[\\-a-zA-Z0-9_%#*&+=~!?,;:.\\/]*', ')*', ')', '[\\-\\/a-zA-Z0-9_%#*&+=~]', '|', '\\/?', ')?', ')(', '[^a-zA-Z0-9\\+_\\/"\\<\\-]|$', ')'].join(''), 'mg');

share.emailLinkRegExp = /(<[a-z]+ href=\")(http:\/\/)([a-zA-Z0-9\+_\-]+(?:\.[a-zA-Z0-9\+_\-]+)*@)/g;

share.emailRegex = /^[^@]+@[^@]+$/gi;

share.createTextSearchRegexp = function(text, bounds) {
  if (bounds == null) {
    bounds = false;
  }
  text = share.escapeRegexp(text);
  if (bounds) {
    if (bounds === "left") {
      text = "^" + text;
    } else if (bounds === "right") {
      text = text + "$";
    } else {
      text = "^" + text + "$";
    }
  }
  return new RegExp(text, "i");
};

share.escapeRegexp = function(text) {
  return text.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

})();

//# sourceMappingURL=regexps.coffee.js.map
