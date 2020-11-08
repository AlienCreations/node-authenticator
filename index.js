'use strict';

const axios = require('axios');

const { error, errors } = require('@aliencreations/node-error');

let checkPermission;

if (process.env.NODE_AUTHENTICATOR_RELATIVE_CHECK_PERMISSION_PATH) {
  try {
    checkPermission = require(process.env.NODE_AUTHENTICATOR_RELATIVE_CHECK_PERMISSION_PATH);
  } catch (err) {
    throw error(errors.system.CONFIGURATION({
      debug          : { originalError : err },
      messageContext : `Application mis-configured.  Unable to load NODE_AUTHENTICATOR_RELATIVE_CHECK_PERMISSION_PATH: ${process.env.NODE_AUTHENTICATOR_RELATIVE_CHECK_PERMISSION_PATH} required by the auth platform only and should not be populated in the other platforms`
    }));
  }
}

module.exports = strategy => {
  const authenticator                     = require('./src/authenticator/index')(strategy),
        { ensureAuthorized, verifyRSJWT } = require('./src/middleware/ensureAuthorized/index');

  return {
    authenticator,
    ensureAuthorized : ensureAuthorized(authenticator, axios, checkPermission),
    verifyRSJWT
  };
};
