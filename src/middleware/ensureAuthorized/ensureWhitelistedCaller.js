'use strict';

const R = require('ramda');

const { error, errors } = require('@aliencreations/node-error');

const ensureWhitelistedCaller = verified => {
  const whitelist = JSON.parse(process.env.WHITELIST);

  const isWhitelistedCaller = R.includes(verified.key, whitelist[verified.aud]);

  if (!isWhitelistedCaller) {
    throw error(errors.auth.UNAUTHORIZED_API_ACCESS({
      debug : {
        internalMessage : `Unauthorized - caller ${verified.key} is not whitelisted with audience ${verified.aud}`
      }
    }));
  }

  return verified;
};

module.exports = ensureWhitelistedCaller;
