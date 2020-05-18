const { lint, load } = require('@commitlint/core');
const prconfig = require('./rules/pr-config');
const format = require('./format');
const emojis = ['✨', '🐛', '♻️', '🏗', '📦', '📖'];

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => { 
  // Check PR's title 
  app.on(['pull_request.opened', 'pull_request.reopened', 'pull_request.edited'], async context => {
    const pull = context.payload.pull_request;
    const { rules } = await load(prconfig);
    const clean = pull.title.substring(3);
    const emoji = pull.title.substring(0, 2);
    const { valid, errors, warnings } = await lint(clean, rules);

    if (valid && warnings.length === 0 && emojis.includes(emoji)) {
      return;
    }
    const commitComment = context.issue({ body: format(pull.id, "title", errors, warnings)})
    return context.github.issues.createComment(commitComment);
  })
}
