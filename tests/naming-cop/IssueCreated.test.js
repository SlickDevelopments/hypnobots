const { promises: fsp } = require('fs');
const path = require('path');
const nock = require('nock');
const { Probot } = require('probot');

const bot = require('../../bots/naming-cop');
const payload = require('../fixtures/issue_comment.created');

const fixturesDir = path.resolve('./tests/fixtures');

describe('Naming Cop Issue', () => {
  let probot, privateKey;

  beforeAll(async () => {
    privateKey = await fsp.readFile(path.join(fixturesDir, 'mock-cert.pem'));
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = new Probot({ id: 123, privateKey });
    probot.load(bot);
  });

  test('should create a comment when a comment is created ' +
    'and ask bot to stfu', async () => {

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject({ body: 'Okay I will now shut up.' });
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: 'issue_comment', payload });
  });

  test('should create a comment when a comment is created ' +
    'and ask bot to activate', async () => {

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject({ body: 'Yay I can speak.' });
        return true;
      })
      .reply(200);

    // Receive a webhook event
    payload.comment.body = '@naming-cop activate';
    await probot.receive({ name: 'issue_comment', payload });
  });

  test('should not create a comment when a comment is created', async () => {
    const fn = jest.fn();
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
        fn();
        return true;
      })
      .reply(200);

    // Receive a webhook event
    payload.comment.body = 'no problem here';
    await probot.receive({ name: 'issue_comment', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
