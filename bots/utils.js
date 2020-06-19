const omitBy = (obj = {}, cb) => Object
  .entries(obj)
  .filter(([k, v]) => !cb(v, k))
  .reduce((res, [k, v]) => ({ ...res, [k]: v }), {});

const omit = (obj = {}, keys = []) =>
  omitBy(obj || {}, (value, key) => keys.includes(key));

const getConfig = async (context, bot) => {
  const pull = context.issue();
  const args = { owner: pull.owner, repo: pull.repo, path: '.' };
  const files = ['.botsrc', '.botsrc.json'];
  let dir = null;
  let file = null;

  try {
    dir = await context.github.repos.getContents(args);
  } catch (e) {
    dir = null;
  }

  if (dir === null) {
    return null;
  }

  for (const f of dir.data) {
    if (files.includes(f.name)) {
      args.path = f.path;
    }
  }

  if (args.path !== '.') {
    try {
      file = await context.github.repos.getContents(args);
    } catch (e) {
      file = null;
    }
  }

  if (file !== null) {
    const buff = Buffer.from(file.data.content, 'base64');
    const content = buff.toString('ascii');
    let config = null;

    try {
      config = JSON.parse(content);
    } catch (e) {
      config = null;
    }

    return config ? config[bot] : null;
  }
};

const ensureFlag = (flags, flag) =>
  flags.includes(flag) ? flags : flags + flag;

const matchAll = function * matchAll (str, regex) {
  const localCopy = new RegExp(regex, ensureFlag(regex.flags, 'g'));
  let match = localCopy.exec(str);

  while (match !== null) {
    yield match;
    match = localCopy.exec(str);
  }
};

const normalizeIssue = issue => ({
  ...omit(issue, ['number']),
  issue_number: issue.issue_number || issue.number,
});

const normalizePR = pr => ({
  ...omit(pr, ['number']),
  pull_number: pr.pull_number || pr.number,
});

module.exports = {
  getConfig,
  matchAll,
  normalizeIssue,
  normalizePR,
  omitBy,
  omit,
};
