# node-authenticator
Authentication utility for Alien Creations node apps.

## Install

```
$ yarn add @aliencreations/node-authenticator
```

## Tenancy Permissions
This library comes with an `ensureAuthorized` ExpressJS middleware, which depends
on `req.tenant.id` and `req.tenantOrganization.id` to have been set by the previous middleware.

## `authenticator` Usage
```js
'use strict';

const R        = require('ramda'),
      config   = require('config'),
      apiUtils = require('alien-node-api-utils'),
      passport = require('passport');

const { authenticator } = require('@aliencreations/node-authenticator')('jwt');

const CLOUD_USER_AUTH_STRATEGY = {
  strategy : 'cloudUser',
  alg      : 'RS256',
  key      : 'authPlatform',
  aud      : 'authPlatform'
};

const commonJwtOptions       = R.path(['auth', 'jwtOptions'],         config),
      authTokenProfileFields = R.path(['auth', 'tokenProfileFields'], config);

const mergeProfileWithStrategyIdentifier = R.compose(
  R.mergeDeepRight(CLOUD_USER_AUTH_STRATEGY),
  R.prop('profile')
);

const login = (req, res) => {
  const MASTER_PRIVATE_KEY = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');

  passport.authenticate('local', (err, user) => {
    if (err) {
      return apiUtils.jsonResponseError(req, res, config.errors.decorateForJson(err));
    }
    if (!user) {
      return apiUtils.jsonResponseError(req, res, config.errors.decorateForJson(R.path(['errors', 'db', 'NO_QUERY_RESULTS'], config)));
    }

    const payload = mergeProfileWithStrategyIdentifier(user),
          secret  = MASTER_PRIVATE_KEY;

    authenticator.sign(payload, secret, commonJwtOptions)
      .then(token => {
        const refreshToken = authenticator.generateAndCacheRefreshToken({ payload, secret });

        res.set('x-auth-token',    token);
        res.set('x-refresh-token', refreshToken);
        res.set('x-profile',       JSON.stringify(payload));

        return apiUtils.jsonResponseSuccess(req, res, R.pick(authTokenProfileFields, user.profile));
      })
      .catch(err => apiUtils.jsonResponseError(req, res, config.errors.decorateForJson(err)));

  })(req, res, R.T);

};

module.exports = login;

```

## `ensureAuthorized` Middleware Usage
```js
const { ensureAuthorized } = require('@aliencreations/node-authenticator')('jwt');

router.get('/some/route/:id', ensureAuthorized, (req, res) => {
  // Do stuff that requires an authenticated user.
});
```

---
## Changelog

##### 1.0.0
  - Initial commit.

##### 1.0.1
  - Add support for deleteRefreshToken

##### 1.0.2
  - Add support for refreshToken renewal

##### 1.1.0
  - Replace `id` with `uuid` support throughout for `cloudUser` / `tenant` / `tenantOrganization`
