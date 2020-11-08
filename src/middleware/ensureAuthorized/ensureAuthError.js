'use strict';

const { error, errors } = require('@aliencreations/node-error');

const ensureAuthError = err => {
  return err.isInternalError ? err : error(errors.system.UNCAUGHT({ debug : { originalError : err } }));
};

module.exports = ensureAuthError;
