const { promises: fsp } = require('fs');
const path = require('path');
const nock = require('nock');
const { createProbot } = require('probot');

const namingCop = require('../../bots/naming-cop');
const payload = require('../fixtures/pull_request.opened');

const fixturesDir = path.resolve('./tests/fixtures');

describe('Naming Cop', () => {
  let probot, cert, pullCreatedBody;

  beforeAll(async () => {
    cert = await fsp.readFile(path.join(fixturesDir, 'mock-cert.pem'));
    pullCreatedBody = {
      body: await fsp
        .readFile(path.join(fixturesDir, 'commit-message.txt'), 'utf-8'),
    };
    payload.pull_request.title = '📦 chore: change things';
    payload.pull_request.head.ref = 'feature/things';
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = createProbot({ id: 123, cert });
    probot.load(namingCop);
  });

  test('should create a comment when a pull request is opened ' +
    'and commits are ill-formed', async () => {

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/pulls/1/commits')
      .reply(200, {
        data: [{ commit: { message: 'bad: message' }, sha: '1' }],
      });

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/pull/1/comments', body => {
        expect(body).toMatchObject(pullCreatedBody);
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ event: 'pull_request', payload });
  });

  test('should not create a comment when a pull request is opened ' +
    'and commits are not ill-formed', async () => {

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/pulls/1/commits')
      .reply(200, {
        data: [{ commit: { message: 'test: message' }, sha: '1' }],
      });

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/pull/1/comments', body => {
        expect(body).toMatchObject(null);
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ event: 'pull_request', payload });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
