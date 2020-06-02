const { lint, load } = require('@commitlint/core');
const config = require('./commitlint.config');
const format = require('./format');
const getConfig = require('../../utils/getConfig');

const emojis = ['✨', '🐛', '♻️', '🏗', '📦', '📖'];

const checkTitle = async (context, rules, report) => {
  const pull = context.payload.pull_request;
  const clean = Array.from(pull.title).slice(2).join('');
  const emoji = Array.from(pull.title)[0];
  const { valid, errors, warnings } = await lint(clean, rules);

  if (
    (pull.user && pull.user.login === 'renovate[bot]') ||
    (valid && warnings.length === 0 && emojis.includes(emoji))
  ) {
    return;
  }

  report.push({
    message: pull.title,
    type: 'title',
    id: pull.number,
    errors,
    warnings,
  });
};

const checkBranch = async (context, report) => {
  const branch = context.payload.pull_request.head.ref;
  const types = ['docs', 'feature', 'fix', 'refactor'];
  const errors = [];

  if (/^master|develop|renovate/.test(branch)) {
    return;
  }

  const regex = /^(\w*)\/(\w*)$/;
  const [_, type = ''] = branch.match(regex) || [];

  if (types.includes(type)) {
    return;
  }

  errors.push({
    message: !type
      ? 'branch name was not recognized as <type>/<name>'
      : 'type should be [docs, feature, fix, refactor]',
  });

  report.push({
    message: '',
    type: 'branch',
    id: branch,
    errors,
    warnings: [],
  });
};

const checkCommits = async (context, rules, report) => {
  const pull = context.issue();
  const { data } = await context.github.pulls.listCommits(pull);

  for (const c of data) {
    const { valid, errors, warnings } = await lint(c.commit.message, rules);

    if (valid && warnings.length === 0) {
      continue;
    }

    report.push({
      message: c.commit.message,
      type: 'commit',
      id: c.sha,
      errors,
      warnings,
    });
  }
};

const checkFiles = async (context, rules) => {
  const config = await getConfig(context, 'namingCop');

  if (config && config.validTypes) {
    rules['type-enum'][2] = config.validTypes;
  }
};

module.exports = async context => {
  const { rules } = await load(config);
  const report = [];

  await checkFiles(context, rules);
  await checkTitle(context, rules, report);
  await checkBranch(context, report);
  await checkCommits(context, rules, report);

  if (report.length > 0) {
    let response = format(report);
    const { data } = await context.github.issues.listComments(context.issue());
    let command = false;
    let found = false;

    for (const comment of data.reverse()) {

      if (
        command === false &&
        comment.body === '@naming-cop stfu'
      ) {
        response = null;
        command = true;
      } else if (
        command === false &&
        found === false &&
        comment.body === '@naming-cop activate'
      ) {
        command = true;
      }

      if (found === false && comment.user.login === 'naming-cop[bot]') {
        if (response === comment.body) {
          response = null;
        }
        found = true;
      }

      if (found === true && command === true) {
        break;
      }
    }

    if (response !== null) {
      const comment = context.issue({ body: response });
      await context.github.issues.createComment(comment);
    }
  }
};
