const yaml = require('js-yaml');

const getPipelineId = async (context, name) => {
  try {
    const { id } = await context.heroku.get(`/pipelines/${name}`);

    return id;
  } catch (e) {
    return null;
  }
};

const shouldIgnoreBranch = branch =>
  /^master|develop|renovate|dependabot/.test(branch);

const writeComment = async (context, comment) => {
  try {
    await context.octokit.rest.issues.createComment(context.issue({
      body: comment,
    }));
  } catch (e) {
    context.log(`cannot write comment to issue: ${e}`);
  }
};

const getConfig = async context => {
  const { pull_request: pullRequest } = context.payload;
  const { owner, repo } = context.issue();
  const ref = pullRequest.head.ref || 'master';

  try {
    const file = await context.octokit.rest.repos.getContent({
      owner, repo, path: '.github/bot.yml', ref,
    });

    const buff = Buffer.from(file.data.content, 'base64');
    const content = buff.toString('ascii');

    return yaml.load(content);
  } catch (e) {
    context.log('error reading bot config file: ' + e);

    return null;
  }
};

const buildSourceUrl = context => {
  const { pull_request: pullRequest } = context.payload;
  const { ref, repo } = pullRequest.head;

  if (repo.private) {
    const user = `${process.env.PRIVATE_USER}:${process.env.PRIVATE_ACCESS_TOKEN}`;

    return `https://${user}@api.github.com/repos/${repo.full_name}/tarball/${ref}`;
  } else {
    return `${repo.url}/tarball/${ref}`;
  }
};

const getCustomRelatedEnvironment = async (context, config) => {
  const { data } = await context.octokit.rest.issues
    .listComments(context.issue());
  const regex = /^@review (.*) #(\d*)/;
  const env = {};

  for (const { body } of (data || []).reverse()) {
    const [_, repoName, prNumber] = body.match(regex) || [];

    if (repoName && prNumber && config.repos?.[repoName]) {
      Object.entries(config.repos[repoName] || {}).forEach(([key, value]) => {
        env[key] = value?.replace?.('{pr}', prNumber) || value;
      });
    }
  }

  return env;
};

const getEnv = async (context, config) => {
  const customEnv = await getCustomRelatedEnvironment(context, config);
  const { pull_request: pullRequest } = context.payload;

  return []
    .concat(Object.entries(config.env || {}))
    .concat(Object.entries(customEnv || {}))
    .reduce((res, [key, value]) => {
      res[key] = value?.replace?.('{pr}', pullRequest.number) || value;

      return res;
    }, {});
};

const createApp = async (context, config) => {
  const { pull_request: pullRequest } = context.payload;
  const { ref, sha } = pullRequest.head;
  const pipelineId = await getPipelineId(context, config.pipeline);

  if (!pipelineId) {
    context.log('create: pipeline id was not found');

    return null;
  }

  const reviewApps = await context.heroku
    .get(`/pipelines/${pipelineId}/review-apps`);

  const app = reviewApps.find(app => app.pr_number === pullRequest.number);

  if (app) {
    context.log('create: app already exists');

    return false;
  }

  const url = buildSourceUrl(context);

  try {
    const app = await context.heroku.post('/review-apps', {
      body: {
        branch: ref,
        pipeline: pipelineId,
        source_blob: { url, version: sha },
        pr_number: pullRequest.number,
        environment: await getEnv(context, config),
      },
    });

    return app;
  } catch (e) {
    console.error(e);
    context.log(`an error occured while creating the review app : ${e}`);

    return null;
  }
};

const deleteApp = async (context, config) => {
  const { pull_request: pullRequest } = context.payload;
  const pipelineId = await getPipelineId(context, config.pipeline);

  if (!pipelineId) {
    context.log('delete: pipeline id was not found');

    return null;
  }

  const reviewApps = await context.heroku
    .get(`/pipelines/${pipelineId}/review-apps`);
  const app = reviewApps.find(app => app.pr_number === pullRequest.number);

  if (!app) {
    context.log('delete: app was not found');

    return;
  }

  try {
    await context.heroku.delete(`/review-apps/${app.id}`);
  } catch (e) {
    context.log(`an error occured while deleting the review app : ${e}`);
  }
};

const sleep = ms => new Promise(resolve =>
  globalThis.__TEST__ ? resolve() : setTimeout(resolve, ms)
);

module.exports = {
  getPipelineId,
  buildSourceUrl,
  shouldIgnoreBranch,
  writeComment,
  getConfig,
  getCustomRelatedEnvironment,
  getEnv,
  createApp,
  deleteApp,
  sleep,
};
