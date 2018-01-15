(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/regexps.coffee                                                  //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
share.linkRegExp = new RegExp([// The groups                           // 1
'(', // 1. Character before the link                                   // 3
'\\s|[^a-zA-Z0-9.\\+_\\/"\\>\\-]|^', ')(?:', // Main group             // 4
'(', // 2. Email address (optional)                                    // 6
'[a-zA-Z0-9\\+_\\-]+', '(?:', '\\.[a-zA-Z0-9\\+_\\-]+', ')*@', ')?(', // 3. Protocol (optional)
'http:\\/\\/|https:\\/\\/|ftp:\\/\\/', ')?(?:(', // 4. Domain & Subdomains
'(?:(?:[a-z0-9_%\\-_+]*[a-z][a-z0-9_%\\-_+]*[.:])+)', ')(', // 5. Top-level domain - http://en.wikipedia.org/wiki/List_of_Internet_top-level_domains
'(?:com|ca|co|edu|gov|net|org|dev|biz|cat|int|pro|tel|mil|aero|asia|coop|info|jobs|mobi|museum|name|post|travel|local|[0-9]{2,}|[a-z]{2})', ')|file:\\/\\/)(', // 6. Query string (optional)
'(?:', '[\\/|\\?]', '(?:', '[\\-a-zA-Z0-9_%#*&+=~!?,;:.\\/]*', ')*', ')', '[\\-\\/a-zA-Z0-9_%#*&+=~]', '|', '\\/?', ')?', ')(', // 7. Character after the link
'[^a-zA-Z0-9\\+_\\/"\\<\\-]|$', ')'].join(''), 'mg');                  // 29
share.emailLinkRegExp = /(<[a-z]+ href=\")(http:\/\/)([a-zA-Z0-9\+_\-]+(?:\.[a-zA-Z0-9\+_\-]+)*@)/g;
share.emailRegex = /^[^@]+@[^@]+$/gi;                                  // 35
                                                                       //
share.createTextSearchRegexp = function (text) {                       // 37
  var bounds = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  text = share.escapeRegexp(text);                                     // 38
                                                                       //
  if (bounds) {                                                        // 39
    if (bounds === "left") {                                           // 40
      text = "^" + text;                                               // 41
    } else if (bounds === "right") {                                   // 40
      text = text + "$";                                               // 43
    } else {                                                           // 42
      text = "^" + text + "$";                                         // 45
    }                                                                  // 39
  }                                                                    // 47
                                                                       //
  return new RegExp(text, "i");                                        // 48
};                                                                     // 37
                                                                       //
share.escapeRegexp = function (text) {                                 // 48
  return text.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");               // 52
};                                                                     // 48
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceURL=meteor://💻app/app/lib/regexps.coffee
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvbGliL3JlZ2V4cHMuY29mZmVlIl0sIm5hbWVzIjpbInNoYXJlIiwibGlua1JlZ0V4cCIsIlJlZ0V4cCIsImpvaW4iLCJlbWFpbExpbmtSZWdFeHAiLCJlbWFpbFJlZ2V4IiwiY3JlYXRlVGV4dFNlYXJjaFJlZ2V4cCIsInRleHQiLCJib3VuZHMiLCJlc2NhcGVSZWdleHAiLCJyZXBsYWNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQUEsTUFBTUMsVUFBTixHQUFtQixJQUFJQyxNQUFKLENBQVcsQ0FDNUI7QUFDQSxHQUY0QjtBQUc1QixtQ0FINEIsRUFJNUIsTUFKNEI7QUFLNUIsR0FMNEI7QUFNNUIscUJBTjRCLEVBTzVCLEtBUDRCLEVBUTVCLHdCQVI0QixFQVM1QixLQVQ0QixFQVU1QixLQVY0QjtBQVc1QixxQ0FYNEIsRUFZNUIsUUFaNEI7QUFhNUIsb0RBYjRCLEVBYzVCLElBZDRCO0FBZTVCLDBJQWY0QixFQWdCNUIsaUJBaEI0QjtBQWlCNUIsS0FqQjRCLEVBa0I1QixXQWxCNEIsRUFtQjVCLEtBbkI0QixFQW9CNUIsa0NBcEI0QixFQXFCNUIsSUFyQjRCLEVBc0I1QixHQXRCNEIsRUF1QjVCLDJCQXZCNEIsRUF3QjVCLEdBeEI0QixFQXlCNUIsTUF6QjRCLEVBMEI1QixJQTFCNEIsRUEyQjVCLElBM0I0QjtBQTRCNUIsOEJBNUI0QixFQTZCNUIsR0E3QjRCLEVBOEI1QkMsSUE5QjRCLENBOEJ2QixFQTlCdUIsQ0FBWCxFQThCUCxJQTlCTyxDQUFuQjtBQWdDQUgsTUFBTUksZUFBTixHQUF3QiwyRUFBeEI7QUFFQUosTUFBTUssVUFBTixHQUFtQixpQkFBbkI7O0FBRUFMLE1BQU1NLHNCQUFOLEdBQStCLFVBQUNDLElBQUQ7QUFBQSxNQUFPQyxNQUFQLHVFQUFnQixLQUFoQjtBQUM3QkQsU0FBT1AsTUFBTVMsWUFBTixDQUFtQkYsSUFBbkIsQ0FBUDs7QUFDQSxNQUFHQyxNQUFIO0FBQ0UsUUFBR0EsV0FBVSxNQUFiO0FBQ0VELGFBQU8sTUFBTUEsSUFBYjtBQURGLFdBRUssSUFBR0MsV0FBVSxPQUFiO0FBQ0hELGFBQU9BLE9BQU8sR0FBZDtBQURHO0FBR0hBLGFBQU8sTUFBTUEsSUFBTixHQUFhLEdBQXBCO0FBTko7QUFRQzs7QUFDRCxTQUZBLElBQUlMLE1BQUosQ0FBV0ssSUFBWCxFQUFpQixHQUFqQixDQUVBO0FBWDZCLENBQS9COztBQVdBUCxNQUFNUyxZQUFOLEdBQXFCLFVBQUNGLElBQUQ7QUFJbkIsU0FIQUEsS0FBS0csT0FBTCxDQUFhLHdCQUFiLEVBQXVDLE1BQXZDLENBR0E7QUFKbUIsQ0FBckIsMkUiLCJmaWxlIjoiL2xpYi9yZWdleHBzLmNvZmZlZSIsInNvdXJjZXNDb250ZW50IjpbInNoYXJlLmxpbmtSZWdFeHAgPSBuZXcgUmVnRXhwKFtcbiAgIyBUaGUgZ3JvdXBzXG4gICcoJywgIyAxLiBDaGFyYWN0ZXIgYmVmb3JlIHRoZSBsaW5rXG4gICdcXFxcc3xbXmEtekEtWjAtOS5cXFxcK19cXFxcL1wiXFxcXD5cXFxcLV18XicsXG4gICcpKD86JywgIyBNYWluIGdyb3VwXG4gICcoJywgIyAyLiBFbWFpbCBhZGRyZXNzIChvcHRpb25hbClcbiAgJ1thLXpBLVowLTlcXFxcK19cXFxcLV0rJyxcbiAgJyg/OicsXG4gICdcXFxcLlthLXpBLVowLTlcXFxcK19cXFxcLV0rJyxcbiAgJykqQCcsXG4gICcpPygnLCAjIDMuIFByb3RvY29sIChvcHRpb25hbClcbiAgJ2h0dHA6XFxcXC9cXFxcL3xodHRwczpcXFxcL1xcXFwvfGZ0cDpcXFxcL1xcXFwvJyxcbiAgJyk/KD86KCcsICMgNC4gRG9tYWluICYgU3ViZG9tYWluc1xuICAnKD86KD86W2EtejAtOV8lXFxcXC1fK10qW2Etel1bYS16MC05XyVcXFxcLV8rXSpbLjpdKSspJyxcbiAgJykoJywgIyA1LiBUb3AtbGV2ZWwgZG9tYWluIC0gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9MaXN0X29mX0ludGVybmV0X3RvcC1sZXZlbF9kb21haW5zXG4gICcoPzpjb218Y2F8Y298ZWR1fGdvdnxuZXR8b3JnfGRldnxiaXp8Y2F0fGludHxwcm98dGVsfG1pbHxhZXJvfGFzaWF8Y29vcHxpbmZvfGpvYnN8bW9iaXxtdXNldW18bmFtZXxwb3N0fHRyYXZlbHxsb2NhbHxbMC05XXsyLH18W2Etel17Mn0pJyxcbiAgJyl8ZmlsZTpcXFxcL1xcXFwvKSgnLCAjIDYuIFF1ZXJ5IHN0cmluZyAob3B0aW9uYWwpXG4gICcoPzonLFxuICAnW1xcXFwvfFxcXFw/XScsXG4gICcoPzonLFxuICAnW1xcXFwtYS16QS1aMC05XyUjKiYrPX4hPyw7Oi5cXFxcL10qJyxcbiAgJykqJyxcbiAgJyknLFxuICAnW1xcXFwtXFxcXC9hLXpBLVowLTlfJSMqJis9fl0nLFxuICAnfCcsXG4gICdcXFxcLz8nLFxuICAnKT8nLFxuICAnKSgnLCAjIDcuIENoYXJhY3RlciBhZnRlciB0aGUgbGlua1xuICAnW15hLXpBLVowLTlcXFxcK19cXFxcL1wiXFxcXDxcXFxcLV18JCcsXG4gICcpJ1xuXS5qb2luKCcnKSwgJ21nJylcblxuc2hhcmUuZW1haWxMaW5rUmVnRXhwID0gLyg8W2Etel0rIGhyZWY9XFxcIikoaHR0cDpcXC9cXC8pKFthLXpBLVowLTlcXCtfXFwtXSsoPzpcXC5bYS16QS1aMC05XFwrX1xcLV0rKSpAKS9nXG5cbnNoYXJlLmVtYWlsUmVnZXggPSAvXlteQF0rQFteQF0rJC9naVxuXG5zaGFyZS5jcmVhdGVUZXh0U2VhcmNoUmVnZXhwID0gKHRleHQsIGJvdW5kcyA9IGZhbHNlKSAtPlxuICB0ZXh0ID0gc2hhcmUuZXNjYXBlUmVnZXhwKHRleHQpXG4gIGlmIGJvdW5kc1xuICAgIGlmIGJvdW5kcyBpcyBcImxlZnRcIlxuICAgICAgdGV4dCA9IFwiXlwiICsgdGV4dFxuICAgIGVsc2UgaWYgYm91bmRzIGlzIFwicmlnaHRcIlxuICAgICAgdGV4dCA9IHRleHQgKyBcIiRcIlxuICAgIGVsc2VcbiAgICAgIHRleHQgPSBcIl5cIiArIHRleHQgKyBcIiRcIlxuICBuZXcgUmVnRXhwKHRleHQsIFwiaVwiKVxuXG5zaGFyZS5lc2NhcGVSZWdleHAgPSAodGV4dCkgLT5cbiAgdGV4dC5yZXBsYWNlKC8oWy4/KiteJFtcXF1cXFxcKCl7fXwtXSkvZywgXCJcXFxcJDFcIilcbiJdfQ==
