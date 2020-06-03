const { promises: fsp } = require('fs');
const path = require('path');
const nock = require('nock');
const { createProbot } = require('probot');

const namingCop = require('../../bots/repro-cop');
const payload = require('../fixtures/pull_request.opened');

const fixturesDir = path.resolve('./tests/fixtures');

describe('Repro Cop', () => {
  let probot, cert, issueCreatedBody;

  beforeAll(async () => {
    cert = await fsp.readFile(path.join(fixturesDir, 'mock-cert.pem'));
    issueCreatedBody = {
      body: await fsp
        .readFile(path.join(fixturesDir, 'issue-message.txt'), 'utf-8'),
    };
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = createProbot({ id: 123, cert });
    probot.load(namingCop);
  });

  test('should create a comment when there is no links' +
    'to reproduce bug(s)', async () => {

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject(issueCreatedBody);
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: 'issues', payload });
  });

  test('should not create a comment when there are links' +
    'to reproduce bug(s)', async () => {
    const fn = jest.fn();
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        fn();
        return true;
      })
      .reply(200);

    // Receive a webhook event
    payload.issue.body = 'https://jsbin.com';
    await probot.receive({ name: 'issues', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});