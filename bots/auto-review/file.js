module.exports = async (context, pull, path) => {
  const reviewers = [];
  const regex = /(@\w*)/;
  const args = {
    owner: pull.owner,
    repo: pull.repo,
    path: path,
  };
  const file = await context.github.repos.getContents(args);
  if (file.status === 404) {
    return null;
  }
  const buff = Buffer.from(file.data.content, 'base64');
  const content = buff.toString('ascii');
  const users = content.match(regex);
  context.log(users);
};