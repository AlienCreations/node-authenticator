'use strict';

const { error, errors } = require('@aliencreations/node-error');

const sign = jwt => (payload, secret, options) => new Promise((resolve, reject) => {
  jwt.sign(payload, secret, options, (err, token) => {
    return err ? reject(error(errors.auth.CANNOT_SIGN_TOKEN({
      debug : {
        originalError : err,
        payload,
        options,
        token
      }
    }))) : resolve(token);
  });
});

module.exports = sign;
