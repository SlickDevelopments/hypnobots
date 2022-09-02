const fs = require('fs');

const nock = require('nock');
const { Probot, ProbotOctokit } = require('probot');

const bot = require('./index');
const payload = require('~fixtures/pull_request.opened');

describe('Auto Update', () => {
  let probot, commentBody;

  beforeAll(async () => {
    commentBody = fs
      .readFileSync(require.resolve('~fixtures/pr-comment-error.txt'), 'utf-8')
      .trim();
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
      logLevel: false,
    });
    probot.load(bot);
  });

  test('should update head branch', async () => {
    const fn = jest.fn();

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .get(
        '/repos/hiimbex/testing-things/compare/' +
        encodeURIComponent('hiimbex:master...hiimbex:dev')
      )
      .reply(200, { behind_by: 2 })
      .put('/repos/hiimbex/testing-things/pulls/1/update-branch', () => {
        fn();

        return true;
      })
      .reply(202);

    await probot.receive({ name: 'pull_request', payload });
    expect(fn).toHaveBeenCalled();
  });

  test('should do nothing', async () => {
    const fn = jest.fn();

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .get(
        '/repos/hiimbex/testing-things/compare/' +
        encodeURIComponent('hiimbex:master...hiimbex:dev')
      )
      .reply(200, { behind_by: 0 })
      .put('/repos/hiimbex/testing-things/pulls/1/update-branch', () => {
        fn();

        return true;
      })
      .reply(202);

    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  test('should create a comment about failing', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .get(
        '/repos/hiimbex/testing-things/compare/' +
        encodeURIComponent('hiimbex:master...hiimbex:dev')
      )
      .reply(200, { behind_by: 2 })
      .put('/repos/hiimbex/testing-things/pulls/1/update-branch')
      .reply(400, {
        message: 'something awful happened',
        code: 'AWFUL_ERROR',
      })
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
