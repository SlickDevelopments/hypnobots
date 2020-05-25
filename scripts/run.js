const { Probot } = require('probot');

const app = require(`../bots/${process.env.BOT_NAME}`);
Probot.run(app);
