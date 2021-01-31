'use strict';

const cuid = require('cuid');

const { error, errors } = require('@aliencreations/node-error');

const TWO_HOURS_IN_SECONDS_CACHE_EXPIRE = 60 * 60 * 2;

const generateAndCacheRefreshToken = cache => ({
  payload,
  secret,
  oldRefreshToken,
  renewRefreshToken,
  expires = TWO_HOURS_IN_SECONDS_CACHE_EXPIRE
}) => {
  const refreshToken             = renewRefreshToken || cuid(),
        refreshTokenLookupKey    = `refreshToken:${refreshToken}`,
        oldRefreshTokenLookupKey = `refreshToken:${oldRefreshToken}`,
        refreshTokenLookupData   = { payload, secret };

  if (!payload) {
    throw error(errors.auth.MISSING_REFRESH_TOKEN_PAYLOAD());
  }

  if (!secret) {
    throw error(errors.auth.MISSING_REFRESH_TOKEN_SECRET());
  }

  cache.setItem(refreshTokenLookupKey, expires, refreshTokenLookupData);

  if (oldRefreshToken) {
    cache.deleteItem(oldRefreshTokenLookupKey);
  }

  return refreshToken;
};

module.exports = generateAndCacheRefreshToken;
