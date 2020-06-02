const { promises: fsp } = require('fs');
const path = require('path');
const nock = require('nock');
const { createProbot } = require('probot');

const namingCop = require('../../bots/auto-update');
const payload = require('../fixtures/pull_request.opened');
const commentBody = '⚠️ Cannot update branch : something awful happened';

const fixturesDir = path.resolve('./tests/fixtures');

jest.setTimeout(30000);
describe('Auto Update', () => {
  let probot, cert;

  beforeAll(async () => {
    cert = await fsp.readFile(path.join(fixturesDir, 'mock-cert.pem'));
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = createProbot({ id: 123, cert });
    probot.load(namingCop);
  });

  test('should update head branch', async () => {
    const fn = jest.fn();
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/compare/hiimbex:master...hiimbex:dev')
      .reply(200, { behind_by: 2 });

    nock('https://api.github.com')
      .put('/repos/hiimbex/testing-things/pulls/1/update-branch', body => {
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
      .get('/repos/hiimbex/testing-things/compare/hiimbex:master...hiimbex:dev')
      .reply(200, { behind_by: 0 });

    nock('https://api.github.com')
      .put('/repos/hiimbex/testing-things/pulls/1/update-branch', body => {
        fn();
        return true;
      })
      .reply(202);
      
    await probot.receive({ name: 'pull_request', payload});
    expect(fn).not.toHaveBeenCalled();
  });

  test('should create a comment about failing', async () => {

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/compare/hiimbex:master...hiimbex:dev')
      .reply(200, { behind_by: 2 });

    nock('https://api.github.com')
      .put('/repos/hiimbex/testing-things/pulls/1/update-branch')
      .replyWithError({
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