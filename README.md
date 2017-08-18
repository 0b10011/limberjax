# limberjax

[![Build Status](https://travis-ci.org/0b10011/limberjax.svg?branch=master)](https://travis-ci.org/0b10011/limberjax) [![NPM version](https://badge.fury.io/js/limberjax.png)](http://badge.fury.io/js/limberjax) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

limberjax is a [jQuery](https://jquery.com/) plugin that adds support for partial page loads with ajax while fully supporting URLs with `pushState`.

**Warning:** limberjax is not quite ready for production. Some things are still broken/untested (eg, 404/500 errors), and this code will change/break quite a bit before release.

limberjax intercepts link clicks and form submits, submits them to your server via ajax, parses the response, and replaces the appropriate parts of the existing page with the new content.

Benefits:

- Client only has to download, parse, and process/execute CSS and JavaScript once
- Server can render only what's needed for the request (eg, skip layout render)

## Quickstart

This will let you immediately see the majority of the benefits of limberjax on the client without making more in-depth changes on the server yet.

1. Save [limberjax.js](https://github.com/0b10011/limberjax/blob/master/src/limberjax.js) to your project (minify/uglify to your liking)
2. Add `new jQuery.Limberjax("#your-content-wrapper");` to your code
3. On the server, return HTTP response code `412 Precondition Failed` if the `limberjax` query parameter's value does not equal the version on the server (this is *your* code's version, not limberjax's; a git commit id works well)
