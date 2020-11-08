'use strict';

const R = require('ramda');

const { error, errors } = require('@aliencreations/node-error');

const maybeRejectIfTokenExpired = (reject, err) => {
  if (R.is(Object)(err) && err.name === 'TokenExpiredError') {
    reject(error(errors.auth.TOKEN_EXPIRED({
      debug : {
        originalError : err
      }
    })));
  }
};

const maybeRejectIfTokenInvalid = (reject, err) => {
  if (R.is(Object)(err) && err.name === 'JsonWebTokenError') {
    reject(error(errors.auth.TOKEN_INVALID({
      debug : {
        originalError : err
      }
    })));
  }
};

const verify = jwt => (signed, secret, options) => new Promise((resolve, reject) => {
  jwt.verify(signed, secret, options, (err, decoded) => {
    maybeRejectIfTokenExpired(reject, err);
    maybeRejectIfTokenInvalid(reject, err);
    resolve(decoded);
  });
});

module.exports = verify;
