const fs = require('fs');

const nock = require('nock');
const { Probot, ProbotOctokit } = require('probot');

const bot = require('./index');
const payload = require('~fixtures/pull_request.opened');

describe('auto-review', () => {
  let probot;

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

  test('should only add CODEOWNERS as reviewers to a PR', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .get('/repos/hiimbex/testing-things/contents/')
      .reply(200, [])
      .get('/repos/hiimbex/testing-things/collaborators')
      .query(true)
      .reply(200, [
        { login: 'hiimbex' },
        { login: 'bexhiim' },
      ])
      .get('/repos/hiimbex/testing-things/contents/CODEOWNERS')
      .reply(200, {
        content: 'QGJleGhpaW0=', // @bexhiim
      })
      .post('/repos/hiimbex/testing-things/pulls/1/requested_reviewers', b => {
        expect(b).toMatchObject({ reviewers: ['bexhiim'] });

        return true;
      })
      .reply(201);

    await probot.receive({ name: 'pull_request', payload });
  });

  test('should only add existing contributors as reviewers', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .get('/repos/hiimbex/testing-things/contents/')
      .reply(200, [])
      .get('/repos/hiimbex/testing-things/collaborators')
      .reply(200, [
        { login: 'hiimbex' },
        { login: 'bexhiim' },
      ])
      .get('/repos/hiimbex/testing-things/contents/CODEOWNERS')
      .reply(200, {
        content: 'KiAgICAgICAgQGJleGhpaW0gQHVzZXI=', // @bexhiim @user
      })
      .post('/repos/hiimbex/testing-things/pulls/1/requested_reviewers', b => {
        expect(b).toMatchObject({ reviewers: ['bexhiim'] });

        return true;
      })
      .reply(201);

    await probot.receive({ name: 'pull_request', payload });
  });

  test('should allow to set maxAssignees from config file', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .get('/repos/hiimbex/testing-things/contents/')
      .reply(200, [{ name: '.botsrc.json', path: '.botsrc.json' }])
      .get('/repos/hiimbex/testing-things/contents/.botsrc.json')
      .reply(200, {
        content:
          'ewogICJhdXRvUmV2aWV3IjogewogICAgIm1heEFzc2lnbmVlcyI6IDEKICB9Cn0=',
      })
      .get('/repos/hiimbex/testing-things/collaborators')
      .reply(200, [
        { login: 'notOwner' },
        { login: 'bexhiim' },
        { login: 'user' },
      ])
      .get('/repos/hiimbex/testing-things/contents/CODEOWNERS')
      .reply(200, {
        content: 'KiAgICAgICAgQGJleGhpaW0gQHVzZXI=', // @bexhiim @user
      })
      .post('/repos/hiimbex/testing-things/pulls/1/requested_reviewers', b => {
        expect(b).toMatchObject({ reviewers: ['user'] });

        return true;
      })
      .reply(201);

    await probot.receive({ name: 'pull_request', payload });
  });

  test('should add reviewers even when no CODEOWNERS file is ' +
    'found', async () => {
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .get('/repos/hiimbex/testing-things/contents/')
      .reply(200, [])
      .get('/repos/hiimbex/testing-things/collaborators')
      .reply(200, [
        { login: 'hiimbex' },
        { login: 'bexhiim' },
      ])
      .get('/repos/hiimbex/testing-things/contents/CODEOWNERS')
      .reply(404)
      .post('/repos/hiimbex/testing-things/pulls/1/requested_reviewers', b => {
        expect(b).toMatchObject({ reviewers: ['bexhiim'] });

        return true;
      })
      .reply(200);

    await probot.receive({ name: 'pull_request', payload });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
