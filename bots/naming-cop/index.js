const { checkPullName } = require('./naming-cop');

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  // Check PR's name
  app.on('pull_request.opened', checkPullName);
  app.on('pull_request.reopened', checkPullName);
  app.on('pull_request.edited', checkPullName);
};
