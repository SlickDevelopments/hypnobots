const { lint, load } = require('@commitlint/core');
const config = require('./rules/config');
const format = require('./format');
const emojis = ['✨', '🐛', '♻️', '🏗', '📦', '📖'];

async function check (context) {
  // Rules
  const { rules } = await load(config);

  const checkTitle = async () => {
    const pull = context.payload.pull_request;
    const clean = pull.title.substring(3);
    const emoji = pull.title.substring(0, 2);
    const { valid, errors, warnings } = await lint(clean, rules);

    if (valid && warnings.length === 0 && emojis.includes(emoji)) {
      return;
    }
    const response = format(pull.id, 'title', errors, warnings);
    const comment = context.issue({ body: response });
    context.github.issues.createComment(comment);
  };

  const checkBranch = async () => {
    const branch = context.payload.pull_request.head.ref;
    const types = ['docs', 'feature', 'fix', 'refactor'];
    const errors = [];
    if (branch === 'master' || branch === 'develop') {
      return;
    }
    const regex = /^(\w*)\/(\w*)$/;
    const found = branch.match(regex);
    if (found !== null && types.includes(found[1])) {
      return;
    } else if (found !== null && !types.includes(found[1])) {
      errors.push({ message: 'type should be [docs, feature, fix, refactor]' });
    } else if (found === null) {
      errors.push({ message: 'branch name do not look like <type>/<name>' });
    }
    const response = format(branch, 'branch', errors, []);
    const comment = context.issue({ body: response });
    context.github.issues.createComment(comment);
  };

  const checkCommits = async () => {
    const pull = context.issue();
    const { data } = await context.github.pulls.listCommits(pull);
    
    for (const c of data) {
      const { valid, errors, warnings } = await lint(c.commit.message, rules);
      if (valid && warnings.length === 0) {
        continue;
      }
      const response = format(c.sha, 'commit', errors, warnings);
      const comment = context.issue({ body: response });
      context.github.issues.createComment(comment);
    }
  };

  await checkTitle();
  await checkBranch();
  await checkCommits();
}

module.exports = check;