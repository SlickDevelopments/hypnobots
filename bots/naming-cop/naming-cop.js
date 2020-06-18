const { lint, load } = require('@commitlint/core');
const { strip } = require('node-emoji');

const config = require('./commitlint.config');
const format = require('./format');
const { getConfig, normalizeIssue, normalizePR } = require('../utils');

const emojis = ['✨', '🐛', '♻️', '🏗', '📦', '📖'];
let ignoreList = ['renovate[bot]', 'dependabot[bot]'];

const checkTitle = async (context, rules, parser, report) => {
  const pull = context.payload.pull_request;
  const clean = strip(pull.title);
  const emoji = Array.from(pull.title)[0];
  const { valid, errors, warnings } = await lint(clean, rules, parser);

  if (
    (pull.user && ignoreList.includes(pull.user.login)) ||
    (valid && warnings.length === 0 && emojis.includes(emoji))
  ) {
    return;
  } else if (!emojis.includes(emoji)) {
    errors.push({
      message: 'emoji should be [✨, 🐛, ♻️, 🏗, 📦, 📖]',
    });
  }

  report.push({
    message: pull.title,
    type: 'title',
    id: pull.number,
    errors,
    warnings,
  });
};

const checkBranch = async (context, report, branch) => {
  const types = ['docs', 'feature', 'fix', 'refactor'];
  const errors = [];

  if (/^master|develop|renovate/.test(branch)) {
    return;
  }

  const regex = /^(\w*)\/(\w*-?)*$/;
  const [_, type = ''] = branch.match(regex) || [];

  if (types.includes(type)) {
    return;
  }

  errors.push({
    message: !type
      ? 'branch name was not recognized as type/name'
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

const checkCommits = async (context, rules, parser, report) => {
  const pull = context.issue();
  const { data } = await context.github.pulls.listCommits(normalizePR(pull));

  for (const c of data) {
    const message = c.commit.message;
    const { valid, errors, warnings } = await lint(message, rules, parser);

    if (valid && warnings.length === 0) {
      continue;
    }

    report.push({
      message: message,
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
  if (config && config.ignoreList) {
    ignoreList = config.ignoreList;
  }
};

module.exports = async context => {
  const { parserPreset, rules } = await load(config);
  const report = [];
  const branch = context.payload.pull_request.head.ref;
  const ignoreListRef = ignoreList;

  if (/^renovate/.test(branch)) {
    return;
  }

  await checkFiles(context, rules);
  await checkTitle(context, rules, parserPreset, report);
  await checkBranch(context, report, branch);
  await checkCommits(context, rules, parserPreset, report);

  if (ignoreList !== ignoreListRef) {
    ignoreList = ignoreListRef;
  }
  if (report.length > 0) {
    let response = format(report);
    const issue = context.issue();
    const { data } = await context.github.issues
      .listComments(normalizeIssue(issue));
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
      await context.github.issues.createComment(normalizeIssue(comment));
    }
  }
};
