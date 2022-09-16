const fs = require('fs');

const nock = require('nock');
const { Probot, ProbotOctokit } = require('probot');
const { cloneDeep } = require('@poool/junipero-utils');

const bot = require('./index');
const payload = require('~fixtures/issue_comment.created');
const prPayload = require('~fixtures/pull_request.opened');

describe('Naming Cop', () => {
  let probot, messages;

  beforeAll(() => {
    messages = {
      badBranch: fs
        .readFileSync(require.resolve('~fixtures/branch-message.txt'), 'utf-8'),
      badPR: fs
        .readFileSync(require.resolve('~fixtures/pr-message.txt'), 'utf-8'),
      badCommit: fs
        .readFileSync(require.resolve('~fixtures/commit-message.txt'), 'utf-8'),
      badPREmoji: fs
        .readFileSync(require.resolve('~fixtures/pr-message-emoji.txt'),
          'utf-8'),
      badPRType: fs
        .readFileSync(require.resolve('~fixtures/pr-message-type.txt'),
          'utf-8'),
      customConfig: fs
        .readFileSync(require.resolve('~fixtures/pr-message-custom.txt'),
          'utf-8'),
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

  describe('issue_comment.created', () => {
    test('should create a comment when a comment is created ' +
      'and ask bot to stfu', async () => {
      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
          expect(body).toMatchObject({ body: 'Okay I will now shut up.' });

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'issue_comment', payload });
    });

    test('should create a comment when a comment is created ' +
      'and ask bot to activate', async () => {
      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
          expect(body).toMatchObject({ body: 'Yay I can speak.' });

          return true;
        })
        .reply(200);

      payload.comment.body = '@naming-cop activate';
      await probot.receive({ name: 'issue_comment', payload });
    });

    test('should not create a comment when a comment is created', async () => {
      const fn = jest.fn();

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
          fn();

          return true;
        })
        .reply(200);

      payload.comment.body = 'no problem here';
      await probot.receive({ name: 'issue_comment', payload });
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('pull_request.opened', () => {
    let payload;

    beforeEach(() => {
      payload = cloneDeep(prPayload);
    });

    test('should create a comment when a pull request is opened ' +
      'and branch name is ill-formed', async () => {
      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
          expect(body).toMatchObject({ body: messages.badBranch });

          return true;
        })
        .reply(200);

      payload.pull_request.head.ref = 'illname';
      await probot.receive({ name: 'pull_request', payload });
    });

    test('should not create a comment when a pull request is opened ' +
      'and branch name is not ill-formed', async () => {
      const fn = jest.fn();

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
          fn();

          return true;
        })
        .reply(200);

      payload.pull_request.head.ref = 'feature/testing';
      await probot.receive({ name: 'pull_request', payload });
      expect(fn).not.toHaveBeenCalled();
    });

    test('should create a comment when a pr is opened and the name is ' +
      'ill-formed', async () => {
      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [
          {
            body: '@naming-cop activate',
            user: {
              login: 'hiimbex',
            },
          },
        ])
        .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
          expect(body).toMatchObject({ body: messages.badPR });

          return true;
        })
        .reply(200);

      payload.pull_request.title = '📦 oui: change oui';
      await probot.receive({ name: 'pull_request', payload });
    });

    test('should not create a comment when the bot has been told to ' +
      'stfu', async () => {
      const fn = jest.fn();

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [
          {
            body: '@naming-cop stfu',
            user: {
              login: 'hiimbex',
            },
          },
        ])
        .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
          fn();

          return true;
        })
        .reply(200);

      payload.pull_request.title = '📦 oui: change oui';
      await probot.receive({ name: 'pull_request', payload });
      expect(fn).not.toHaveBeenCalled();
    });

    test('should create a comment when a pull request is opened ' +
      'and commits are ill-formed', async () => {
      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [{ commit: { message: 'bad: message' }, sha: '1' }])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
          expect(body).toMatchObject({ body: messages.badCommit });

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload });
    });

    test('should not create a comment when a pull request is opened ' +
      'and commits are not ill-formed', async () => {
      const fn = jest.fn();

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [{ commit: { message: 'test: message' }, sha: '1' }])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
          fn();

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload });
      expect(fn).not.toHaveBeenCalled();
    });

    test('should not create a comment when a pull request is opened ' +
      'and commits are not ill-formed and are breaking change', async () => {
      const fn = jest.fn();

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [{ commit: { message: 'test!: message' }, sha: '1' }])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
          fn();

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload });
      expect(fn).not.toHaveBeenCalled();
    });

    // This one is fucked chief
    test('should change the rules and create a comment', async () => {
      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [{ name: '.botsrc.json', path: '.botsrc.json' }])
        .get(
          '/repos/hiimbex/testing-things/contents/' +
          encodeURIComponent('.botsrc.json')
        )
        .reply(200, {
          content: 'ewogICJuYW1pbmdDb3AiOiB7CiAgICAidmFsaWRUeXBlcyI6IFsgImZ' +
            'lYXQiLCAiZml4IiwgInRlc3QiXSwKICAgICJpZ25vcmVMaXN0IjogWyJhcmFuZ' +
            'G9tW2JvdF0iXQogIH0KfQ==',
        })
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
          expect(body).toMatchObject({ body: messages.customConfig });

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload });
    });

    test('should not change the rules and create a comment', async () => {
      const fn = jest.fn();

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
          fn();

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload });
      expect(fn).not.toHaveBeenCalled();
    });

    test('should support directory errors and not create a ' +
      'comment', async () => {
      const fn = jest.fn();

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(404, {
          message: 'something awful happened',
          code: 'AWFUL_ERROR',
        })
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
          fn();

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload });
      expect(fn).not.toHaveBeenCalled();
    });

    test('should support file errors and not create a comment', async () => {
      const fn = jest.fn();

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [{ name: '.botsrc.json', path: '.botsrc.json' }])
        .get(
          '/repos/hiimbex/testing-things/contents/' +
          encodeURIComponent('.botsrc.json')
        )
        .reply(404, {
          message: 'something awful happened',
          code: 'AWFUL_ERROR',
        })
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
          fn();

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload });
      expect(fn).not.toHaveBeenCalled();
    });

    test('should support json errors and not create a comment', async () => {
      const fn = jest.fn();

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [{ name: '.botsrc.json', path: '.botsrc.json' }])
        .get(
          '/repos/hiimbex/testing-things/contents/' +
          encodeURIComponent('.botsrc.json')
        )
        .reply(200, { content: 'ewogICJuYW1pbmdDb3AiOiB7C' })
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
          fn();

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload });
      expect(fn).not.toHaveBeenCalled();
    });

    test('should create a comment when a pull request is opened ' +
      'and type is missing', async () => {
      const pr = cloneDeep(payload);
      pr.pull_request.title = '📦 oui: change oui';

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
          expect(body).toMatchObject({ body: messages.badPR });

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload: pr });
    });

    test('should create a comment when a pull request is opened ' +
         'and emoji isn\'t recognized', async () => {
      const pr = cloneDeep(payload);
      pr.pull_request.title = '🎉 chore: change things';

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
          expect(body).toMatchObject({ body: messages.badPREmoji });

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload: pr });
    });

    test('should not create a comment when a pull request is opened ' +
      'and its title is not ill-formed', async () => {
      const fn = jest.fn();
      const pr = cloneDeep(payload);
      pr.pull_request.title = '📦 chore: change things';

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', () => {
          fn();

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload: pr });
      expect(fn).not.toHaveBeenCalled();
    });

    test('should not allow to use emoji not corresponding to type in PR ' +
      'title', async () => {
      const pr = cloneDeep(payload);
      pr.pull_request.title = '✨ chore: change things';

      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/pulls/1/commits')
        .reply(200, [])
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments', body => {
          expect(body).toMatchObject({ body: messages.badPRType });

          return true;
        })
        .reply(200);

      await probot.receive({ name: 'pull_request', payload: pr });
    });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
