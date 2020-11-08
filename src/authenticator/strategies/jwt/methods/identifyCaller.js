'use strict';

const R = require('ramda');

const { error, errors } = require('@aliencreations/node-error');

/**
 * Get a token from a header or from a `token` query string parameter.
 * Function expects header token to be JWT which is prefixed with 'Bearer '.
 * @param {Object} req ExpressJS request object
 * @returns {String}
 */
const identifyCaller = req => {

  if (!req) {
    throw error(errors.auth.MISSING_REQ());
  }

  const isBearer         = R.identical('Bearer'),
        headerToken      = R.pathOr('', ['headers', 'authorization'], req),
        headerTokenParts = R.split(' ', headerToken),
        headerTokenType  = R.head(headerTokenParts),
        queryToken       = R.path(['query', 'token'], req);

  return isBearer(headerTokenType) ? R.last(headerTokenParts) : R.defaultTo('', queryToken);
};

module.exports = identifyCaller;
