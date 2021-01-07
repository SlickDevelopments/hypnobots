const { promises: fsp } = require('fs');
const path = require('path');
const nock = require('nock');
const { Probot } = require('probot');

const bot = require('../../bots/naming-cop');
const payload = require('../fixtures/pull_request.opened');

const fixturesDir = path.resolve('./tests/fixtures');

jest.setTimeout(30000);
describe('Naming Cop Title', () => {
  let probot, privateKey, pullCreatedBody, pullEmojiCreatedBody;

  beforeAll(async () => {
    privateKey = await fsp.readFile(path.join(fixturesDir, 'mock-cert.pem'));
    pullCreatedBody = {
      body: await fsp
        .readFile(path.join(fixturesDir, 'pr-message.txt'), 'utf-8'),
    };
    pullEmojiCreatedBody = {
      body: await fsp
        .readFile(path.join(fixturesDir, 'pr-message-emoji.txt'), 'utf-8'),
    };
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = new Probot({ appId: 123, privateKey });
    probot.load(bot);
  });

  test('should create a comment when a pull request is opened ' +
    'and type is missing', async () => {

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

  test('should create a comment when a pull request is opened ' +
       'and emoji isn\'t recognized', async () => {

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
    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject(pullEmojiCreatedBody);
        return true;
      })
      .reply(200);
    // Receive a webhook event
    payload.pull_request.title = '🎉 chore: change things';
    await probot.receive({ name: 'pull_request', payload });
  });

  test('should not create a comment when a pull request is opened ' +
    'and its title is not ill-formed', async () => {
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
    payload.pull_request.title = '📦 chore: change things';
    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
