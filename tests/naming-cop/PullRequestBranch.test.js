const nock = require('nock');
// Requiring our app implementation
const namingCop = require('../../bots/naming-cop');
const { Probot } = require('probot');
// Requiring our fixtures
const payload = require('../fixtures/pull_request.opened');
const pullCreatedBody = { body: `
The following branch do not follow Poool's rules:

* id : illname

<details>

 - ✖ branch name do not look like <type>/<name>

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
  });

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({ id: 123, cert: mockCert });
    // Load our app into probot
    probot.load(namingCop);
  });

  test('should create a comment when a pull request is opened' +
       ' and branch name is ill-formed', async () => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/pull/1/comments', (body) => {
        expect(body).toMatchObject(pullCreatedBody);
        return true;
      })
      .reply(200);

    // Receive a webhook event
    payload.pull_request.title = '📦 chore: change things';
    await probot.receive({ event: 'pull_request', payload });
  });
  
  test('should not create a comment when a pull request is opened' +
       ' and branch name is not ill-formed', async () => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' });

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/pull/1/comments', (body) => {
        expect(body).toMatchObject(null);
        return true;
      })
      .reply(200);

    // Receive a webhook event
    payload.pull_request.title = '📦 chore: change things';
    payload.pull_request.head.ref = 'feature/things';
    await probot.receive({ event: 'pull_request', payload });
  });
  
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
