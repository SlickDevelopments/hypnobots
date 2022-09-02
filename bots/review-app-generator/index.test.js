const fs = require('fs');

const nock = require('nock');
const { Probot, ProbotOctokit } = require('probot');
const { cloneDeep } = require('@poool/junipero-utils');
const { _spies } = require('heroku-client');

const bot = require('./index');
const pullRequest = require('~fixtures/pull_request.opened.json');
const comment = require('~fixtures/pr_comment.created.json');

describe('review-app-generator', () => {
  let probot, botConfig;

  beforeEach(async () => {
    nock.disableNetConnect();
    botConfig = fs.readFileSync(require.resolve('~fixtures/bot.yml'));
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

  describe('pull_request.opened', () => {
    const payload = pullRequest;

    test('should create a review app when a pr is opened', async () => {
      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/.github%2Fbot.yml')
        .query(true)
        .reply(200, { content: botConfig.toString('base64') })
        .get('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200, [])
        .post('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200);

      _spies.get.mockReturnValueOnce({ id: 123 }).mockReturnValueOnce([]);
      _spies.post.mockReturnValueOnce(true);

      await probot.receive({ name: 'pull_request', payload });
      expect(_spies.post).toHaveBeenCalledWith('/review-apps', {
        body: {
          branch: 'feature/testing',
          pipeline: 123,
          pr_number: 1,
          source_blob: {
            url: 'https://api.github.com/repos/hiimbex' +
              '/testing-things/tarball/feature/testing',
            version: 'test',
          },
          environment: {
            CUSTOM_ENV_VAR: 'custom_value',
          },
        },
      });
    });

    test('should not create a review app on an ignored branch', async () => {
      const pr = cloneDeep(payload);
      pr.pull_request.head.ref = 'develop';

      const mock = nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/.github%2Fbot.yml')
        .query(true)
        .reply(200, { content: botConfig.toString('base64') });

      await probot.receive({ name: 'pull_request', payload: pr });
      expect(mock.isDone()).toBe(false);
      expect(mock.pendingMocks()).toHaveLength(2);
    });
  });

  describe('pull_request.closed', () => {
    const pr = cloneDeep(pullRequest);
    pr.action = 'closed';

    test('should delete a review app when a PR is closed', async () => {
      nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, { token: 'test' })
        .get('/repos/hiimbex/testing-things/contents/.github%2Fbot.yml')
        .query(true)
        .reply(200, { content: botConfig.toString('base64') });

      _spies.get
        .mockReturnValueOnce({ id: 123 })
        .mockReturnValueOnce([{ id: 1, pr_number: 1 }]);
      _spies.delete.mockReturnValueOnce(true);

      await probot.receive({ name: 'pull_request', payload: pr });
      expect(_spies.delete).toHaveBeenCalledWith('/review-apps/1');
    });
  });

  describe('issue_comment.created', () => {
    describe('@review rebuild', () => {
      const payload = cloneDeep(comment);
      payload.comment.body = '@review rebuild';

      test('should delete then recreate a review app', async () => {
        nock('https://api.github.com')
          .post('/app/installations/2/access_tokens')
          .reply(200, { token: 'test' })
          .get('/repos/hiimbex/testing-things/contents/.github%2Fbot.yml')
          .query(true)
          .reply(200, { content: botConfig.toString('base64') })
          .get('/repos/hiimbex/testing-things/pulls/1')
          .reply(200, pullRequest.pull_request)
          .get('/repos/hiimbex/testing-things/issues/1/comments')
          .reply(200, [])
          .post('/repos/hiimbex/testing-things/issues/1/comments')
          .reply(200);

        _spies.get
          // GET /pipelines/test
          .mockReturnValueOnce({ id: 123 })
          // GET /pipelines/123/review-apps
          .mockReturnValueOnce([{ id: 1, pr_number: 1 }])
          // GET /pipelines/test
          .mockReturnValueOnce({ id: 123 })
          // GET /pipelines/123/review-apps
          .mockReturnValueOnce([]);

        _spies.delete.mockReturnValueOnce(true);
        _spies.post.mockReturnValueOnce(true);

        await probot.receive({ name: 'issue_comment', payload });
        expect(_spies.delete).toHaveBeenCalledWith('/review-apps/1');
        expect(_spies.post).toHaveBeenCalledWith('/review-apps', {
          body: {
            branch: 'feature/testing',
            pipeline: 123,
            pr_number: 1,
            source_blob: {
              url: 'https://api.github.com/repos/hiimbex' +
                '/testing-things/tarball/feature/testing',
              version: 'test',
            },
            environment: {
              CUSTOM_ENV_VAR: 'custom_value',
            },
          },
        });
      });
    });

    describe('@review <repo> #<pr>', () => {
      const payload = cloneDeep(comment);
      payload.comment.body = '@review owner/another-repo #1';

      test('should delete then recreate a review app', async () => {
        nock('https://api.github.com')
          .post('/app/installations/2/access_tokens')
          .reply(200, { token: 'test' })
          .get('/repos/hiimbex/testing-things/contents/.github%2Fbot.yml')
          .query(true)
          .reply(200, { content: botConfig.toString('base64') })
          .get('/repos/hiimbex/testing-things/pulls/1')
          .reply(200, pullRequest.pull_request)
          .get('/repos/hiimbex/testing-things/issues/1/comments')
          .reply(200, [{ body: '@review owner/another-repo #1' }])
          .post('/repos/hiimbex/testing-things/issues/1/comments')
          .reply(200);

        _spies.get
          // GET /pipelines/test
          .mockReturnValueOnce({ id: 123 })
          // GET /pipelines/123/review-apps
          .mockReturnValueOnce([{ id: 1, pr_number: 1 }])
          // GET /pipelines/test
          .mockReturnValueOnce({ id: 123 })
          // GET /pipelines/123/review-apps
          .mockReturnValueOnce([]);

        _spies.delete.mockReturnValueOnce(true);
        _spies.post.mockReturnValueOnce(true);

        await probot.receive({ name: 'issue_comment', payload });
        expect(_spies.delete).toHaveBeenCalledWith('/review-apps/1');
        expect(_spies.post).toHaveBeenCalledWith('/review-apps', {
          body: {
            branch: 'feature/testing',
            pipeline: 123,
            pr_number: 1,
            source_blob: {
              url: 'https://api.github.com/repos/hiimbex' +
                '/testing-things/tarball/feature/testing',
              version: 'test',
            },
            environment: {
              CUSTOM_ENV_VAR: 'another_custom_value_1',
            },
          },
        });
      });
    });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
