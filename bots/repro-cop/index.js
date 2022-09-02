const { matchAll, normalizeIssue } = require('../utils');

const domains = ['jsbin', 'jsfiddle', 'plnkr', 'codepen'];
const body = `Hi!

Thank you for reporting this issue. It appears you did not attach any repro link to it.
The fastest way for us to investigate and resolve this issue is to create a repro of the actual bug.

You may use any of the common JS playgrounds:

- [JSBin](https://jsbin.com)
- [JSFiddle](https://jsfiddle.net)
- [Plunker](https://plnkr.co)
- [CodePen](https://codepen.io/)

-------------

Happy coding!
`;

module.exports = app => {
  app.on(['issues.opened', 'issues.reopened'], async context => {
    const message = context.payload.issue.body;
    const regex = /(?:https?:\/\/)(?:www.)?(\w*).\w*/g;
    const links = matchAll(message, regex);

    const found = Array.from(links)
      .map(matches => matches[1])
      .filter(link => domains.includes(link));

    if (!found.length) {
      const issueComment = context.issue({ body });
      context.octokit.issues.createComment(normalizeIssue(issueComment));
    }
  });
};
