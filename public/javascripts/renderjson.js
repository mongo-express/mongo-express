// Copyright © 2013-2014 David Caldwell <david@porkrind.org>
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
// SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
// OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
// CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

// Usage
// -----
// The module exports one entry point, the `renderjson()` function. It takes in
// the JSON you want to render as a single argument and returns an HTML
// element.
//
// Options
// -------
// renderjson.set_icons("+", "-")
//   This Allows you to override the disclosure icons.
//
// renderjson.set_show_to_level(level)
//   Pass the number of levels to expand when rendering. The default is 0, which
//   starts with everything collapsed. As a special case, if level is the string
//   "all" then it will start with everything expanded.
//
// renderjson.set_max_string_length(length)
//   Strings will be truncated and made expandable if they are longer than
//   `length`. As a special case, if `length` is the string "none" then
//   there will be no truncation. The default is "none".
//
// renderjson.set_sort_objects(sort_bool)
//   Sort objects by key (default: false)
//
// Theming
// -------
// The HTML output uses a number of classes so that you can theme it the way
// you'd like:
//     .disclosure    ("⊕", "⊖")
//     .syntax        (",", ":", "{", "}", "[", "]")
//     .string        (includes quotes)
//     .number
//     .boolean
//     .key           (object key)
//     .keyword       ("null", "undefined")
//     .object.syntax ("{", "}")
//     .array.syntax  ("[", "]")

var module;
(module||{}).exports = renderjson = (function() {
    var themetext = function(/* [class, text]+ */) {
        var spans = [];
        while (arguments.length)
            spans.push(append(span(Array.prototype.shift.call(arguments)),
                              text(Array.prototype.shift.call(arguments))));
        return spans;
    };
    var append = function(/* el, ... */) {
        var el = Array.prototype.shift.call(arguments);
        for (var a=0; a<arguments.length; a++)
            if (arguments[a].constructor == Array)
                append.apply(this, [el].concat(arguments[a]));
            else
                el.appendChild(arguments[a]);
        return el;
    };
    var prepend = function(el, child) {
        el.insertBefore(child, el.firstChild);
        return el;
    }
    var isempty = function(obj) { for (var k in obj) if (obj.hasOwnProperty(k)) return false;
                                  return true; }
    var text = function(txt) { return document.createTextNode(txt) };
    var div = function() { return document.createElement("div") };
    var span = function(classname) { var s = document.createElement("span");
                                     if (classname) s.className = classname;
                                     return s; };
    var A = function A(txt, classname, callback) { var a = document.createElement("a");
                                                   if (classname) a.className = classname;
                                                   a.appendChild(text(txt));
                                                   a.href = '#';
                                                   a.onclick = function(e) { callback(); e.stopPropagation(); return false; };
                                                   return a; };

    function _renderjson(json, indent, dont_indent, show_level, max_string, sort_objects) {
        var my_indent = dont_indent ? "" : indent;

        var disclosure = function(open, placeholder, close, type, builder) {
            var content;
            var empty = span(type);
            var show = function() { if (!content) append(empty.parentNode,
                                                         content = prepend(builder(),
                                                                           A(renderjson.hide, "disclosure",
                                                                             function() { content.style.display="none";
                                                                                          empty.style.display="inline"; } )));
                                    content.style.display="inline";
                                    empty.style.display="none"; };
            append(empty,
                   A(renderjson.show, "disclosure", show),
                   themetext(type+ " syntax", open),
                   A(placeholder, null, show),
                   themetext(type+ " syntax", close));

            var el = append(span(), text(my_indent.slice(0,-1)), empty);
            if (show_level > 0)
                show();
            return el;
        };

        if (json === null) return themetext(null, my_indent, "keyword", "null");
        if (json === void 0) return themetext(null, my_indent, "keyword", "undefined");

        if (typeof(json) == "string" && json.length > max_string)
            return disclosure('"', json.substr(0,max_string)+" ...", '"', "string", function () {
                return append(span("string"), themetext(null, my_indent, "string", JSON.stringify(json)));
            });

        if (typeof(json) != "object") // Strings, numbers and bools
            return themetext(null, my_indent, typeof(json), JSON.stringify(json));

        if (json.constructor == Array) {
            if (json.length == 0) return themetext(null, my_indent, "array syntax", "[]");

            return disclosure("[", " ... ", "]", "array", function () {
                var as = append(span("array"), themetext("array syntax", "[", null, "\n"));
                for (var i=0; i<json.length; i++)
                    append(as,
                           _renderjson(json[i], indent+"    ", false, show_level-1, max_string, sort_objects),
                           i != json.length-1 ? themetext("syntax", ",") : [],
                           text("\n"));
                append(as, themetext(null, indent, "array syntax", "]"));
                return as;
            });
        }

        // object
        if (isempty(json))
            return themetext(null, my_indent, "object syntax", "{}");

        return disclosure("{", "...", "}", "object", function () {
            var os = append(span("object"), themetext("object syntax", "{", null, "\n"));
            for (var k in json) var last = k;
            var keys = Object.keys(json);
            if (sort_objects)
                keys = keys.sort();
            for (var i in keys) {
                var k = keys[i];
                append(os, themetext(null, indent+"    ", "key", '"'+k+'"', "object syntax", ': '),
                       _renderjson(json[k], indent+"    ", true, show_level-1, max_string, sort_objects),
                       k != last ? themetext("syntax", ",") : [],
                       text("\n"));
            }
            append(os, themetext(null, indent, "object syntax", "}"));
            return os;
        });
    }

    var renderjson = function renderjson(json)
    {
        var pre = append(document.createElement("pre"), _renderjson(json, "", false, renderjson.show_to_level, renderjson.max_string_length, renderjson.sort_objects));
        pre.className = "renderjson";
        return pre;
    }
    renderjson.set_icons = function(show, hide) { renderjson.show = show;
                                                  renderjson.hide = hide;
                                                  return renderjson; };
    renderjson.set_show_to_level = function(level) { renderjson.show_to_level = typeof level == "string" &&
                                                                                level.toLowerCase() === "all" ? Number.MAX_VALUE
                                                                                                              : level;
                                                     return renderjson; };
    renderjson.set_max_string_length = function(length) { renderjson.max_string_length = typeof length == "string" &&
                                                                                         length.toLowerCase() === "none" ? Number.MAX_VALUE
                                                                                                                         : length;
                                                          return renderjson; };
    renderjson.set_sort_objects = function(sort_bool) { renderjson.sort_objects = sort_bool;
                                                        return renderjson; };
    // Backwards compatiblity. Use set_show_to_level() for new code.
    renderjson.set_show_by_default = function(show) { renderjson.show_to_level = show ? Number.MAX_VALUE : 0;
                                                      return renderjson; };
    renderjson.set_icons('⊕', '⊖');
    renderjson.set_show_by_default(false);
    renderjson.set_sort_objects(false);
    renderjson.set_max_string_length("none");
    return renderjson;
})();
