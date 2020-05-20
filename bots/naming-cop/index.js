const { Probot } = require('probot');
const check = require('./naming-cop');

Probot.run(app => {
  app.on('pull_request.opened', check);
  app.on('pull_request.reopened', check);
  app.on('pull_request.edited', check);
  app.on('pull_request.synchronize', check);
});
