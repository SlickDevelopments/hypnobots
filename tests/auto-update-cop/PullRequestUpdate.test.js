const { promises: fsp } = require('fs');
const path = require('path');
const nock = require('nock');
const { Probot } = require('probot');

const bot = require('../../bots/auto-update-cop');
const payload = require('../fixtures/pull_request.opened');

const fixturesDir = path.resolve('./tests/fixtures');

describe('Auto Update', () => {
  let probot, privateKey, commentBody;

  beforeAll(async () => {
    privateKey = await fsp.readFile(path.join(fixturesDir, 'mock-cert.pem'));
    commentBody = (await fsp.readFile(path.join(
      fixturesDir, 'pr-comment-error.txt'), 'utf-8')).trim();
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = new Probot({ appId: 123, privateKey });
    probot.load(bot);
  });

  test('should update head branch', async () => {
    const fn = jest.fn();

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get(
        '/repos/hiimbex/testing-things/compare/' +
        encodeURIComponent('hiimbex:master...hiimbex:dev')
      )
      .reply(200, { behind_by: 2 });

    nock('https://api.github.com')
      .put('/repos/hiimbex/testing-things/pulls/1/update-branch', () => {
        fn();
        return true;
      })
      .reply(202);

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload });
    expect(fn).toHaveBeenCalled();
  });

  test('should do nothing', async () => {
    const fn = jest.fn();
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get(
        '/repos/hiimbex/testing-things/compare/' +
        encodeURIComponent('hiimbex:master...hiimbex:dev')
      )
      .reply(200, { behind_by: 0 });

    nock('https://api.github.com')
      .put('/repos/hiimbex/testing-things/pulls/1/update-branch', () => {
        fn();
        return true;
      })
      .reply(202);

    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  test('should create a comment about failing', async () => {

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get(
        '/repos/hiimbex/testing-things/compare/' +
        encodeURIComponent('hiimbex:master...hiimbex:dev')
      )
      .reply(200, { behind_by: 2 });

    nock('https://api.github.com')
      .put('/repos/hiimbex/testing-things/pulls/1/update-branch')
      .reply(400, {
        message: 'something awful happened',
        code: 'AWFUL_ERROR',
      });

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject({ body: commentBody });
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
