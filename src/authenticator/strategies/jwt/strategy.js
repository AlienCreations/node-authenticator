'use strict';

module.exports = () => {
  const jwt = require('jsonwebtoken');

  return {
    identifyCaller                : require('./methods/identifyCaller'),
    generateAndCacheRefreshToken  : require('./methods/generateAndCacheRefreshToken'),
    generateAndCacheTransferToken : require('./methods/generateAndCacheTransferToken'),
    lookupRefreshToken            : require('./methods/lookupRefreshToken'),
    sign                          : require('./methods/sign')(jwt),
    verify                        : require('./methods/verify')(jwt),
    urlBase64Encode               : require('./methods/urlBase64Encode'),
    urlBase64Decode               : require('./methods/urlBase64Decode')
  };
};
