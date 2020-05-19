const check = require('./naming-cop');

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.on('pull_request.opened', check);
  app.on('pull_request.reopened', check);
  app.on('pull_request.edited', check);
  app.on('pull_request.synchronize', check);
};
