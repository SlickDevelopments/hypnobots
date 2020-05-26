const template = `
I've found one or more issues in this PR:

<PLACEHOLDER>

--------

Happy coding!
`;

module.exports = (report) => {
  let message = '';

  for (const error of report) {
    switch (error.type) {
      case 'branch':
        message += `\n\`${error.id}\` (branch)\n`;
        break;
      case 'commit':
        message += `\n\`${error.message}\` (${error.id})\n`;
        break;
      case 'title':
        message += `\n\`${error.message}\` (#${error.id})\n`;
        break;
      default:
        break;
    }

    message += '<details>\n\n';
    message += error.errors.map(e => `  - ❌ ${e.message}`).join('\n');
    message += error.warnings.map(w => `  - ⚠️ ${w.message}`).join('\n');
    message += '\n</details>\n';
  }
  return template.replace('<PLACEHOLDER>', message);
};
