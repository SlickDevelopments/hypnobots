const { promises: fsp } = require('fs');
const path = require('path');
const nock = require('nock');
const { Probot } = require('probot');

const bot = require('../../bots/naming-cop');
const payload = require('../fixtures/pull_request.opened');

const fixturesDir = path.resolve('./tests/fixtures');

describe('Naming Cop Files', () => {
  let probot, privateKey, pullCreatedBody;

  beforeAll(async () => {
    privateKey = await fsp.readFile(path.join(fixturesDir, 'mock-cert.pem'));
    pullCreatedBody = {
      body: await fsp
        .readFile(path.join(fixturesDir, 'pr-message-custom.txt'), 'utf-8'),
    };
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = new Probot({ id: 123, privateKey });
    probot.load(bot);
  });

  test('should change the rules and create a comment', async () => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/.')
      .reply(200, [{ name: '.botsrc.json', path: '.botsrc.json' }]);

    nock('https://api.github.com')
      .get(
        '/repos/hiimbex/testing-things/contents/' +
        encodeURIComponent('.botsrc.json')
      )
      .reply(200, {
        content: 'ewogICJuYW1pbmdDb3AiOiB7CiAgICAidmFsaWRUeXBlcyI6IFsgImZlYX' +
          'QiLCAiZml4IiwgInRlc3QiXSwKICAgICJpZ25vcmVMaXN0IjogWyJhcmFuZG9tW2J' +
          'vdF0iXQogIH0KfQ==',
      });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/pulls/1/commits')
      .reply(200, []);

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/issues/1/comments')
      .reply(200, []);

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject(pullCreatedBody);
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload });
  });

  test('should not change the rules and create a comment', async () => {
    const fn = jest.fn();
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/.')
      .reply(200, []);

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/pulls/1/commits')
      .reply(200, []);

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/issues/1/comments')
      .reply(200, []);

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
        fn();
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  test('should support directory errors and not create a comment', async () => {
    const fn = jest.fn();
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/.')
      .reply(404, {
        message: 'something awful happened',
        code: 'AWFUL_ERROR',
      });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/pulls/1/commits')
      .reply(200, []);

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/issues/1/comments')
      .reply(200, []);

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
        fn();
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  test('should support file errors and not create a comment', async () => {
    const fn = jest.fn();
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/.')
      .reply(200, [{ name: '.botsrc.json', path: '.botsrc.json' }]);

    nock('https://api.github.com')
      .get(
        '/repos/hiimbex/testing-things/contents/' +
        encodeURIComponent('.botsrc.json')
      )
      .reply(404, {
        message: 'something awful happened',
        code: 'AWFUL_ERROR',
      });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/pulls/1/commits')
      .reply(200, []);

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/issues/1/comments')
      .reply(200, []);

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
        fn();
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  test('should support json errors and not create a comment', async () => {
    const fn = jest.fn();
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/.')
      .reply(200, [{ name: '.botsrc.json', path: '.botsrc.json' }]);

    nock('https://api.github.com')
      .get(
        '/repos/hiimbex/testing-things/contents/' +
        encodeURIComponent('.botsrc.json')
      )
      .reply(200, {
        content: 'ewogICJuYW1pbmdDb3AiOiB7C',
      });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/pulls/1/commits')
      .reply(200, []);

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/issues/1/comments')
      .reply(200, []);

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
        fn();
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
