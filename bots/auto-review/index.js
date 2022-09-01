const file = require('./file');
const { getConfig, normalizeIssue } = require('../utils');

module.exports = app => {
  app.on(['pull_request.opened', 'pull_request.reopened'], async context => {
    const { pull_request: pull } = context.payload;
    const { owner, repo: issueRepo } = context.issue();
    const repo = context.repo();
    const { data } = await context.octokit.repos.listCollaborators(repo);
    const reviewers = [];
    const config = await getConfig(context, 'autoReview');
    let maxAssignees = 2;

    if (config && config.maxAssignees && config.maxAssignees > 0) {
      maxAssignees = config.maxAssignees;
    }

    for (const c of data) {
      if (
        c.permissions.admin === true &&
        owner.toLowerCase() !== c.login.toLowerCase() &&
        !reviewers.includes(c.login.toLowerCase()) &&
        reviewers.length < maxAssignees
      ) {
        reviewers.push(c.login);
      }
    }

    await file(context, 'CODEOWNERS', reviewers, data, maxAssignees);

    if (reviewers.length > 0) {
      context.octokit.pulls.requestReviewers({
        owner,
        repo: issueRepo,
        pull_number: pull.number,
        reviewers,
      });
    } else {
      const comment = context.issue({ body: 'Failed to find a reviewer ✖' });
      context.octokit.issues.createComment(normalizeIssue(comment));
    }
  });
};
