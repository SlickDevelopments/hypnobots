const heroku = require('heroku-client');

const {
  shouldIgnoreBranch,
  writeComment,
  getConfig,
  createApp,
  deleteApp,
  sleep,
} = require('./utils.js');

const client = new heroku({ token: process.env.HEROKU_API_TOKEN });

const commands = [{
  regex: /^@review (.*) #(\d*)/,
  handler: async (context, config) => {
    await writeComment(
      context,
      'Command received, rebuilding review app with new environment!',
    );
    await deleteApp(context, config);
    await sleep(5000);
    await createApp(context, config);
  },
}, {
  regex: /^@review rebuild/,
  handler: async (context, config) => {
    await writeComment(
      context,
      'Command received, rebuilding review app!',
    );
    await deleteApp(context, config);
    await sleep(5000);
    await createApp(context, config);
  },
}, {
  regex: /^@review delete/,
  handler: async (context, config) => {
    await writeComment(
      context,
      'Command received, manually deleting review app!',
    );
    await deleteApp(context, config);
  },
}];

module.exports = app => {
  app.on(['pull_request.opened', 'pull_request.reopened'], async context => {
    context.heroku = client;
    const { pull_request: pullRequest } = context.payload;

    if (shouldIgnoreBranch(pullRequest.head.ref)) {
      context.log('ignoring branch');

      return;
    }

    const config = await getConfig(context);

    if (!config) {
      context.log('config is missing or ill-formed');

      return;
    }

    const reviewApp = await createApp(context, config);

    if (reviewApp) {
      await writeComment(context, `
        Creating an app for: https://${config.pipeline}-pr-${pullRequest.number}.herokuapp.com.
        Additional bot commands:
        - \`@review rebuild\` — Rebuilds the app with all the custom environment variables
        - \`@review delete\` — Deletes the app (if automatic deletion doesn't work)
        - \`@review <repo> #<pr-number>\` — Modify environment with a PR from another repo (ex: \`@review p3ol/oak #1\`)
      `);
    }
  });

  app.on('pull_request.closed', async context => {
    context.heroku = client;
    const { pull_request: pullRequest } = context.payload;

    if (shouldIgnoreBranch(pullRequest.head.ref)) {
      return;
    }

    const config = await getConfig(context);

    if (!config) {
      context.log('config is missing or ill-formed');

      return;
    }

    await deleteApp(context, config);
  });

  app.on('issue_comment.created', async context => {
    context.heroku = client;
    const { owner, repo, issue_number: number } = context.issue();
    const { data: pullRequest } = await context.octokit.rest.pulls
      .get({ owner, repo, pull_number: number });

    context.payload.pull_request = pullRequest;

    if (shouldIgnoreBranch(pullRequest.head.ref)) {
      return;
    }

    const config = await getConfig(context);

    if (!config) {
      context.log('config is missing or ill-formed');

      return;
    }

    for (const command of commands) {
      if (command.regex.test(context.payload.comment.body)) {
        await command.handler(context, config);
      }
    }
  });
};
