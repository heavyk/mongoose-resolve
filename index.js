/*!
 * Express-mongoose
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licenced
 */

/**
 * Version.
 */

exports.version = '0.0.1';

/**
 * Module dependencies.
 */

var Promise = require('mongoose').Promise
  , Query = require('mongoose').Query;

/**
 * Resolves any Queries and Promises within the passed options.
 */

exports.resolve = function resolve (options, callback, nested) {
  var keys = Object.keys(options)
    , i = keys.length
    , remaining = []
    , pending
    , item
    , key;

  while (i--) {
    key = keys[i];
    item = options[key];
    if (item instanceof Query || item instanceof Promise) {
      item.key = key;
      remaining.push(item);
    }
  }

  pending = remaining.length;
  if (options.locals) ++pending;

  if (!pending) {
    return callback(null, options);
  }

  function error (err) {
    if (error.ran) return;
    callback(error.ran = err);
  }

  remaining.forEach(function (item) {
    function handleResult (err, result) {
      if (err) return error(err);
      options[item.key] = result;
      --pending || callback(null, options);
    }

    if (item instanceof Query) {
      item.run(handleResult);
    } else {
      item.addBack(handleResult);
    }
  });

  if (nested) return;

  // locals support
  if (options.locals) {
    return resolve(options.locals, function (err, resolved) {
      if (err) return error(err);
      options.locals = resolved;
      if (--pending) return;
      return callback(null, options);
    }, true);
  }

}

/**
 * Wrap a passed method to resolves all Promise/Query(s)
 * before calling itself.
 */

exports.wrap = function wrap (method) {
	return function (body, headers, status) {
		var self = this;

	  function handleResult (err, result) {
	    if (err) return self.req.next(err);
	    send.call(self, result, headers, status);
	  }

	  if (body instanceof Promise) {
	    return body.addBack(handleResult);
	  }

	  if (body instanceof Query) {
	    return body.run(handleResult);
	  }

	  if ('Object' == body.constructor.name) {
	    return resolve(body, handleResult);
	  }

	  method.call(this, body, headers, status);
	};
};
