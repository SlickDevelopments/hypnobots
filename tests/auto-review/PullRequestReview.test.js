const { promises: fsp } = require('fs');
const path = require('path');
const nock = require('nock');
const { createProbot } = require('probot');

const namingCop = require('../../bots/auto-review');
const payload = require('../fixtures/pull_request.opened');

const fixturesDir = path.resolve('./tests/fixtures');

jest.setTimeout(30000);
describe('Auto Review', () => {
  let probot, cert;

  beforeAll(async () => {
    cert = await fsp.readFile(path.join(fixturesDir, 'mock-cert.pem'));
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = createProbot({ id: 123, cert });
    probot.load(namingCop);
  });

  test('should send a pull request review request', async () => {

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/collaborators')
      .reply(200,
        [
          {
            login: 'hiimbex',
            permissions: {
              admin: true,
            },
          },
          {
            login: 'bexhiim',
            permissions: {
              admin: true,
            },
          }]
      );
    
    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/CODEOWNERS')
      .reply(200, {
        content: 'KiAgICAgICAgICAgICAgICAgQGhpaW1iZXg=', // *      @hiimbex
      });
    
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/pulls/1/requested_reviewers', b => {
        expect(b).toMatchObject({ reviewers: ['bexhiim'] });
        return true;
      })
      .reply(201);

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload });
  });

  test('should send a pull request review request 2', async () => {

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/collaborators')
      .reply(200,
        [
          {
            login: 'hiimbex',
            permissions: {
              admin: true,
            },
          },
          {
            login: 'bexhiim',
            permissions: {
              admin: false,
            },
          },
        ],
      );
    
    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/CODEOWNERS')
      .reply(200, {
        content: 'KiAgICAgICAgQGJleGhpaW0gQHVzZXI=', // *       @bexhiim @user
      });
    
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/pulls/1/requested_reviewers', b => {
        expect(b).toMatchObject({ reviewers: ['bexhiim'] });
        return true;
      })
      .reply(201);

    // Receive a webhook event
    await probot.receive({ name: 'pull_request', payload });
  });

  test('should create a comment about failing', async () => {

    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/collaborators')
      .reply(200,
        [
          {
            login: 'hiimbex',
            permissions: {
              admin: true,
            },
          },
          {
            login: 'bexhiim',
            permissions: {
              admin: false,
            },
          }],
      );
    
    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/CODEOWNERS')
      .reply(404);

    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject({ body: 'Failed to find a reviewer ✖' });
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