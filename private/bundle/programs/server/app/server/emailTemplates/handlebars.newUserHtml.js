(function(){Handlebars = Handlebars || {};Handlebars.templates = Handlebars.templates || {} ;var template = OriginalHandlebars.compile("{{{t \"messages.newUser.html\" user=user email=email password=password settings=settings}}}\n");Handlebars.templates["newUserHtml"] = function (data, partials) { partials = (partials || {});return template(data || {}, { helpers: OriginalHandlebars.helpers,partials: partials,name: "newUserHtml"});};

})();
