const fs = require('fs');
const path = require('path');

const {
  getPipelineId,
  shouldIgnoreBranch,
  getConfig,
  buildSourceUrl,
  getCustomRelatedEnvironment,
  getEnv,
  createApp,
} = require('./utils');

describe('utils.js', () => {
  describe('getPipelineId(context, name)', () => {
    test('should get a pipeline id through heroku', async () => {
      const pipelineId = await getPipelineId({
        heroku: {
          get: jest.fn().mockReturnValue({ id: '123' }),
        },
      }, 'test');

      expect(pipelineId).toBe('123');
    });
  });

  describe('shouldIgnoreBranch(branch)', () => {
    test('should ignore all non-pr branches & bot branches', () => {
      expect(shouldIgnoreBranch('master')).toBe(true);
      expect(shouldIgnoreBranch('develop')).toBe(true);
      expect(shouldIgnoreBranch('renovate/jest-monorepo')).toBe(true);
      expect(shouldIgnoreBranch('dependabot/jest-monorepo')).toBe(true);
      expect(shouldIgnoreBranch('feature/test')).toBe(false);
      expect(shouldIgnoreBranch('fix/test-fix')).toBe(false);
    });
  });

  describe('getConfig(context)', () => {
    const ctx = {
      octokit: { rest: { repos: { getContent: jest.fn() } } },
      payload: { pull_request: { head: { ref: 'test' } } },
      issue: jest.fn().mockReturnValue({ owner: 'test', repo: 'test' }),
    };

    test('should load config files correctly', async () => {
      ctx.octokit.rest.repos.getContent.mockReturnValue({
        data: {
          content: fs
            .readFileSync(path.resolve('./tests/fixtures/bot.yml'), 'base64'),
        },
      });

      expect(await getConfig(ctx)).toMatchObject({
        pipeline: 'test',
        env: { CUSTOM_ENV_VAR: 'custom_value' },
        repos: {
          'owner/another-repo': {
            CUSTOM_ENV_VAR: 'another_custom_value_{pr}',
          },
        },
      });
    });
  });

  describe('buildSourceUrl(context)', () => {
    process.env.PRIVATE_USER = 'test';
    process.env.PRIVATE_ACCESS_TOKEN = 'test';

    const ctx = {
      payload: {
        pull_request: {
          head: {
            ref: '1234',
            repo: {
              full_name: 'owner/test',
              url: 'https://github.com/owner/test',
            },
          },
        },
      },
    };

    test('should build a source url for private repos', () => {
      ctx.payload.pull_request.head.repo.private = true;

      expect(buildSourceUrl(ctx))
        .toBe('https://test:test@api.github.com/repos/owner/test/tarball/1234');
    });

    test('should build a source url for public repos', () => {
      ctx.payload.pull_request.head.repo.private = false;

      expect(buildSourceUrl(ctx))
        .toBe('https://github.com/owner/test/tarball/1234');
    });
  });

  describe('getCustomRelatedEnvironment(context, config)', () => {
    const ctx = {
      octokit: {
        rest: {
          repos: { getContent: jest.fn() },
          issues: { listComments: jest.fn() },
        },
      },
      payload: { pull_request: { head: { ref: 'test' }, number: '321' } },
      issue: jest.fn().mockReturnValue({ owner: 'test', repo: 'test' }),
    };

    test('should handle bot.yml repos', async () => {
      ctx.octokit.rest.repos.getContent.mockReturnValue({
        data: {
          content: fs
            .readFileSync(path.resolve('./tests/fixtures/bot.yml'), 'base64'),
        },
      });
      ctx.octokit.rest.issues.listComments.mockReturnValue({
        data: [{ body: '@review owner/another-repo #123' }],
      });

      const config = await getConfig(ctx);

      expect(await getCustomRelatedEnvironment(ctx, config))
        .toMatchObject({ CUSTOM_ENV_VAR: 'another_custom_value_123' });
    });
  });

  describe('getEnv(context, config)', () => {
    const ctx = {
      octokit: {
        rest: {
          repos: { getContent: jest.fn() },
          issues: { listComments: jest.fn() },
        },
      },
      payload: { pull_request: { head: { ref: 'test' }, number: '321' } },
      issue: jest.fn().mockReturnValue({ owner: 'test', repo: 'test' }),
    };

    test('should handle a basic env', async () => {
      ctx.octokit.rest.repos.getContent.mockReturnValue({
        data: {
          content: fs
            .readFileSync(path.resolve('./tests/fixtures/bot.yml'), 'base64'),
        },
      });
      ctx.octokit.rest.issues.listComments.mockReturnValueOnce({
        data: [],
      });

      const config = await getConfig(ctx);

      expect(await getEnv(ctx, config))
        .toMatchObject({ CUSTOM_ENV_VAR: 'custom_value' });
    });

    test('should handle envs with custom external repos', async () => {
      ctx.octokit.rest.issues.listComments.mockReturnValueOnce({
        data: [{ body: '@review owner/another-repo #123' }],
      });

      const config = await getConfig(ctx);

      expect(await getEnv(ctx, config))
        .toMatchObject({ CUSTOM_ENV_VAR: 'another_custom_value_123' });
    });
  });

  describe('createApp(context, config)', () => {
    const ctx = {
      octokit: {
        rest: {
          repos: { getContent: jest.fn() },
          issues: { listComments: jest.fn().mockReturnValue({ data: [] }) },
        },
      },
      heroku: {
        get: jest.fn(),
        post: jest.fn(),
      },
      log: jest.fn(),
      payload: {
        pull_request: {
          head: {
            ref: 'test',
            sha: '123',
            repo: { private: true, full_name: 'owner/test-repo' },
          },
          number: '321',
        },
      },
      issue: jest.fn().mockReturnValue({ owner: 'test', repo: 'test' }),
    };

    test('should successfuly create a review app', async () => {
      ctx.octokit.rest.repos.getContent.mockReturnValue({
        data: {
          content: fs
            .readFileSync(path.resolve('./tests/fixtures/bot.yml'), 'base64'),
        },
      });
      ctx.heroku.get
        // GET /pipelines/test-pipeline
        .mockReturnValueOnce({ id: '123' })
        // GET /pipelines/123/review-apps
        .mockReturnValueOnce([]);
      ctx.heroku.post
        // POST /review-apps
        .mockReturnValueOnce({ status: 'pending' });

      const config = await getConfig(ctx);

      const res = await createApp(ctx, config);
      expect(res).toMatchObject({ status: 'pending' });
      expect(ctx.heroku.post).toHaveBeenCalledWith('/review-apps', {
        body: {
          pipeline: '123',
          branch: 'test',
          source_blob: {
            url: 'https://test:test@api.github.com/repos/owner/test-repo' +
              '/tarball/test',
            version: '123',
          },
          pr_number: '321',
          environment: { CUSTOM_ENV_VAR: 'custom_value' },
        },
      });
    });
  });
});
