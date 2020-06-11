const matchAll = require('../../utils/matchAll');

module.exports = async (context, path, reviewers, collabs, maxAssignees) => {
  const pull = context.issue();
  const regex = /@(\w*)/g;
  const args = {
    owner: pull.owner,
    repo: pull.repo,
    path: path,
  };
  let file = null;

  try {
    file = await context.github.repos.getContents(args);
  } catch (e) {
    file = null;
  }

  if (file !== null) {
    const buff = Buffer.from(file.data.content, 'base64');
    const content = buff.toString('ascii');
    const users = matchAll(content, regex);

    for (const u of users) {
      const login = u[1].toLowerCase();
      if (
        !reviewers.includes(login) &&
        pull.owner.toLowerCase() !== login &&
        collabs.some(collab => collab.login.toLowerCase() === login) &&
        reviewers.length < maxAssignees
      ) {
        reviewers.push(login);
      }
    }
  }
};
