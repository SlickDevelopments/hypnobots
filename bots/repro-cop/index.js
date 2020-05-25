const domains = ['jsbin', 'jsfiddle', 'plnkr', 'codepen'];
const body = `There is no link(s) to reproduce the bug(s).
It help us helping you by doing so.

You can go to thoses websites and recreate your issue:

- https://jsbin.com
- https://jsfiddle.net 

-------------

Happy coding !
`;
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.on(['issues.opened', 'issues.reopened'], async context => {
    const message = context.payload.issue.body;
    const regex = /(?:https?:\/\/)(?:www.)?(\w*).\w*/g;
    const links = message.matchAll(regex);
    let count = 0;
    let length = 0;

    for (const link of links) {
      if (!domains.includes(link[1])) {
        ++count;
      }
      ++length;
    }
    
    if (length !== 0 && count === length) {
      const issueComment = context.issue({ body: body });
      context.github.issues.createComment(issueComment);
    }
  });
};