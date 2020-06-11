module.exports = async (context, bot) => {
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

    return (config[bot] ? config[bot] : null);
  }
};
