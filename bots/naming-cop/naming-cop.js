const { lint, load } = require('@commitlint/core');
const prconfig = require('./rules/pr-config');
const format = require('./format');
const emojis = ['✨', '🐛', '♻️', '🏗', '📦', '📖'];

async function checkPullName (context) {
  const pull = context.payload.pull_request;
  const { rules } = await load(prconfig);
  const clean = pull.title.substring(3);
  const emoji = pull.title.substring(0, 2);
  const { valid, errors, warnings } = await lint(clean, rules);

  if (valid && warnings.length === 0 && emojis.includes(emoji)) {
    return null;
  }
  const response = format(pull.id, 'title', errors, warnings);
  const commitComment = context.issue({ body: response });
  return context.github.issues.createComment(commitComment);
}

module.exports = { checkPullName };