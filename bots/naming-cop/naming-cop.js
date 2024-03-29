const { lint, load } = require('@commitlint/core');
const { strip, replace, get } = require('node-emoji');

const commitlintConfig = require('./commitlint.config');
const format = require('./format');
const { getConfig, normalizeIssue, normalizePR } = require('../utils');
const { createCheck, completeCheck } = require('./utils');

const ignored = ['renovate', 'dependabot'];
const emojis = {
  sparkles: ['feat', 'release'],
  bug: 'fix',
  recycle: 'refactor',
  building_construction: ['test', 'tests'],
  package: 'chore',
  open_book: 'docs',
};

const shouldBeIgnored = (context, name = '') =>
  (context.config?.ignoreList || ignored).some(b => new RegExp(b).test(name));

const isSubjectValid = name => {
  const subject = /^(?:\w+)\((.+)\):/gm.exec(name)?.[1];

  return !subject || /^[a-zA-Z0-9-]*$/.test(subject);
};

const isBranchValid = name =>
  /^[a-zA-Z0-9-]*$/.test(name);

const checkTitle = async (context, rules, parser, report) => {
  const pull = context.payload.pull_request;
  const clean = strip(pull.title);
  const emoji = replace(Array.from(pull.title)[0], e => `${e.key}`);
  const linter = await lint(clean, rules, parser);
  const errors = [];
  const warnings = [];

  if (!Object.keys(emojis).includes(emoji)) {
    errors.push({
      message: 'emoji should be [✨, 🐛, ♻️, 🏗, 📦, 📖]',
    });
  }

  const types = [].concat(emojis[emoji] || []);

  if (types.length && !types.some(e => new RegExp(e).test(clean))) {
    errors.push({
      message: get(emoji) +
        ' emoji should only be used with: ' + types.join(', '),
    });
  }

  if (!linter.valid || linter.warnings.length > 0) {
    errors.push(...linter.errors);
    warnings.push(...linter.warnings);
  }

  if (!isSubjectValid(clean)) {
    errors.push({
      message: 'PR subject should not contain special chars other than `-`',
    });
  }

  if (errors.length > 0 || warnings.length > 0) {
    report.push({
      message: pull.title,
      type: 'title',
      id: pull.number,
      errors,
      warnings,
    });
  }
};

const checkBranch = async (context, report, branch) => {
  const types = [
    'docs', 'feature', 'test', 'tests', 'fix', 'refactor', 'chore',
  ];
  const errors = [];
  const regex = /^(\w*)\/(\w*-?)*$/;
  const [_, type = ''] = branch.match(regex) || [];

  if (!type) {
    errors.push({
      message: 'branch name was not recognized as [type]/[name]',
    });
  }

  if (!types.includes(type)) {
    errors.push({
      message: 'type should be [docs, feature, test, tests, fix, refactor, ' +
        'chore]',
    });
  }

  if (!isBranchValid(branch.split('/').slice(1).join('/'))) {
    errors.push({
      message: 'branch name should not contain special chars other than `-`',
    });
  }

  if (errors.length > 0) {
    report.push({
      message: '',
      type: 'branch',
      id: branch,
      errors,
      warnings: [],
    });
  }
};

const checkCommits = async (context, rules, parser, report) => {
  const pull = context.pullRequest();
  const prTitle = strip(context.payload.pull_request.title);
  const { data } = await context.octokit.pulls.listCommits(normalizePR(pull));

  for (const c of data) {
    const errors = [];
    const warnings = [];
    const message = c.commit.message;
    const linter = await lint(message, rules, parser);

    if (!linter.valid || linter.warnings.length > 0) {
      errors.push(...linter.errors);
      warnings.push(...linter.warnings);
    }

    if (!isSubjectValid(message)) {
      errors.push({
        message: 'commit subject should not contain special chars other ' +
          'than `-`',
      });
    }

    if (errors.length > 0 || warnings.length > 0) {
      report.push({
        message,
        type: 'commit',
        id: c.sha,
        errors,
        warnings,
      });
    }
  }

  if (
    /^fix/.test(prTitle) &&
    data.some(c => /^feat/.test(c.commit.message))
  ) {
    report.push({
      message: context.payload.pull_request.title,
      type: 'title',
      id: context.payload.pull_request.number,
      errors: [{
        message: '`feat` commits should not be present inside a `fix` PR',
      }],
    });
  }
};

module.exports = async context => {
  const { parserPreset, rules } = await load(commitlintConfig);
  const report = [];
  const branch = context.payload.pull_request.head.ref;

  const config = await getConfig(context, 'namingCop');
  context.config = config;

  if (
    shouldBeIgnored(context, branch) ||
    shouldBeIgnored(context, context.payload.pull_request.user.login)
  ) {
    return;
  }

  if (config && config.validTypes) {
    rules['type-enum'][2] = config.validTypes;
  }

  const checkRun = await createCheck(context);

  await checkTitle(context, rules, parserPreset, report);
  await checkBranch(context, report, branch);
  await checkCommits(context, rules, parserPreset, report);

  if (report.length > 0) {
    const issue = context.issue();
    const { data } = await context.octokit.issues
      .listComments(normalizeIssue(issue));

    const latestComment = data.reverse()
      .find(c => /^@naming-cop (stfu|activate)$/.test(c.body));
    const canTalk = !latestComment || /activate/.test(latestComment.body);

    if (canTalk) {
      const comment = context.issue({ body: format(report) });
      await context.octokit.issues.createComment(normalizeIssue(comment));
    }
  }

  await completeCheck(context, checkRun, report);
};
