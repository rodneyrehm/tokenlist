/*
  Implements the DOMTokenList interface
    https://dom.spec.whatwg.org/#interface-domtokenlist

  Inspired by
    https://github.com/bkardell/tokenListFor/blob/master/_tokenListFor.js
    https://github.com/jwilsson/domtokenlist/blob/master/src/DOMTokenList.js
*/
(function (root, factory) {
  'use strict';

  if (typeof exports === 'object') {
    // Node
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else {
    root.TokenList = factory();
  }
}(this, function() {
  'use strict';
  /*global Symbol */

  // https://encoding.spec.whatwg.org/#ascii-whitespace
  // TAB, VT, FF, CR, Space
  var asciiWhiteSpace = /[\u0009\u000A\u000C\u000D\u0020]+/;

  function verifyToken(token) {
    // NOTE: throwing Error instead of DOMException because the latter
    // doesn't work properly across browsers, let alone Node.

    if (token === '') {
      // https://heycam.github.io/webidl/#syntaxerror
      // throw new DOMException('Token must not be the empty string', 'SyntaxError', 12);
      throw new Error('Token must not be the empty string');
    }

    if (asciiWhiteSpace.test(token)) {
      // https://heycam.github.io/webidl/#invalidcharactererror
      // throw new _DOMException('Token must not contain ASCII whitespace', 'InvalidCharacterError', 5);
      throw new Error('Token must not contain ASCII whitespace');
    }
  }

  return function(read, write, supported) {

    var getTokens = function() {
      var value = read();
      if (!value) {
        return [];
      }

      return value.trim().split(asciiWhiteSpace);
    };

    var setTokens = function(tokens) {
      write(tokens.join(' '));
    };

    var TokenList = {
      // https://dom.spec.whatwg.org/#dom-domtokenlist-stringifier
      toString: read,

      // https://dom.spec.whatwg.org/#dom-domtokenlist-item
      item: function(index) {
        // NOTE: unspecified behavior, but implemented in Gecko and Blink
        index = parseInt(index);
        if (isNaN(index)) {
          index = 0;
        }

        return getTokens()[index] || null;
      },

      // https://dom.spec.whatwg.org/#dom-domtokenlist-contains
      contains: function(token) {
        // NOTE: unspecified behavior, but implemented in Gecko and Blink
        verifyToken(token);

        return getTokens().indexOf(token) !== -1;
      },

      // https://dom.spec.whatwg.org/#dom-domtokenlist-add
      add: function() {
        [].forEach.call(arguments, verifyToken);

        var tokens = getTokens();
        var length = tokens.length;

        [].forEach.call(arguments, function(token) {
          if (tokens.indexOf(token) === -1) {
            tokens.push(token);
          }
        });

        if (tokens.length !== length) {
          setTokens(tokens);
        }
      },

      // https://dom.spec.whatwg.org/#dom-domtokenlist-remove
      remove: function() {
        var map = {};
        [].forEach.call(arguments, function(token) {
          verifyToken(token);
          map[token] = true;
        });

        var tokens = getTokens();
        var _tokens = tokens.filter(function(token) {
          return !map[token];
        });

        if (_tokens.length !== tokens.length) {
          setTokens(_tokens);
        }
      },

      // https://dom.spec.whatwg.org/#dom-domtokenlist-toggle
      toggle: function(token, force) {
        verifyToken(token);

        var tokens = getTokens();
        var exists = tokens.indexOf(token) !== -1;

        if (exists) {
          if (!force) {
            // removal of existing token
            var _tokens = tokens.filter(function(_token) {
              return _token !== token;
            });

            setTokens(_tokens);
            return false;
          }

          // forced add of existing token
          return true;
        }

        if (force === false) {
          // forced removal of non-existing token
          return false;
        }

        // add of non-existing token
        tokens.push(token);
        setTokens(tokens);
        return true;
      },

      // https://dom.spec.whatwg.org/#dom-domtokenlist-replace
      // Note: will collapse duplicates, i.e. replace("a", "x")
      // will turn "c a b a a d" into "c x b d",
      replace: function(oldToken, newToken) {
        verifyToken(oldToken);
        verifyToken(newToken);

        var tokens = getTokens();
        var index = tokens.indexOf(oldToken);

        if (index === -1) {
          return;
        }

        tokens[index] = newToken;
        var _tokens = tokens.filter(function(token) {
          return token !== oldToken;
        });

        setTokens(_tokens);
      },

      // https://dom.spec.whatwg.org/#dom-domtokenlist-supports
      // https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/supports
      supports: function(token) {
        if (supported) {
          return Boolean(supported(token.toLowerCase()));
        }

        throw new TypeError('No supported tokens defined');
      },
    };

    Object.defineProperties(TokenList, {
      // https://dom.spec.whatwg.org/#dom-domtokenlist-length
      length: {
        get: function() {
          return getTokens().length;
        },
      },

      // https://dom.spec.whatwg.org/#dom-domtokenlist-value
      value: {
        get: read,
        set: write,
      },
    });

    // iterable<DOMString> https://dom.spec.whatwg.org/#interface-domtokenlist
    var _iterator = typeof Symbol !== 'undefined' ? Symbol.iterator : '@@iterator';
    TokenList[_iterator] = function() {
      var tokens = getTokens();
      var index = 0;

      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
      return {
        next: function() {
          return index < tokens.length
            ? { value: tokens[index++], done: false }
            : { value: undefined, done: true };
        },
      };
    };

    return TokenList;
  };
}));
