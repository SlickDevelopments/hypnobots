const nock = require('nock');
// Requiring our app implementation
const namingCop = require('../../bots/naming-cop');
const { Probot } = require('probot');
// Requiring our fixtures
const payload = require('../fixtures/pull_request.opened');
const pullCreatedBody = { body: `
The following commit do not follow Poool's rules:

* id : 1

<details>

 - ✖ type must be one of [chore, docs, feat, fix, refactor, test]

</details>

--------

Happy coding!
` };
const fs = require('fs');
const path = require('path');

describe('Naming Cop', () => {
  let probot;
  let mockCert;

  beforeAll((done) => {
    const file = path.join(__dirname, '../fixtures/mock-cert.pem');
    fs.readFile(file, (err, cert) => {
      if (err) return done(err);
      mockCert = cert;
      done();
    });
    payload.pull_request.title = '📦 chore: change things';
    payload.pull_request.head.ref = 'feature/things';
  });

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({ id: 123, cert: mockCert });
    // Load our app into probot
    probot.load(namingCop);
  });

  test('should create a comment when a pull request is opened' +
       ' and commits are ill-formed', async () => {
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
      .post('/repos/hiimbex/testing-things/pull/1/comments', (body) => {
        expect(body).toMatchObject(pullCreatedBody);
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ event: 'pull_request', payload });

  });
  
  test('should not create a comment when a pull request is opened' +
       ' and commits are not ill-formed', async () => {
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
      .post('/repos/hiimbex/testing-things/pull/1/comments', (body) => {
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
