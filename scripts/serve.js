const path = require('path');
const { argv } = require('yargs');

require('dotenv').config({ path: path.join(path.resolve(argv._[0]), '.env') });

process.env.PRIVATE_KEY_PATH = path
  .resolve(process.env.PRIVATE_KEY_PATH.replace('~', process.env.HOME));

require(path.resolve(argv._[0]));
