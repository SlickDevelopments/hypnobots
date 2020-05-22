const file = require('./file');
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

    for (const c of data) {
      if (c.permissions.admin === true &&
          pull.owner.toLowerCase() !== c.login.toLowerCase()) {
        reviewers.push(c.login.toLowerCase());
      }
    }
    
    await file(context, pull, 'CODEOWNERS', reviewers, data);
    
    if (reviewers.length > 0) {
      const resquest = {
        owner: pull.owner,
        repo: pull.repo,
        pull_number: pull.number,
        reviewers: reviewers,
      };
      context.github.pulls.createReviewRequest(resquest);
    } else {
      const comment = context.issue({ body: 'I failed to find a reviewer :(' });
      context.github.issues.createComment(comment);
    }
  });
};
