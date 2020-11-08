'use strict';

const R = require('ramda');

const allSettled = promises => {
  const resolve = promise => new Promise(resolve => promise.then(resolve).catch(resolve));
  return Promise.all(promises.map(resolve));
};

const ensureArray = v => R.compose(R.flatten, R.append(R.__, []), R.tryCatch(JSON.parse, R.always(v)))(v);

const isCustomHeader = (_v, k) => R.test(/^x-/i, k);

const extractCustomHeaders = R.pickBy(isCustomHeader);

module.exports = {
  allSettled,
  ensureArray,
  extractCustomHeaders
};
