'use strict';

const atob = require('atob');

const { error, errors } = require('@aliencreations/node-error');

const urlBase64Decode = str => {
  let output;

  if (!str) {
    return '';
  }

  output = str.replace('-', '+').replace('_', '/');

  switch (output.length % 4) {
  case 0:
    break;

  case 2:
    output += '==';
    break;

  case 3:
    output += '=';
    break;

  default:
    throw error(errors.system.UNCAUGHT({
      message : 'Illegal base64url string!'
    }));

  }
  return atob(output);
};

module.exports = urlBase64Decode;
