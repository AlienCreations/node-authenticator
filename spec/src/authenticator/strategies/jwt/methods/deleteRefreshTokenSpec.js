'use strict';

const deleteRefreshToken = require('../../../../../../src/authenticator/strategies/jwt/methods/deleteRefreshToken');

describe('authenticator deleteRefreshToken', () => {
  it('attempts to delete a token from the cache', done => {
    const FAKE_CACHE_UTILS   = jasmine.createSpyObj('cacheUtils', ['deleteItem']),
          FAKE_REFRESH_TOKEN = 'foo';

    deleteRefreshToken(FAKE_CACHE_UTILS)(FAKE_REFRESH_TOKEN);

    setTimeout(() => {
      expect(FAKE_CACHE_UTILS.deleteItem).toHaveBeenCalledWith(`refreshToken:${FAKE_REFRESH_TOKEN}`);
      done();
    }, 1);

  });
});
