'use strict';

const R = require('ramda');

const { error, errors } = require('@aliencreations/node-error');

const generateAndCacheTransferToken = require('../../../../../../src/authenticator/strategies/jwt/methods/generateAndCacheTransferToken');

const FAKE_PAYLOAD                  = { foo : 'bar' },
      FAKE_EXPIRES_SECONDS          = 5,
      FAKE_OLD_TRANSFER_TOKEN       = 'bar',
      KNOWN_DEFAULT_EXPIRES_SECONDS = 10,
      CUID_STRING_LENGTH            = 25;

let fakeCacheUtils;

const FAKE_TOKEN_BODY = {
  payload          : FAKE_PAYLOAD,
  expires          : FAKE_EXPIRES_SECONDS,
  oldTransferToken : FAKE_OLD_TRANSFER_TOKEN
};

describe('authenticator generateAndCacheTransferToken', () => {

  beforeEach(() => {
    fakeCacheUtils = jasmine.createSpyObj('cacheUtils', ['setItem', 'deleteItem']);
  });

  it('generates and caches a transfer token', () => {
    const transferToken = generateAndCacheTransferToken(fakeCacheUtils)(FAKE_TOKEN_BODY);

    expect(typeof transferToken).toBe('string');
    expect(transferToken.length).toBe(CUID_STRING_LENGTH);

    expect(fakeCacheUtils.setItem).toHaveBeenCalledWith(
      `transferToken:${transferToken}`,
      FAKE_EXPIRES_SECONDS,
      R.omit(['expires', 'oldTransferToken'], FAKE_TOKEN_BODY)
    );
  });

  it('generates and caches a transfer token, defaulting to a preset expires value', () => {
    const transferToken = generateAndCacheTransferToken(fakeCacheUtils)(
      R.omit(['expires'], FAKE_TOKEN_BODY)
    );

    expect(typeof transferToken).toBe('string');
    expect(transferToken.length).toBe(CUID_STRING_LENGTH);

    expect(fakeCacheUtils.setItem).toHaveBeenCalledWith(
      `transferToken:${transferToken}`,
      KNOWN_DEFAULT_EXPIRES_SECONDS,
      R.omit(['expires', 'oldTransferToken'], FAKE_TOKEN_BODY)
    );
  });

  it('generates and caches a transfer token, gracefully failing if no oldTransferToken was provided', () => {
    const transferToken = generateAndCacheTransferToken(fakeCacheUtils)(
      R.omit(['expires', 'oldTransferToken'], FAKE_TOKEN_BODY)
    );

    expect(typeof transferToken).toBe('string');
    expect(transferToken.length).toBe(CUID_STRING_LENGTH);

    expect(fakeCacheUtils.setItem).toHaveBeenCalledWith(
      `transferToken:${transferToken}`,
      KNOWN_DEFAULT_EXPIRES_SECONDS,
      R.omit(['expires', 'oldTransferToken'], FAKE_TOKEN_BODY)
    );
  });

  it('throws an error if payload is missing', () => {
    expect(() => {
      generateAndCacheTransferToken(fakeCacheUtils)(R.omit(['payload'], FAKE_TOKEN_BODY));
    }).toThrow(error(errors.auth.MISSING_TRANSFER_TOKEN_PAYLOAD()));
  });

});
