const file = require('./file');
const getConfig = require('../../utils/getConfig');
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.on(['pull_request.opened', 'pull_request.reopened'], async context => {
    const pull = context.issue();
    const repo = context.repo();
    const { data } = await context.github.repos.listCollaborators(repo);
    const reviewers = [];
    const config = await getConfig(context, 'autoReview');
    let maxAssignees = 1;

    if (config && config.maxAssignees && config.maxAssignees > 0) {
      maxAssignees = config.maxAssignees;
    }

    for (const c of data) {
      if (
        c.permissions.admin === true &&
        pull.owner.toLowerCase() !== c.login.toLowerCase() &&
        !reviewers.includes(c.login.toLowerCase()) &&
        reviewers.length < maxAssignees
      ) {
        reviewers.push(c.login.toLowerCase());
      }
    }
    
    await file(context, 'CODEOWNERS', reviewers, data, maxAssignees);
    
    if (reviewers.length > 0) {
      const resquest = {
        owner: pull.owner,
        repo: pull.repo,
        pull_number: pull.number,
        reviewers: reviewers,
      };
      context.github.pulls.createReviewRequest(resquest);
    } else {
      const comment = context.issue({ body: 'Failed to find a reviewer ✖' });
      context.github.issues.createComment(comment);
    }
  });
};
