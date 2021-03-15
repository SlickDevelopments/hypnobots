const { promises: fsp } = require('fs');
const path = require('path');

const nock = require('nock');
const { Probot } = require('probot');

const bot = require('../../bots/naming-cop');
const payload = require('../fixtures/pull_request.opened');

const fixturesDir = path.resolve('./tests/fixtures');

describe('Naming Cop Comments', () => {
  let probot, privateKey, pullCreatedBody;

  beforeAll(async () => {
    privateKey = await fsp.readFile(path.join(fixturesDir, 'mock-cert.pem'));
    pullCreatedBody = {
      body: await fsp
        .readFile(path.join(fixturesDir, 'pr-message.txt'), 'utf-8'),
    };
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = new Probot({ appId: 123, privateKey });
    probot.load(bot);
  });

  test('should accept report because bot is activated', async () => {

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
      .reply(200, [
        {
          body: '@naming-cop activate',
          user: {
            login: 'hiimbex',
          },
        },
      ]);

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject(pullCreatedBody);

        return true;
      })
      .reply(200);

    // Receive a webhook event
    payload.pull_request.title = '📦 oui: change oui';
    await probot.receive({ name: 'pull_request', payload });
  });

  test('should not create a comment because stfu', async () => {
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
      .reply(200, [
        {
          body: '@naming-cop stfu',
          user: {
            login: 'hiimbex',
          },
        },
      ]);

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
        fn();

        return true;
      })
      .reply(200);

    // Receive a webhook event
    payload.pull_request.title = '📦 oui: change oui';
    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  test('should not create a comment because it\'s been' +
       ' posted recently already', async () => {
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
      .reply(200, [
        {
          body: pullCreatedBody.body,
          user: {
            login: 'naming-cop[bot]',
          },
        },
      ]);

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
        fn();

        return true;
      })
      .reply(200);

    // Receive a webhook event
    payload.pull_request.title = '📦 oui: change oui';
    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  test('should not create a comment because it\'s been' +
       ' posted recently already and bot is not activated', async () => {
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
      .reply(200, [
        {
          body: 'a random comment',
          user: {
            login: 'hiimbex',
          },
        },
        {
          body: pullCreatedBody.body,
          user: {
            login: 'naming-cop[bot]',
          },
        },
        {
          body: '@naming-cop stfu',
          user: {
            login: 'hiimbex',
          },
        },
      ]);

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
        fn();

        return true;
      })
      .reply(200);

    // Receive a webhook event
    payload.pull_request.title = '📦 oui: change oui';
    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
