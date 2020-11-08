'use strict';

const R    = require('ramda'),
      btoa = require('btoa'),
      jwt  = require('jsonwebtoken');

const { error, errors } = require('@aliencreations/node-error');

const { allSettled, ensureArray, extractCustomHeaders } = require('../../helpers');

const ensureIntendedAudience  = require('./ensureIntendedAudience'),
      ensureWhitelistedCaller = require('./ensureWhitelistedCaller'),
      ensureAuthError         = require('./ensureAuthError');

const authStrategyMap = () => ({
  agent     : decoded => R.compose(R.prop(decoded.key), JSON.parse, R.replace(/'/g, ''))(process.env.PUBLIC_KEYS),
  cloudUser : decoded => R.compose(R.prop(decoded.key), JSON.parse, R.replace(/'/g, ''))(process.env.PUBLIC_KEYS),
  service   : decoded => R.compose(R.prop(decoded.key), JSON.parse, R.replace(/'/g, ''))(process.env.PUBLIC_KEYS)
});

const getSecretFromBearer = R.tryCatch(d => authStrategyMap()[d.strategy](d), R.always(''));

const ensureEnvVar = k => any => {
  if (!process.env[k]) {
    throw error(errors.system.CONFIGURATION({ messageContext : `Missing environment variable ${k}` }));
  } else {
    return any;
  }
};

const ensureDecoded = decoded => {
  if (!decoded) {
    throw error(errors.auth.UNAUTHORIZED_API_ACCESS());
  } else {
    return decoded;
  }
};

const continueWithErrorIfNotPermitted = (axios, checkPermission) => (decoded, req, next) => {
  const baseUrl            = req.baseUrl,
        routePath          = R.pathOr('', ['route', 'path'], req),
        uri                = `${baseUrl}${routePath}`.replace(/\/$/, ''),
        method             = R.propOr('', 'method', req),
        cloudUserId        = decoded.id,
        tenant             = R.propOr({}, 'tenant', req),
        tenantOrganization = R.propOr({}, 'tenantOrganization', req);

  if (decoded.strategy !== 'cloudUser') {
    next();
  } else {
    const finish = ({ hasPermission }) => {
      if (hasPermission) {
        next();
      } else {
        throw error(errors.auth.FORBIDDEN_API_ACCESS({
          debug : {
            tenant,
            tenantOrganization,
            cloudUserId,
            method,
            uri,
            baseUrl,
            decoded
          }
        }));
      }
    };

    const NO_PERMISSION = { hasPermission : 0 };

    if (checkPermission) {
      return checkPermission(uri, method, cloudUserId, tenant.id, tenantOrganization.id)
        .then(finish);
    } else {
      const tenantId             = tenant.id || '-',
            tenantOrganizationId = tenantOrganization.id || '-';

      return axios.get(process.env.AUTH_PLATFORM_API_ROOT + `/api/v1/auth/tenantAccessPermission/public/check/${btoa(uri)}/${method}/${cloudUserId}/${tenantId}/${tenantOrganizationId}`)
        .then(R.path(['data', 'data']))
        .then(R.when(R.either(R.isEmpty, R.isNil), R.always(NO_PERMISSION)))
        .then(finish);
    }
  }
};

const tryPublicKey = verify => token => callerPublicKey => verify(token, callerPublicKey, { algorithm : 'RS256' });

const verifyRSJWT = verify => token => publicKeys => {
  const callerPublicKeys                                 = R.compose(R.map(R.when(R.is(String), R.replace(/\\n/g, '\n'))), ensureArray)(publicKeys);
  const verificationAttemptsAgainstAllProvidedPublicKeys = R.map(tryPublicKey(verify)(token), callerPublicKeys);

  return new Promise((resolve, reject) => {
    return allSettled(verificationAttemptsAgainstAllProvidedPublicKeys).then(results => {
      const decoded        = R.has('strategy'),
            rejectionErr   = R.has('code'),
            getFirst       = p => R.compose(R.head, R.filter(p)),
            firstResolve   = getFirst(decoded)(results),
            firstRejection = getFirst(rejectionErr)(results);

      if (firstResolve) {
        resolve(firstResolve);
      } else {
        const maybePrecedentedTokenExpiredError = R.find(R.eqProps('code', errors.auth.TOKEN_EXPIRED()))(results);
        reject(maybePrecedentedTokenExpiredError || firstRejection);
      }
    });
  });
};


/**
 * This middleware will check if the request object has an `authorization`
 * header with the value "Bearer {token}". The middleware will decode the token
 * and attempt to verify it by looking up the appropriate secret (password or public key)
 * which will be determined by the token's `strategy` property.
 *
 * Middleware currently supports HS256 (secret string) and RS256 (public/private key pair) algorithms
 * which must be declared in the `alg` property.
 *
 * HS256 Permissions : Checks against RBAC logic to see if the token caller has been assigned
 * to a role which has permission to access this resource.
 *
 * RS256 Permissions : Checks against infrastructure WHITELIST which lives on process.env. Whitelist must be
 * set by the Secret service or manually into Vault (or whatever strategy) before the application starts.
 *
 * If the verification fails, we 401. If it passes, we call next() and carry on.
 */
const ensureAuthorized = ({ identifyCaller, verify, sign }, axios, checkPermission) => (req, res, next) => {
  const token      = identifyCaller(req),
        decoded    = jwt.decode(token),
        meta       = extractCustomHeaders(req.headers),
        setReqUser = () => req.user = decoded;

  R.forEachObjIndexed((value, key) => {
    axios.defaults.headers.common[key] = value;
  })(meta);

  Promise.resolve(decoded)
    .then(ensureDecoded)
    .then(ensureEnvVar('PUBLIC_KEYS'))
    .then(ensureEnvVar('WHITELIST'))
    .then(ensureEnvVar('THIS_SERVICE_NAME'))
    .then(getSecretFromBearer)
    .then(secret => {
      if (decoded.alg === 'RS256') {
        if (decoded.strategy === 'service') {
          return Promise.resolve(secret)
            .then(verifyRSJWT(verify)(token))
            .then(ensureIntendedAudience)
            .then(ensureWhitelistedCaller)
            .then(setReqUser)
            .then(() => next())
            .catch(next);
        } else {
          const MASTER_PRIVATE_KEY = process.env.MASTER_PRIVATE_KEY;

          const maybeOfferNewTokenHeader = () => Promise.resolve()
            .then(() => {
              /* istanbul ignore else */
              if (MASTER_PRIVATE_KEY) {
                const token = sign(decoded, MASTER_PRIVATE_KEY.replace(/\\n/g, '\n'), {
                  algorithm : 'RS256',
                  expiresIn : process.env.JWT_TTL || '20s'
                });
                res.set('x-auth-token', token);
              }
            });

          return Promise.resolve(secret)
            .then(verifyRSJWT(verify)(token))
            .then(maybeOfferNewTokenHeader)
            .then(setReqUser)
            .then(() => continueWithErrorIfNotPermitted(axios, checkPermission)(decoded, req, next));
        }
      } else {
        throw error(errors.auth.TOKEN_INVALID({
          debug : {
            decoded,
            meta,
            token
          }
        }));
      }
    })
    .catch(_err => {
      const err                            = ensureAuthError(_err),
            { user, baseUrl, url, method } = req;

      const extendedMeta = R.mergeDeepRight(meta, {
        url : `${baseUrl}${url}`,
        user,
        method
      });

      if (req.logger && req.logger.child) {
        const logger = req.logger.child(extendedMeta);
        logger.error({ msg : 'Promise rejected in ensureAuthorized middleware', err });
      }
      next(err);
    });
};

module.exports = { ensureAuthorized, verifyRSJWT };
