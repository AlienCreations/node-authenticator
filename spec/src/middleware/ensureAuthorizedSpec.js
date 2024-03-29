'use strict';

const R   = require('ramda'),
      jwt = require('jsonwebtoken');

const { error, errors } = require('@aliencreations/node-error');

const authenticator = require('../../../src/authenticator/strategies/jwt/strategy')();

const fakeLogger = {
  child : () => ({
    error : () => {
    }
  })
};

const fakeAxiosHasPermission = {
  get      : () => Promise.resolve({
    data : {
      data : {
        hasPermission : 1
      }
    }
  }),
  defaults : {
    headers : {
      common : {
        foo : 'bar'
      }
    }
  }
};

const fakeAxiosNoPermission = {
  get      : () => Promise.resolve({
    data : {
      data : {
        hasPermission : 0
      }
    }
  }),
  defaults : {
    headers : {
      common : {
        foo : 'bar'
      }
    }
  }
};

const fakeCheckPermissionMissing = undefined,
      fakeCheckPermission        = () => ({ hasPermission : 1 });

const { ensureAuthorized } = require('../../../src/middleware/ensureAuthorized');

const FAKE_RESOURCE_REQ_FOR_ROLE_USER_INCLUDES_CLOUD_USER_3 = {
  method             : 'POST',
  baseUrl            : '',
  route              : {
    path : '/auth/login/cnn/antioch'
  },
  tenant             : { uuid : 'fb7afaa7-0016-44fd-addc-461d5fd6cf12' },
  tenantOrganization : { uuid : 'fefaeb42-e6a9-4b46-be99-f8984d8b3e2f' }
};

const FAKE_RESOURCE_REQ_FOR_NON_TENANCY_RESOURCE = {
  method             : 'GET',
  baseUrl            : '',
  route              : {
    path : '/api/v1/document'
  },
  tenant             : {},
  tenantOrganization : {}
};

const _makeFakeReqFromToken = R.compose(
  R.mergeLeft({ logger : fakeLogger }),
  R.assocPath(['headers', 'x-fake-custom-header'], 'foobar'),
  R.mergeDeepRight(FAKE_RESOURCE_REQ_FOR_ROLE_USER_INCLUDES_CLOUD_USER_3),
  R.objOf('headers'),
  R.objOf('authorization'),
  R.concat('Bearer ')
);

const _makeFakeReqFromTokenNoLogger = R.compose(
  R.mergeDeepRight(FAKE_RESOURCE_REQ_FOR_ROLE_USER_INCLUDES_CLOUD_USER_3),
  R.objOf('headers'),
  R.objOf('authorization'),
  R.concat('Bearer ')
);

const _makeFakeNonResourceReqFromToken = R.compose(
  R.mergeLeft({ logger : fakeLogger }),
  R.mergeDeepRight(FAKE_RESOURCE_REQ_FOR_NON_TENANCY_RESOURCE),
  R.objOf('headers'),
  R.objOf('authorization'),
  R.concat('Bearer ')
);

const KNOWN_TEST_PRIVATE_KEY                                       = process.env.SHARED_PRIVATE_KEY.replace(/\\n/g, '\n'),
      KNOWN_TEST_CACHE_PATH                                        = process.env.NODE_AUTHENTICATOR_RELATIVE_CACHE_PATH,
      FAKE_UNMAPPED_PRIVATE_KEY                                    = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAlwfO144yZVCmnZ7g6xYwvlr4u8cVYAaoQ31eV1fNEQGswUxr
