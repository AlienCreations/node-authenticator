'use strict';

const R = require('ramda');

const { error, errors } = require('@aliencreations/node-error');

const ensureIntendedAudience = verified => {
  if (!verified.aud) {
    throw error(errors.auth.UNAUTHORIZED_API_ACCESS({
      debug : {
        internalMessage : `Unauthorized - Token sent by ${verified.key} did not specify a receiver (token body was missing calleeAgentAud)`
      }
    }));
  }

  const hasIntendedAudience = R.compose(R.equals, R.prop('aud'));

  if (!hasIntendedAudience(verified)(process.env.THIS_SERVICE_NAME)) {
    throw error(errors.auth.UNAUTHORIZED_API_ACCESS({
      debug : {
        internalMessage : `Unauthorized - Token sent by ${verified.key} was meant for ${verified.aud} but was received by ${process.env.THIS_SERVICE_NAME}`
      }
    }));
  }

  return verified;
};

module.exports = ensureIntendedAudience;
