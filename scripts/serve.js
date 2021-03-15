const path = require('path');

const { argv } = require('yargs');
const { run } = require('probot');

require('dotenv').config();

process.env.PRIVATE_KEY_PATH = path
  .resolve(process.env.PRIVATE_KEY_PATH.replace('~', process.env.HOME));

const app = require(path.resolve(argv._[0]));
run(app);
