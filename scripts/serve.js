const { argv } = require('yargs');
const colors = require('colors/safe');
const { Probot } = require('probot');
const dotenv = require('dotenv');
const fs = require('fs');

if (!argv._.length) {
  console.error(colors.red(
    '[poool.serve] No service specified, nothing to run.'
  ));
  process.exit(1);
}

process.on('SIGINT', process.exit);

for(const arg of argv._) {
  const app = require(`../bots/${arg}/index.js`);
  const config = dotenv.parse(fs.readFileSync(process.cwd() + `/bots/${arg}/.env`));
  for (const property in config) {
    process.env[property] = config[property];
  }
  Probot.run(app);
}