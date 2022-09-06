const { getConfig, matchAll } = require('../utils');

const shouldIgnoreBranch = branch =>
  /^master|develop|renovate|dependabot/.test(branch);

module.exports = app => {
  app.on(['pull_request.opened', 'pull_request.reopened'], async context => {
    const { pull_request: pull } = context.payload;
    const { owner, repo } = context.issue();

    if (shouldIgnoreBranch(pull.head.ref)) {
      context.log('ignoring branch');

      return;
    }

    const config = await getConfig(context, 'autoReview');
    const maxAssignees = config?.maxAssignees > 0 ? config.maxAssignees : 2;
    const collaborators = [];

    try {
      const { data: collabs } = await context.octokit.rest.repos
        .listCollaborators({ owner, repo });

      for (const collab of collabs) {
        collaborators.push(collab.login.toLowerCase());
      }
    } catch (e) {
      console.error(e);
      context.log('could not get collaborators');
    }

    const owners = [];

    try {
      const file = await context.octokit.repos.getContent({
        owner,
        repo,
        path: 'CODEOWNERS',
      });
      const content = Buffer
        .from(file.data.content, 'base64').toString('ascii');

      const users = matchAll(content, /@(\w*)/g);

      for (const [_, user] of users) {
        if (collaborators.includes(user.toLowerCase())) {
          owners.push(user.toLowerCase());
        }
      }
    } catch (e) {
      context.log('could not read CODEOWNERS');
    }

    const reviewers = [...new Set(owners.length ? owners : collaborators)]
      .filter(u => u !== owner.toLowerCase())
      .slice(0, maxAssignees - 1);

    if (reviewers.length > 0) {
      context.octokit.pulls.requestReviewers({
        owner,
        repo,
        pull_number: pull.number,
        reviewers,
      });
    }
  });
};