ByWBPEYMSnf3FN11WVCX+20ItBMzpWhUNZIeD5Hj/6pdN10kCPErKaC/QiAhlke1
GryZ4tM5eYJKVGW4z7gtoulysJqestCkq36IPisvRsy8q4USlO7MKsxuK1z8CUi5
nw0LmsBKC4/vLl5EOtVQFdzbdBDcCCf0hI/UW2/+uAfioLL3rdsbqn5AfjdujcW1
9v+drJoYXiTxzicJ0rJp5mtrp+CQNdIB4wqzMTejvKyVLf1mDlJpCMKvYWklN1eT
Af/V23O/Ksx6TPAM9wVTaz8setWffuuTRtGI3wIDAQABAoIBACF1il540zNc3by3
sQ6D2QKi9s3q+hJPB0IEaT0iZ3zoCRS90ExCA9KNljV9RFDsCw5ha3o5Gp+CTYPM
jDNeDqjWYlOGs6YLTWtpum07foOwyKAZfMbSl6kHsIj502vFKV9jZ0DbRRxY9OWa
kZCotJhJSuz9eKLrFUXHbZXhulqCpPansW8jIO2hGyAXJEZH2Xd3d/BYL8FaUY7I
iJ7eVYCPRxttZirfFdcsHcTSURDamYTPJJi+DBUKRtvzPXGrSJjCLIE6y00vMKjh
yqZXj2YHbwPoxs7JFzg3IK2QQg2+yNYhB6WLQttd5HacnnQcj0+P9fcilmcCzm3b
QcSS2SkCgYEAxpVWwL2Xx3H/RH69ME/LFdbiJ2zPH98YZ8KrkbztZ129jslGRP6O
pLsupApDd4Z6Rz1nW7uyOgnMty52v2uhMy6VUQkRCg6RqK9PIatcx9nMiS9hXkvB
nSdYR3T/qrCS5bxX2cX2WdagcA57IVMKTsoeXaHWob/SyS345B14j10CgYEAwrK4
rxxx7sD0EiLMAPJtK8H3FWjRW9kQc/hKg+dEZ6+FMwBcoFyPsNWL2VgK3PEdeJKr
zZCl1bI92zs+zt7+DJguSKP0lPqlbX4cQ/WyS+/rzKW8Szih6N0h26vmtl56+WB7
jrsqd4v/TdUMKH4jQPNGmtI7dwHe5S+cfNezQWsCgYAIHVYcLiMjnT7nF563eKs9
yzgWkFWuYblnlAbav7Obw7LZQNREQXqmtJdlUJ4NJkuc2Z99mh/gS0I4QgfMLqO5
qa+kThCKLqo5EGDVaWEzMW0wNeVuqv3QZCkxUlCYMvrttFKKrZIxfZm0uoLBi9kh
+xRekxxoI6SDYAOJnsKsaQKBgDoSzPuOZH1umF6AepEdvmp65JRCO5BF4p50xOUr
KkAzHmvkA7zhXwrD537gv/y+/qdkOFKMfqqLC+BEf6t84BIpokSQgvec+5L5Nr0e
oBv+aDsWhF97eO/YZaz8TUjATbXsjW45baVS4Mf6cDHzzdgluD2dz5bju/RoiyjB
vfoZAoGBAKzzs4tRAOLEihpFkLhhQSORwhehnIHCwBlRVY8sFsQSMlXacGvuAjmp
X64i0y64VPbVyoDKs+xNpFJY695W1IRMH24LgL/9/GUpCIMj+oJ56+mX3gm7IQDr
W3uO+Chmk3Kend3vYh7g9izdKYlnU0r+IkK7LO7jHuSDowFgj8+N
-----END RSA PRIVATE KEY-----`,

      FAKE_DECODED_KNOWN_SERVICE                                   = {
        key      : 'lambda',
        strategy : 'service',
        alg      : 'RS256',
        aud      : 'authPlatform'
      },

      FAKE_DECODED_UNKNOWN_SERVICE                                 = {
        key      : 'foo',
        strategy : 'service',
        alg      : 'RS256',
        aud      : 'authPlatform'
      },

      FAKE_DECODED_UNKNOWN_AUDIENCE                                = {
        key      : 'lambda',
        strategy : 'service',
        alg      : 'RS256',
        aud      : 'foo'
      },

      FAKE_DECODED_MISSING_AUDIENCE                                = {
        key      : 'lambda',
        strategy : 'service',
        alg      : 'RS256'
      },

      FAKE_DECODED_KNOWN_AGENT                                     = {
        uuid     : 'cdc0bce5-eeeb-4c3a-b105-3f840d52eaeb',
        key      : 'authPlatform',
        aud      : 'authPlatform',
        name     : 'Test Agent 1',
        strategy : 'agent',
        status   : 1,
        alg      : 'RS256'
      },

      FAKE_DECODED_UNKNOWN_AGENT                                   = {
        uuid     : 'cdc0bce5-eeeb-4c3a-b105-3f840d52eaeb',
        key      : 'foo',
        aud      : 'authPlatform',
        name     : 'Test Agent 1',
        strategy : 'agent',
        status   : 1,
        alg      : 'RS256'
      },

      FAKE_DECODED_KNOWN_SUPERUSER                                 = {
        uuid     : 'c75a9614-603e-4fa3-8123-0ec8b3490dc7',
        email    : 'platformroot@aliencreations.com',
        strategy : 'cloudUser',
        status   : 1,
        alg      : 'RS256',
        key      : 'authPlatform',
        aud      : 'authPlatform'
      },

      FAKE_DECODED_UNSUPPORTED_ALG                                 = {
        uuid     : 'c75a9614-603e-4fa3-8123-0ec8b3490dc7',
        email    : 'platformroot@aliencreations.com',
        strategy : 'cloudUser',
        status   : 1,
        alg      : 'HS256',
        key      : 'authPlatform',
        aud      : 'authPlatform'
      },

      FAKE_DECODED_KNOWN_USER_WHO_DOES_NOT_HAVE_PERMISSION         = {
        uuid     : '264d87b8-7a09-4fcf-8d5c-f430ebe68661',
        email    : 'steven@seagal.com',
        strategy : 'cloudUser',
        status   : 1,
        alg      : 'RS256',
        key      : 'authPlatform',
        aud      : 'authPlatform'
      },

      FAKE_DECODED_KNOWN_USER_WHO_HAS_PERMISSION_FOR_FAKE_RESOURCE = {
        uuid     : '58dcaba5-99cb-459d-a4b7-4dc27e9008d5',
        email    : 'chuck@norris.com',
        strategy : 'cloudUser',
        status   : 1,
        alg      : 'RS256',
        key      : 'authPlatform',
        aud      : 'authPlatform'
      },

      FAKE_DECODED_UNKNOWN_USER                                    = {
        uuid     : '58dcaba5-99cb-459d-a4b7-4dc27e9008d5',
        email    : 'chuck@norris.com',
        strategy : 'cloudUser',
        status   : 1,
        alg      : 'RS256',
        key      : 'foo',
        aud      : 'authPlatform'
      },

      FAKE_JWT_INVALID                                             = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJjaXc1OXJjeHUwMDAwdWhwMXlncHp6anByIiwibmFtZSI6IlRlc3QgQWdlbnQgMSIsInN0YXR1cyI6MSwiZXhwIjo5NjA4MTcyOTEzNn0.XZHI2JLcujFhdpZXJQtQJ8Vq0AO8u5QVlCnJkUnof4',
      FAKE_JWT_EXPIRED_SIGNED_WITH_PRIVATE_KEY                     = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImV4cGlyZXNJbiI6IjIwcyJ9.eyJpZCI6Miwia2V5IjoiYndBdXRoUGxhdGZvcm0iLCJhdWQiOiJid0F1dGhQbGF0Zm9ybSIsIm5hbWUiOiJUZXN0IEFnZW50IDEiLCJzdHJhdGVneSI6ImFnZW50Iiwic3RhdHVzIjoxLCJhbGciOiJSUzI1NiIsImlhdCI6MTAxNjIzOTAyMiwiZXhwIjoxMDE2MjM5MDIzfQ.TMws6Z9zI3STf9fkLCRpV7A7mV19_StY-6LSaPld9bvdI_HBF7_btZJb9jbSIcQ4lI9MK3uzNvRDDng_aInyObwAE6393OQ6F8wprScZbvBzwRDnmlJPEMg1TsURZbNva9pIXVfYhStHo7S60sTqXcqMiSK5lX6aji8YZUc5XK_WKAc6-PRjwxKGUKGxXjku9023PtMVYb36V4yLq1s5kpQ4ZzJKte7RsWwXcVDbszY0xFVU5AWPpUHnYqpWgoMfRENvFxHNr5WxJgwSSRBv1TJ55wDIdH2UsgrPx-c2ixA1mQIGKdN3ag9AtmGaE5AXayjut0fzIHz9nuBjveSHWQ',

      FAKE_JWT_KNOWN_SERVICE                                       = jwt.sign(FAKE_DECODED_KNOWN_SERVICE, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_BAD_KEY                                             = jwt.sign(FAKE_DECODED_KNOWN_SERVICE, FAKE_UNMAPPED_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_UNKNOWN_SERVICE                                     = jwt.sign(FAKE_DECODED_UNKNOWN_SERVICE, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_UNKNOWN_AUDIENCE                                    = jwt.sign(FAKE_DECODED_UNKNOWN_AUDIENCE, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_MISSING_AUDIENCE                                    = jwt.sign(FAKE_DECODED_MISSING_AUDIENCE, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_KNOWN_AGENT                                         = jwt.sign(FAKE_DECODED_KNOWN_AGENT, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_UNKNOWN_AGENT                                       = jwt.sign(FAKE_DECODED_UNKNOWN_AGENT, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_KNOWN_USER_WHO_HAS_PERMISSION                       = jwt.sign(FAKE_DECODED_KNOWN_USER_WHO_HAS_PERMISSION_FOR_FAKE_RESOURCE, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_KNOWN_USER_WHO_DOES_NOT_HAVE_PERMISSION             = jwt.sign(FAKE_DECODED_KNOWN_USER_WHO_DOES_NOT_HAVE_PERMISSION, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_UNSUPPORTED_ALG                                     = jwt.sign(FAKE_DECODED_UNSUPPORTED_ALG, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_KNOWN_SUPERUSER                                     = jwt.sign(FAKE_DECODED_KNOWN_SUPERUSER, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),
      FAKE_JWT_UNKNOWN_USER                                        = jwt.sign(FAKE_DECODED_UNKNOWN_USER, KNOWN_TEST_PRIVATE_KEY, { algorithm : 'RS256' }),

      FAKE_REQ_NO_TOKEN                                            = R.dissocPath(['headers', 'authorization'], _makeFakeReqFromToken(FAKE_JWT_KNOWN_AGENT)),
      FAKE_REQ_NO_METHOD                                           = R.dissoc('method', _makeFakeReqFromToken(FAKE_JWT_KNOWN_AGENT)),

      FAKE_REQ_BAD_KEY                                             = _makeFakeReqFromToken(FAKE_JWT_BAD_KEY),
      FAKE_REQ_KNOWN_SERVICE                                       = _makeFakeReqFromToken(FAKE_JWT_KNOWN_SERVICE),
      FAKE_REQ_UNKNOWN_SERVICE                                     = _makeFakeReqFromToken(FAKE_JWT_UNKNOWN_SERVICE),
      FAKE_REQ_UNKNOWN_AUDIENCE                                    = _makeFakeReqFromToken(FAKE_JWT_UNKNOWN_AUDIENCE),
      FAKE_REQ_MISSING_AUDIENCE                                    = _makeFakeReqFromToken(FAKE_JWT_MISSING_AUDIENCE),
      FAKE_REQ_KNOWN_AGENT                                         = _makeFakeReqFromToken(FAKE_JWT_KNOWN_AGENT),
      FAKE_REQ_UNKNOWN_AGENT                                       = _makeFakeReqFromToken(FAKE_JWT_UNKNOWN_AGENT),
      FAKE_REQ_KNOWN_USER_WHO_HAS_PERMISSION                       = _makeFakeReqFromToken(FAKE_JWT_KNOWN_USER_WHO_HAS_PERMISSION),
      FAKE_REQ_KNOWN_USER_WHO_DOES_NOT_HAVE_PERMISSION             = _makeFakeReqFromToken(FAKE_JWT_KNOWN_USER_WHO_DOES_NOT_HAVE_PERMISSION),
      FAKE_REQ_NON_TENANCY_RESOURCE                                = _makeFakeNonResourceReqFromToken(FAKE_JWT_KNOWN_USER_WHO_DOES_NOT_HAVE_PERMISSION),
      FAKE_REQ_KNOWN_SUPERUSER                                     = _makeFakeReqFromToken(FAKE_JWT_KNOWN_SUPERUSER),
      FAKE_REQ_UNKNOWN_USER                                        = _makeFakeReqFromToken(FAKE_JWT_UNKNOWN_USER),
      FAKE_REQ_EXPIRED                                             = _makeFakeReqFromToken(FAKE_JWT_EXPIRED_SIGNED_WITH_PRIVATE_KEY),
      FAKE_REQ_INVALID                                             = _makeFakeReqFromToken(FAKE_JWT_INVALID),
      FAKE_REQ_UNSUPPORTED_ALG                                     = _makeFakeReqFromToken(FAKE_JWT_UNSUPPORTED_ALG),
      FAKE_REQ_NO_LOGGER                                           = _makeFakeReqFromTokenNoLogger(FAKE_JWT_UNSUPPORTED_ALG);

let FAKE_RES;

describe('ensureAuthorized middleware', () => {
  beforeEach(() => {
    FAKE_RES                                           = jasmine.createSpyObj('res', ['send', 'set']);
    process.env.NODE_AUTHENTICATOR_RELATIVE_CACHE_PATH = KNOWN_TEST_CACHE_PATH;
  });

  it('allows a whitelisted service to access this service', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_KNOWN_SERVICE, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalled();
      done();
    }, 50);
  });


  it('gracefully omits a new auth token on the response header if no master private key is on the environment', done => {
    const masterPrivateKey = process.env.MASTER_PRIVATE_KEY;
    delete process.env.MASTER_PRIVATE_KEY;

    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_KNOWN_SERVICE, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalled();
      process.env.MASTER_PRIVATE_KEY = masterPrivateKey;
      done();
    }, 50);
  });

  it('prevents a service from accessing this service if this service is not whitelisted', done => {
    const FAKE_NEXT       = jasmine.createSpy('next');
    const whitelist       = process.env.WHITELIST;
    process.env.WHITELIST = R.compose(JSON.stringify, R.assoc(process.env.THIS_SERVICE_NAME, []), JSON.parse)(whitelist);
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_KNOWN_SERVICE, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.UNAUTHORIZED_API_ACCESS()));
      expect(FAKE_NEXT.calls.argsFor(0)[0].code).toBe(5000);
      process.env.WHITELIST = whitelist;
      done();
    }, 550);
  });

  it('allows an authorized user to access a known resource', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_KNOWN_SUPERUSER, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalled();
      done();
    }, 150);
  });

  it('allows an authorized user to access a an endpoint which is not a tenancy resource', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_NON_TENANCY_RESOURCE, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalled();
      done();
    }, 150);
  });

  it('prevents an non-whitelisted service from accessing this service', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_UNKNOWN_SERVICE, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.TOKEN_INVALID()));
      done();
    }, 150);
  });

  it('prevents a service from accessing this service if the token does not declare an intended audience', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_MISSING_AUDIENCE, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.UNAUTHORIZED_API_ACCESS()));
      done();
    }, 150);
  });

  it('prevents a service from accessing this service if the token was meant for another audience', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_UNKNOWN_AUDIENCE, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.UNAUTHORIZED_API_ACCESS()));
      done();
    }, 150);
  });

  it('prevents an unauthorized user from accessing a restricted resource', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosNoPermission, fakeCheckPermissionMissing)(FAKE_REQ_KNOWN_USER_WHO_DOES_NOT_HAVE_PERMISSION, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.FORBIDDEN_API_ACCESS()));
      done();
    }, 150);
  });

  it('leverages a local checkPermission controller if one exists', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermission)(FAKE_REQ_KNOWN_SUPERUSER, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalled();
      done();
    }, 150);
  });

  it('sends a 401 when no token is provided in the request', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_NO_TOKEN, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.UNAUTHORIZED_API_ACCESS()));
      done();
    }, 150);
  });

  it('sends a 401 when user does not have permission to access resource', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosNoPermission, fakeCheckPermissionMissing)(FAKE_REQ_KNOWN_USER_WHO_DOES_NOT_HAVE_PERMISSION, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.FORBIDDEN_API_ACCESS()));
      done();
    }, 150);
  });

  it('sends a 401 when agent is not found', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_UNKNOWN_AGENT, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.TOKEN_INVALID()));
      done();
    }, 150);
  });

  it('sends a 401 when cloudUser is not found', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_UNKNOWN_USER, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.TOKEN_INVALID()));
      done();
    }, 150);
  });

  it('sends a 401 when token is expired', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_EXPIRED, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.TOKEN_EXPIRED()));
      done();
    }, 150);
  });

  it('sends a 401 when token is bad', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_INVALID, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.TOKEN_INVALID()));
      done();
    }, 150);
  });

  it('sends a 401 when token wants to use an unsupported algorithm', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_UNSUPPORTED_ALG, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.TOKEN_INVALID()));
      done();
    }, 150);
  });

  it('successfully continues if agent token can be verified', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_KNOWN_AGENT, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalled();
      done();
    }, 150);
  });

  it('successfully continues if cloudUser token can be verified', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_KNOWN_USER_WHO_HAS_PERMISSION, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalled();
      done();
    }, 150);
  });

  it('supports the absence of a logger on the request object', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_NO_LOGGER, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.TOKEN_INVALID()));
      done();
    }, 150);
  });

  it('sends a 401 if a required env var is missing', done => {
    const FAKE_NEXT       = jasmine.createSpy('next');
    const whitelist       = process.env.WHITELIST;
    process.env.WHITELIST = '';
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_NO_METHOD, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.system.CONFIGURATION({ messageContext : 'Missing environment variable WHITELIST' })));
      process.env.WHITELIST = whitelist;

      done();
    }, 150);
  });

  it('sends a 401 if a public key can not be found which matches the signing private key', done => {
    const FAKE_NEXT = jasmine.createSpy('next');
    ensureAuthorized(authenticator, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_BAD_KEY, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalledWith(error(errors.auth.TOKEN_INVALID()));
      done();
    }, 150);
  });

  it('defaults to storing refresh tokens in tmp if no cache path is provided', done => {
    delete process.env.NODE_AUTHENTICATOR_RELATIVE_CACHE_PATH;

    const authenticatorNoCachePath = require('../../../src/authenticator')('jwt');
    const FAKE_NEXT                = jasmine.createSpy('next');

    ensureAuthorized(authenticatorNoCachePath, fakeAxiosHasPermission, fakeCheckPermissionMissing)(FAKE_REQ_BAD_KEY, FAKE_RES, FAKE_NEXT);
    setTimeout(() => {
      expect(FAKE_NEXT).toHaveBeenCalled();
      done();
    }, 150);
  });
});
