const { run } = require('probot');

const app = require(`../bots/${process.env.BOT_NAME}`);
run(app);
