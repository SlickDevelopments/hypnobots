const yaml = require('js-yaml');

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

const sleep = ms => new Promise(resolve =>
  globalThis.__TEST__ ? resolve() : setTimeout(resolve, ms)
);

const writeComment = async (context, comment) => {
  try {
    await context.octokit.rest.issues.createComment(context.issue({
      body: comment,
    }));
  } catch (e) {
    context.log(`cannot write comment to issue: ${e}`);
  }
};

module.exports = {
  getConfig,
  sleep,
  writeComment,
};
