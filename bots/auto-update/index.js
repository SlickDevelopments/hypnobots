/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.on(['pull_request.opened', 'pull_request.reopened'], async context => {
    try {
      const { owner, repo, number } = context.issue();
      const args = { owner: owner, repo: repo, pull_number: number };
      
      await context.github.pulls.updateBranch(args);
    } catch (e) {
      const response = `⚠️ Cannot update branch : ${e.message}`;
      const comment = context.issue({ body: response });

      context.github.issues.createComment(comment);
    }
  });
};
