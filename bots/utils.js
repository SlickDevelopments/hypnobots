const omitBy = (obj = {}, cb) => Object
  .entries(obj)
  .filter(([k, v]) => !cb(v, k))
  .reduce((res, [k, v]) => ({ ...res, [k]: v }), {});

const omit = (obj = {}, keys = []) =>
  omitBy(obj || {}, (value, key) => keys.includes(key));

const getConfig = async (context, bot) => {
  const pull = context.issue();
  const args = { owner: pull.owner, repo: pull.repo, path: '.' };
  const accepted = ['.botsrc', '.botsrc.json'];

  const dir = await context.octokit.repos.getContent(args);
  const files = dir.data.filter(f => accepted.includes(f.name));

  let file;

  try {
    while (!file && files.length) {
      const { data } = await context.octokit.repos.getContent({
        ...args,
        path: files.shift()?.name,
      });

      file = Buffer.from(data.content, 'base64').toString('ascii');
    }

    return JSON.parse(file)[bot];
  } catch (e) {
    return null;
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
