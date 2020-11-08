'use strict';

const R = require('ramda');

const { error, errors } = require('@aliencreations/node-error');

const generateAndCacheRefreshToken = require('../../../../../../src/authenticator/strategies/jwt/methods/generateAndCacheRefreshToken');

const FAKE_PAYLOAD                  = { foo : 'bar' },
      FAKE_SECRET                   = 'foo',
      FAKE_EXPIRES_SECONDS          = 5,
      FAKE_OLD_REFRESH_TOKEN        = 'bar',
      KNOWN_DEFAULT_EXPIRES_SECONDS = 7200,
      CUID_STRING_LENGTH            = 25;

let fakeCacheUtils;

const FAKE_TOKEN_BODY = {
  payload         : FAKE_PAYLOAD,
  secret          : FAKE_SECRET,
  expires         : FAKE_EXPIRES_SECONDS,
  oldRefreshToken : FAKE_OLD_REFRESH_TOKEN
};

describe('authenticator generateAndCacheRefreshToken', () => {
  beforeEach(() => {
    fakeCacheUtils = jasmine.createSpyObj('cacheUtils', ['setItem', 'deleteItem']);
  });

  it('generates and caches a refresh token', () => {
    const refreshToken = generateAndCacheRefreshToken(fakeCacheUtils)(FAKE_TOKEN_BODY);

    expect(typeof refreshToken).toBe('string');
    expect(refreshToken.length).toBe(CUID_STRING_LENGTH);

    expect(fakeCacheUtils.setItem).toHaveBeenCalledWith(
      `refreshToken:${refreshToken}`,
      FAKE_EXPIRES_SECONDS,
      R.omit(['expires', 'oldRefreshToken'], FAKE_TOKEN_BODY)
    );
  });

  it('generates and caches a refresh token, defaulting to a preset expires value', () => {
    const refreshToken = generateAndCacheRefreshToken(fakeCacheUtils)(
      R.omit(['expires'], FAKE_TOKEN_BODY)
    );

    expect(typeof refreshToken).toBe('string');
    expect(refreshToken.length).toBe(CUID_STRING_LENGTH);

    expect(fakeCacheUtils.setItem).toHaveBeenCalledWith(
      `refreshToken:${refreshToken}`,
      KNOWN_DEFAULT_EXPIRES_SECONDS,
      R.omit(['expires', 'oldRefreshToken'], FAKE_TOKEN_BODY)
    );
  });

  it('generates and caches a refresh token, gracefully failing if no oldRefreshToken was provided', () => {
    const refreshToken = generateAndCacheRefreshToken(fakeCacheUtils)(
      R.omit(['expires', 'oldRefreshToken'], FAKE_TOKEN_BODY)
    );

    expect(typeof refreshToken).toBe('string');
    expect(refreshToken.length).toBe(CUID_STRING_LENGTH);

    expect(fakeCacheUtils.setItem).toHaveBeenCalledWith(
      `refreshToken:${refreshToken}`,
      KNOWN_DEFAULT_EXPIRES_SECONDS,
      R.omit(['expires', 'oldRefreshToken'], FAKE_TOKEN_BODY)
    );
  });

  it('throws an error if payload is missing', () => {
    expect(() => {
      generateAndCacheRefreshToken(fakeCacheUtils)(R.omit(['payload'], FAKE_TOKEN_BODY));
    }).toThrow(error(errors.auth.MISSING_REFRESH_TOKEN_PAYLOAD()));
  });

  it('throws an error if secret is missing', () => {
    expect(() => {
      generateAndCacheRefreshToken(fakeCacheUtils)(R.omit(['secret'], FAKE_TOKEN_BODY));
    }).toThrow(error(errors.auth.MISSING_REFRESH_TOKEN_SECRET()));
  });
});
