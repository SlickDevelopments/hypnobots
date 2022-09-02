const fs = require('fs');

const nock = require('nock');
const { Probot, ProbotOctokit } = require('probot');

const bot = require('.');
const payload = require('~fixtures/pull_request.opened');

describe('service-deploy-cop', () => {
  let probot, message, botConfig;

  beforeAll(() => {
    botConfig = fs.readFileSync(require.resolve('~fixtures/bot.yml'));
    message = fs
      .readFileSync(require.resolve('~fixtures/services-message.txt'), 'utf-8');
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

  test('should create a comment with appropriate services', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .get('/repos/hiimbex/testing-things/contents/.github%2Fbot.yml')
      .query(true)
      .reply(200, { content: botConfig.toString('base64') })
      .get('/repos/hiimbex/testing-things/pulls/1/commits')
      .query(true)
      .reply(200, [
        { commit: { message: 'fix(dashboard): fix things' } },
        { commit: { message: 'feat(auth): add things' } },
      ])
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject({ body: message });

        return true;
      })
      .reply(200);

    await probot.receive({ name: 'pull_request', payload });
  });

  test('should not create a comment when no service is specified in ' +
    'config', async () => {
    const fn = jest.fn();

    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .get('/repos/hiimbex/testing-things/contents/.github%2Fbot.yml')
      .query(true)
      .reply(200, { content: 'cGlwZWxpbmU6IGRhc2hib2FyZA==' }) // empty config
      .get('/repos/hiimbex/testing-things/pulls/1/commits')
      .query(true)
      .reply(200, [
        { commit: { message: 'fix(dashboard): fix things' } },
        { commit: { message: 'feat(auth): add things' } },
      ])
      .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
        fn();

        return true;
      })
      .reply(200);

    await probot.receive({ name: 'pull_request', payload });
    expect(fn).not.toHaveBeenCalled();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
