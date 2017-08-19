/*!
 * limberjax
 * https://github.com/0b10011/limberjax/
 *
 * Copyright 2017 Brandon Frohs
 * Released under the MIT license
 * https://github.com/0b10011/limberjax/LICENSE
 */

/* global FormData, jQuery, URL, console */
(function ($) {
  'use strict'

  let disabled = false
  let mainContainerSelector
  let mainContainer
  let version
  const Limberjax = function (containerSelector) {
    // While limberjax shouldn't interfere with other code too much,
    // it does rely on classes on the dom that are global
    // and could cause weird things to happen
    // if multiple instances were running alongside eachother.
    if (!(this instanceof Limberjax)) {
      throw new Error('Attemping to call `Limberjax()` directly. Use `new Limberjax()` instead.')
    } else if (window.Limberjax) {
      throw new Error('Attempting to create a second instance of `Limberjax()`. Call `Limberjax.watchAll()` instead.')
    }
    window.Limberjax = this

    if (containerSelector instanceof String) {
      throw new Error('containerSelector must be a string selector')
    }
    mainContainerSelector = containerSelector
    mainContainer = $(containerSelector)
    if (mainContainer.length !== 1) {
      throw new Error('containerSelector must match a single element')
    }

    $.fn.Limberjax = this.watch

    version = $("meta[http-equiv='x-limberjax']").attr('content')

    this.watchAll()
    $(document).on('limberjax:success', function () {
      window.Limberjax.watchAll()
    })

    $(window).on('popstate.limberjax', popstate)

    window.history.scrollRestoration = 'manual'

    window.history.replaceState(buildState({
      'parents': [],
      'mode': 'replace',
      'containerSelector': 'body',
      'contents': $('<div/>').append($('body').contents().clone()),
      'feeds': undefined,
      'scripts': undefined,
      'scrollLeft': $(window).scrollLeft(),
      'scrollTop': $(window).scrollTop(),
      'styles': undefined,
      'title': document.title,
      'url': window.location.href
    }), '', window.location.href)
  }

  const Request = function (options) {
    if (!(this instanceof Request)) {
      throw new Error('Attemping to call `Request()` directly. Use `new Request()` instead.')
    } else if (disabled) {
      throw new Error('Limberjax is disabled due to an error')
    }

    function parse (html, xhr, providedData) {
      let data = {
        'parents': [],
        'mode': providedData.mode,
        'containerSelector': providedData.containerSelector,
        'contents': undefined,
        'feeds': undefined,
        'scripts': undefined,
        'scrollLeft': 0,
        'scrollTop': 0,
        'styles': undefined,
        'title': undefined,
        'url': providedData.url
      }
      providedData = undefined // Avoid accidentally using this instead of `data`

      // If this request does something
      // other than replace on the main container,
      // add the current state as a parent state.
      if (mainContainerSelector !== data.containerSelector || data.mode !== 'replace') {
        const currentState = window.history.state
        $.each(currentState.parents, function () {
          data.parents.push(parseState(this))
        })
        currentState.parents = []
        data.parents.push(parseState(currentState))
      }

      // jQuery's
      if (/<html/i.test(html)) {
        data.contents = findAll(fromHtml(html.match(/<body[^>]*>([\s\S.]*)<\/body>/i)[0]), data.containerSelector)

        let head = fromHtml(html.match(/<head[^>]*>([\s\S.]*)<\/head>/i)[0])

        // Set title
        data.title = findAll(head, 'title').last().text()

        // Get feeds
        data.feeds = findAll(head, 'link[type="application/rss+xml"], link[type="application/atom+xml"]')

        // Get scripts
        data.scripts = findAll(head, 'script[src]')
        findAll(head, 'script:not([src])').each(function () {
          console.error(
            'Inline script found in PJAX <head>. Must add directly to PJAX template.',
            this.textContent.split('\n')
          )
        })

        // Get styles
        data.styles = findAll(head, 'link[rel="stylesheet"][type="text/css"], link[rel="stylesheet"]:not([type])')
      } else {
        html = fromHtml(html)
        data.contents = findAll(fromHtml(html), data.containerSelector)
        data.title = findAll(html, 'title').last().text()
      }

      return data
    }

    function xhrBeforeSend (xhr, settings) {
      const event = trigger(options.target, 'beforeSend', [xhr, settings])

      if (event.isDefaultPrevented()) {
        // Cancel the request
        return false
      }
    }
    function xhrError (xhr, status, error) {
      trigger(options.target, 'error', [xhr, status, error])
    }
    function xhrOutdated (xhr, status, error) {
      trigger(options.target, 'outdated', [xhr, status, error])
    }
    function xhrSuccess (html, status, xhr) {
      let currentState = window.history.state
      if (currentState.limberjax) {
        currentState = parseState(currentState)
        currentState.scrollLeft = $(window).scrollLeft()
        currentState.scrollTop = $(window).scrollTop()
        window.history.replaceState(buildState(currentState), '', currentState.url.toString())
      }

      const redirect = xhr.getResponseHeader('X-Limberjax-Cross-Domain-Redirect')
      if (redirect) {
        window.location = redirect
      }

      const contentType = xhr.getResponseHeader('Content-Type')
      if (contentType.indexOf('text/html') !== 0) {
        throw new Error('Invalid content type `' + contentType + '`')
      }

      const contentDisposition = xhr.getResponseHeader('Content-Disposition')
      if (contentDisposition && contentDisposition.indexOf('attachment') !== -1) {
        throw new Error('Attachment loaded inline')
      }

      trigger(options.target, 'beforeParse', [html, xhr, options])

      const state = parse(html, xhr, options)

      loadState(state)

      window.history.pushState(buildState(state), '', state.url)

      trigger($(state.containerSelector), 'success', [state, status, xhr])
    }
    function xhrComplete (xhr, status) {
      trigger($('body'), 'complete', [xhr, status])
    }

    const defaultOptions = {
      // Method for HTTP request (see https://api.jquery.com/jQuery.ajax/).
      // - "GET"
      // - "POST"
      'method': undefined,

      // URL to be requested.
      // Can be partial or fully formed.
      'url': undefined,

      // How the fetched content will be inserted into the document.
      // - "replace": Replaces the contents of the container
      // - "append": Appended to the end of the container
      'mode': 'replace',

      // Target for fetched content to be inserted in relation to.
      // See `option.mode` for more information.
      'containerSelector': mainContainerSelector,
      'container': mainContainer,

      // Target that user interacted with.
      // Used for events, managing classes, etc during the request.
      // - jQuery object
      target: undefined,

      // Form data (GET or POST)
      // See https://developer.mozilla.org/en-US/docs/Web/API/FormData
      // - FormData
      data: undefined
    }
    const defaultXhrSettings = {
      'accepts': 'text/html',
      'async': true,
      'cache': true,
      'contentType': 'application/x-www-form-urlencoded; charset=UTF-8',
      'crossDomain': false,
      'data': undefined, // `options.data`
      'dataType': 'html',
      'global': true,
      'headers': {
        'X-Requested-With': 'limberjax'
      },
      'ifModified': false,
      'isLocal': false,
      'method': undefined, // `options.method`
      'processData': true,
      'timeout': 0, // No timeout, we'll handle internally
      'traditional': false,
      'url': undefined, // `options.url`

      // Callbacks
      'beforeSend': xhrBeforeSend,
      'error': xhrError,
      'statusCode': {
        412: xhrOutdated
      },
      'success': xhrSuccess,
      'complete': xhrComplete
    }

    // Clone options (and inject default values)
    options = $.extend(defaultOptions, options)

    // Verify provided option values
    if (options.method === undefined) {
      throw new Error('No method provided')
    }
    if (options.url === undefined) {
      throw new Error('No url provided')
    }
    switch (options.mode) {
      case 'append':
      case 'replace':
        break
      default:
        throw new Error('Invalid mode `' + options.mode + '`')
    }
    if (options.target === undefined) {
      throw new Error('No target provided')
    }
    if (options.data !== undefined && (
      options.method === 'POST'
      ? !(options.data instanceof FormData)
      : !(options.data instanceof Array)
    )) {
      throw new Error('Data must be undefined or an instance of FormData for POST requests and Array for GET requests')
    }

    // Add limberjax version to url.
    // This forces the browser to cache it separately from other responses
    // and allows the server to return HTTP 412
    // if there's a version mismatch.
    options.url = new URL(options.url, window.location.href)
    options.limberjax_url = new URL(options.url, window.location.href)
    options.limberjax_url.searchParams.set('limberjax', version)

    return $.ajax($.extend(defaultXhrSettings, {
      'data': options.data,
      'method': options.method,
      'url': options.limberjax_url,

      // Required with data
      'processData': options.method !== 'POST',
      'contentType': options.method === 'POST' ? false : undefined
    })).fail(function (xhr, status, err) {
      // Mark limberjax as disabled (will throw new Error(if any methods are called))
      disabled = true

      // Remove all limberjax listeners
      // https://stackoverflow.com/questions/3569393/how-to-unbind-all-event-using-jquery#comment21077312_12053827
      $(document).add('*').off('.limberjax')

      // Log error
      console.error('limberjax request failed')
      console.error(err)
    })
  }

  function trigger (target, eventType, extraParameters) {
    const event = $.Event('limberjax:' + eventType)
    target.trigger(event, extraParameters)
    return event
  }
  // Find all `els` (top level and children) that match `selector`
  function findAll (els, selector) {
    return els.filter(selector).add(els.find(selector))
  }
  function fromHtml (html) {
    return $($.parseHTML(html, document, true))
  }
  function toHtml (jqueryObject) {
    if (jqueryObject === undefined || jqueryObject.length === 0) {
      return undefined
    }

    return $('<div/>').append(jqueryObject.clone()).html()
  }
  function parseState (state) {
    // Build parents
    const parents = []
    $.each(state.parents, function () {
      parents.push(parseState(this))
    })

    return {
      'parents': parents,
      'mode': state.mode,
      'containerSelector': state.containerSelector,
      'contents': fromHtml(state.contents),
      'feeds': fromHtml(state.feeds),
      'scripts': fromHtml(state.scripts),
      'scrollLeft': state.scrollLeft,
      'scrollTop': state.scrollTop,
      'styles': fromHtml(state.styles),
      'title': state.title,
      'url': new URL(state.url)
    }
  }
  function buildState (data) {
    // Build parents
    const parents = []
    $.each(data.parents, function () {
      parents.push(buildState(this))
    })

    return {
      'limberjax': true,
      'parents': parents,
      'mode': data.mode,
      'containerSelector': data.containerSelector,
      'contents': toHtml(data.contents),
      'feeds': toHtml(data.feeds),
      'scripts': toHtml(data.scripts),
      'scrollLeft': data.scrollLeft,
      'scrollTop': data.scrollTop,
      'styles': toHtml(data.styles),
      'title': data.title,
      'url': data.url.toString()
    }
  }
  function loadState (state, parentsNeedLoading) {
    if (parentsNeedLoading) {
      $.each(state.parents, function () {
        loadState(this)
      })
    }

    const container = $(state.containerSelector)

    trigger(container, 'beforeLoad', {
      state: state,
      parentsNeedLoading: parentsNeedLoading
    })

    document.title = state.title || ''

    switch (state.mode) {
      case 'replace':
        container.html(toHtml(state.contents.contents()))
        break
      case 'append':
        container.append(state.contents.contents())
        break
    }

    $(window).scrollLeft(state.scrollLeft)
    $(window).scrollTop(state.scrollTop)
  }
  function popstate (event) {
    const rawState = event.originalEvent.state

    // Not a limberjax state, ignore
    if (!rawState || !rawState.limberjax) {
      return
    }

    const state = parseState(rawState)

    loadState(state, true)

    trigger($(state.containerSelector), 'success', [state])
  }
  function handleClick (event) {
    const link = event.currentTarget
    const $link = $(link)
    const options = {
      'method': 'GET'
    }

    // Ensure the clicked element is an anchor
    if (!$link.is('a')) {
      throw new Error('Clicked element must be an achor element')
    }

    if (
      // Ignore clicks that aren't regular clicks
      event.which > 1 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||

      // Ignore cross origin links
        window.location.protocol !== link.protocol ||
        window.location.hostname !== link.hostname
    ) {
      return
    }

    // Add class for styling link while it loads
    $link.addClass('limberjax-loading')

    // Set options
    options.mode = $link.data('limberjax-mode') || undefined
    options.url = $link.attr('href')
    options.target = $link

    // Prevent default behavior of click event.
    // If an error is thrown,
    // we can handle later.
    event.preventDefault()

    // Make the request!
    new Request(options).fail(function (xhr, status, err) {
      console.log('Failed link click')
      console.log($link)
      link.click() // $link.click() did nothing in (at least) Firefox 54.0
    })
  }
  function handleSubmit (event) {
    const form = event.currentTarget
    const $form = $(form)
    const href = form.action || window.location.href
    const url = new URL(href)
    const options = {
      'contentType': form.enctype,
      'method': form.method.toUpperCase() || 'GET'
    }

    // Ensure the submitted element is a form
    if (!$form.is('form')) {
      throw new Error('Submitted element must be a form element')
    }

    if (
      // Ignore if we can't handle
      window.FormData === undefined ||

      // Ignore cross origin links
        window.location.protocol !== url.protocol ||
        window.location.hostname !== url.hostname
    ) {
      return
    }

    // Can't handle buttons with name/value pair
    if ($(form).find('button[name]').length) {
      return
    }

    // Add class for styling link while it loads
    $form.addClass('limberjax-loading')

    // Set options
    options.mode = $form.data('limberjax-mode') || undefined
    options.url = url.toString()
    options.target = $form
    options.data = options.method === 'POST' ? new FormData(form) : $(form).serializeArray()

    // Prevent default behavior of click event.
    // If an error is thrown,
    // we can handle later.
    event.preventDefault()

    // Make the request!
    new Request(options).fail(function (xhr, status, err) {
      console.log('Failed form submit')
      console.log($form)
      form.submit()
    })
  }

  Limberjax.prototype.watchAll = function () {
    this.watchLinks()
    this.watchForms()
  }
  Limberjax.prototype.watchLinks = function () {
    const limberjack = this
    $('a:not(.limberjax-watched):not([download]):not([data-ignore-limberjax]):not([target="_blank"])').each(function () {
      limberjack.watchLink(this)
    })
  }
  Limberjax.prototype.watchLink = function (el) {
    var $el = $(el)
    $el.addClass('limberjax-watched')
    $el.on('click.limberjax', handleClick)
  }

  Limberjax.prototype.watchForms = function () {
    const limberjack = this
    $('form:not(.limberjax-watched):not([data-ignore-limberjax]):not([target=_blank])').each(function () {
      limberjack.watchForm(this)
    })
  }
  Limberjax.prototype.watchForm = function (el) {
    var $el = $(el)
    $el.addClass('limberjax-watched')
    $el.on('submit.limberjax', handleSubmit)
  }

  Limberjax.prototype.watch = function (el) {
    var $el = $(el)

    if ($el.is('a')) {
      this.watchLink(el)
    } else if ($el.is('form')) {
      this.watchForm(el)
    } else {
      throw new Error('Only <a> and <form> elements can be watched. `' + $el.prop('tagName') + '` provided')
    }
  }

  $.Limberjax = Limberjax
}(jQuery))

new jQuery.Limberjax('#layout-main') // eslint-disable-line no-new
