const nock = require('nock');
const { Probot, ProbotOctokit } = require('probot');

const bot = require('./index');
const payload = require('~fixtures/pull_request.opened');

describe('auto-review', () => {
  let probot;

  beforeEach(async () => {
    nock.disableNetConnect();
    probot = new Probot({
      githubToken: 'test',
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    probot.load(bot);
  });

  test('should add reviewers to a PR', async () => {
    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/.')
      .reply(200, [])
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
      )
      .get('/repos/hiimbex/testing-things/contents/CODEOWNERS')
      .reply(200, {
        content: 'KiAgICAgICAgICAgICAgICAgQGhpaW1iZXg=', // @bexhiim
      })
      .post('/repos/hiimbex/testing-things/pulls/1/requested_reviewers', b => {
        expect(b).toMatchObject({ reviewers: ['bexhiim'] });

        return true;
      })
      .reply(201);

    await probot.receive({ name: 'pull_request', payload });
  });

  test('should only add contributors as reviewers', async () => {
    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/.')
      .reply(200, [])
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
      )
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

  test('should send a pull request review request 3', async () => {
    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/.')
      .reply(200, [{ name: '.botsrc.json', path: '.botsrc.json' }])
      .get('/repos/hiimbex/testing-things/contents/.botsrc.json')
      .reply(200, {
        content:
          'ewogICJhdXRvUmV2aWV3IjogewogICAgIm1heEFzc2lnbmVlcyI6IDIKICB9Cn0=',
      })
      .get('/repos/hiimbex/testing-things/collaborators')
      .reply(200,
        [
          {
            login: 'notOwner',
            permissions: {
              admin: true,
            },
          },
          {
            login: 'bexhiim',
            permissions: {
              admin: true,
            },
          },
          {
            login: 'another',
            permissions: {
              admin: true,
            },
          },
        ],
      )
      .get('/repos/hiimbex/testing-things/contents/CODEOWNERS')
      .reply(200, {
        content: 'KiAgICAgICAgQGJleGhpaW0gQHVzZXI=', // @bexhiim @user
      })
      .post('/repos/hiimbex/testing-things/pulls/1/requested_reviewers', b => {
        expect(b).toMatchObject({ reviewers: ['notOwner', 'bexhiim'] });

        return true;
      })
      .reply(201);

    await probot.receive({ name: 'pull_request', payload });
  });

  test('should create a comment about failing', async () => {
    nock('https://api.github.com')
      .get('/repos/hiimbex/testing-things/contents/.')
      .reply(200, [])
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
      )
      .get('/repos/hiimbex/testing-things/contents/CODEOWNERS')
      .reply(404)
      .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
        expect(body).toMatchObject({ body: 'Failed to find a reviewer ✖' });

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
