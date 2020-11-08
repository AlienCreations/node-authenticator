'use strict';

const R = require('ramda');

const COMMON_REQUEST_BODY = {
  flash   : R.identity,
  session : {
    flash : {}
  }
};

const COMMON_EMPTY_REQUEST_ERROR = new TypeError('Cannot set property "flash" of undefined');

const COMMON_RESPONSE_BODY = {
  locals : {},
  set    : () => COMMON_RESPONSE_BODY,
  status : () => COMMON_RESPONSE_BODY,
  send   : R.identity,
  json   : R.identity
};

/**
 * Return a new object that matches `originalObj` except with the new
 * key/val assignment provided by the overrides.
 *
 * @param {Object} originalObj The object used as the reference.
 * @param {String} overrideKey The property name we will be overriding.
 * @param {*}      overrideVal The new value
 * @returns {Object}
 */
const override = R.curry((originalObj, overrideKey, overrideVal) => {
  return R.mergeDeepRight(originalObj, R.objOf(overrideKey, overrideVal, {}));
});

const recursivelyOmitProps = R.curry((omittedPropsArr, v) => {
  if (!R.is(Object, v)) {
    return v;
  }
  if (!R.is(Array, v)) {
    v = R.omit(omittedPropsArr, v);
  }
  return R.map(recursivelyOmitProps(omittedPropsArr), v);
});

const ensureTrueNullInCsvData = R.map(R.when(R.identical('NULL'), R.always(null)));

module.exports = {
  override,
  recursivelyOmitProps,
  ensureTrueNullInCsvData,
  COMMON_REQUEST_BODY,
  COMMON_EMPTY_REQUEST_ERROR,
  COMMON_RESPONSE_BODY
};
