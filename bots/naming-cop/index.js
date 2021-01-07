const check = require('./naming-cop');
const { normalizeIssue } = require('../utils');

module.exports = app => {
  app.on('pull_request.opened', check);
  app.on('pull_request.reopened', check);
  app.on('pull_request.edited', check);
  app.on('pull_request.synchronize', check);

  app.on('issue_comment.created', async context => {
    const payload = context.payload;
    let comment = null;

    if (payload.comment.body === '@naming-cop stfu') {
      comment = context.issue({ body: 'Okay I will now shut up.' });
    } else if (payload.comment.body === '@naming-cop activate') {
      comment = context.issue({ body: 'Yay I can speak.' });
    }

    if (comment !== null) {
      await context.octokit.issues.createComment(normalizeIssue(comment));
    }
  });
};
