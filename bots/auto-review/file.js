module.exports = async (context, pull, path, reviewers) => {
  const regex = /@(\w*)/;
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
  const users = content.match(regex);

  for (const u of users) {
    if (u[0] !== '@' && !reviewers.includes(u) && pull.owner !== u) {
      reviewers.push(u);
    }
  }
};