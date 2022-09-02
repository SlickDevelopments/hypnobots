const { normalizeIssue } = require('../utils');

module.exports = app => {
  app.on(['pull_request.opened', 'pull_request.reopened'], async context => {
    try {
      const { owner, repo, issue_number: number } = context.issue();
      const pull = { owner, repo, pull_number: number };
      const head = context.payload.pull_request.head.label;
      const base = context.payload.pull_request.base.label;

      const { data } = await context.octokit.repos
        .compareCommits({ owner, repo, base, head });

      if (data.behind_by > 0) {
        await context.octokit.pulls.updateBranch(pull);
      }
    } catch (e) {
      context.log('cannot update branch: ' + e);
      const comment = context
        .issue({ body: `⚠️ Cannot update branch : ${e.message}` });
      await context.octokit.issues.createComment(normalizeIssue(comment));
    }
  });
};
