module.exports = async (context, pull, path, reviewers, collabs) => {
  const regex = /@(\w*)/g;
  const args = {
    owner: pull.owner,
    repo: pull.repo,
    path: path,
  };
  const file = await context.github.repos.getContents(args);

  if (file.status === 404) {
    return;
  }

  const buff = Buffer.from(file.data.content, 'base64');
  const content = buff.toString('ascii');
  const users = content.matchAll(regex);

  for (const u of users) {
    const login = u[1].toLowerCase();
    if (!reviewers.includes(login) && pull.owner.toLowerCase() !== login &&
        collabs.some(collab => collab.login.toLowerCase() === login)) {
      reviewers.push(login);
    }
  }
};