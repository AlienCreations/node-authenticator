'use strict';

const _deleteToken = namespace => cache => token => cache.deleteItem(`${namespace}:${token}`);

module.exports = _deleteToken;
