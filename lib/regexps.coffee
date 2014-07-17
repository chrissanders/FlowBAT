share.linkRegExp = new RegExp([
  # The groups
  '(', # 1. Character before the link
  '\\s|[^a-zA-Z0-9.\\+_\\/"\\>\\-]|^',
  ')(?:', # Main group
  '(', # 2. Email address (optional)
  '[a-zA-Z0-9\\+_\\-]+',
  '(?:',
  '\\.[a-zA-Z0-9\\+_\\-]+',
  ')*@',
  ')?(', # 3. Protocol (optional)
  'http:\\/\\/|https:\\/\\/|ftp:\\/\\/',
  ')?(?:(', # 4. Domain & Subdomains
  '(?:(?:[a-z0-9_%\\-_+]*[a-z][a-z0-9_%\\-_+]*[.:])+)',
  ')(', # 5. Top-level domain - http://en.wikipedia.org/wiki/List_of_Internet_top-level_domains
  '(?:com|ca|co|edu|gov|net|org|dev|biz|cat|int|pro|tel|mil|aero|asia|coop|info|jobs|mobi|museum|name|post|travel|local|[0-9]{2,}|[a-z]{2})',
  ')|file:\\/\\/)(', # 6. Query string (optional)
  '(?:',
  '[\\/|\\?]',
  '(?:',
  '[\\-a-zA-Z0-9_%#*&+=~!?,;:.\\/]*',
  ')*',
  ')',
  '[\\-\\/a-zA-Z0-9_%#*&+=~]',
  '|',
  '\\/?',
  ')?',
  ')(', # 7. Character after the link
  '[^a-zA-Z0-9\\+_\\/"\\<\\-]|$',
  ')'
].join(''), 'mg')

share.emailLinkRegExp = /(<[a-z]+ href=\")(http:\/\/)([a-zA-Z0-9\+_\-]+(?:\.[a-zA-Z0-9\+_\-]+)*@)/g

share.emailRegex = /^[^@]+@[^@]+$/gi

share.createTextSearchRegexp = (text, bounds = false) ->
  text = share.escapeRegexp(text)
  if bounds
    if bounds is "left"
      text = "^" + text
    else if bounds is "right"
      text = text + "$"
    else
      text = "^" + text + "$"
  new RegExp(text, "i")

share.escapeRegexp = (text) ->
  text.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1")
