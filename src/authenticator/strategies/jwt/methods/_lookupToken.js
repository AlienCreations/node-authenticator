'use strict';

const _lookupToken = namespace => cache => token => cache.getItem(`${namespace}:${token}`);

module.exports = _lookupToken;
