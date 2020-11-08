'use strict';

const cuid = require('cuid');

const { error, errors } = require('@aliencreations/node-error');

const TEN_SECONDS_CACHE_EXPIRE = 10;

const generateAndCacheTransferToken = cache => ({
  payload,
  oldTransferToken,
  expires = TEN_SECONDS_CACHE_EXPIRE
}) => {
  const transferToken             = cuid(),
        transferTokenLookupKey    = `transferToken:${transferToken}`,
        oldTransferTokenLookupKey = `transferToken:${oldTransferToken}`,
        transferTokenLookupData   = { payload };

  if (!payload) {
    throw error(errors.auth.MISSING_TRANSFER_TOKEN_PAYLOAD());
  }

  cache.setItem(transferTokenLookupKey, expires, transferTokenLookupData);
  cache.deleteItem(oldTransferTokenLookupKey);

  return transferToken;
};

module.exports = generateAndCacheTransferToken;
