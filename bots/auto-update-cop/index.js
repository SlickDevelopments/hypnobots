const { normalizeIssue } = require('../utils');

module.exports = ({ app }) => {
  app.on(['pull_request.opened', 'pull_request.reopened'], async context => {
    try {
      const { owner, repo, issue_number: number } = context.issue();
      const pull = { owner: owner, repo: repo, pull_number: number };
      const head = context.payload.pull_request.head.label;
      const base = context.payload.pull_request.base.label;

      const compare = { owner, repo, base, head };
      const { data } = await context.github.repos.compareCommits(compare);

      if (data.behind_by > 0) {
        await context.github.pulls.updateBranch(pull);
      }
    } catch (e) {
      const response = `⚠️ Cannot update branch : ${e.message}`;
      const comment = context.issue({ body: response });
      await context.github.issues.createComment(normalizeIssue(comment));
    }
  });
};
