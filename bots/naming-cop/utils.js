const createCheck = context =>
  context.octokit.checks.create({
    owner: context.repo().owner,
    repo: context.repo().repo,
    name: 'Naming Cop',
    status: 'queued',
    started_at: new Date(),
    head_sha: context.payload.pull_request.head.sha,
    output: {
      title: 'Queuing Naming Cop Test...',
      summary: 'Naming Cop verifications will begin shortly',
    },
  });

const completeCheck = (context, check, reports) =>
  context.octokit.checks.update({
    owner: context.repo().owner,
    repo: context.repo().repo,
    check_run_id: check.data.id,
    status: 'completed',
    head_sha: context.payload.pull_request.head.sha,
    conclusion: reports.length > 0 ? 'failure' : 'success',
    completed_at: new Date(),
    output: {
      title: 'Naming Cop Test Results',
      summary: reports.length > 0
        ? 'Naming Cop found some issues, please check its latest comment to ' +
          'review them'
        : 'No issues found',
    },
  });

module.exports = {
  createCheck,
  completeCheck,
};
