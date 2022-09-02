const fs = require('fs');

const nock = require('nock');
const { Probot, ProbotOctokit } = require('probot');

const bot = require('.');
const payload = require('~fixtures/pull_request.opened');

describe('repro-cop', () => {
  let probot, issueCreatedBody;

  beforeAll(async () => {
    issueCreatedBody = {
      body: fs
        .readFileSync(require.resolve('~fixtures/issue-message.txt'), 'utf-8'),
    };
  });

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey: fs.readFileSync(require.resolve('~fixtures/mock-cert.pem')),
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    probot.load(bot);
  });

  test('should create a comment when there is no links' +
    'to reproduce bug(s)', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject(issueCreatedBody);

        return true;
      })
      .reply(200);

    await probot.receive({ name: 'issues', payload });
  });

  test('should not create a comment when there are links' +
    'to reproduce bug(s)', async () => {
    const fn = jest.fn();

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
        fn();

        return true;
      })
      .reply(200);

    payload.issue.body = 'https://jsbin.com';
    await probot.receive({ name: 'issues', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
