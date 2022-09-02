const { sleep, getConfig, writeComment } = require('./utils');

const template = `This PR will trigger a new deploy for the following services:
`;

const runDiff = async context => {
  const { owner, repo } = context.issue();
  const { pull_request: pullRequest } = context.payload;
  const serviceRegex = /^(?:fix|feat)\((.+)\)/;
  const services = [];

  const config = await getConfig(context);

  if (!config) {
    context.log('config is missing or ill-formed');

    return;
  }

  let page = 0;

  while (page >= 0) {
    const { data: commits } = await context.octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: pullRequest.number,
      per_page: 100,
      page,
    });

    commits
      .filter(c => serviceRegex.test(c.commit.message))
      .map(c => serviceRegex.exec(c.commit.message)[1])
      .forEach(c => {
        if (
          !services.includes(c) &&
          config.services?.includes(c)
        ) {
          services.push(c);
        }
      });

    if (commits.length === 0 || commits.length < 100) {
      page = -1;
      break;
    }

    await sleep(100);
  }

  if (services.length) {
    await writeComment(context, template +
      services.map(s => `- ${s}`).join('\n') + '\n');
  }
};

module.exports = app => {
  app.on('pull_request.opened', runDiff);
  app.on('pull_request.reopened', runDiff);
  app.on('pull_request.edited', runDiff);
  app.on('pull_request.synchronize', runDiff);
};
