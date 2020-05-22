const template = `
One or more things does not follow Poool's rules:

<PLACEHOLDER>

--------

Happy coding!
`;

module.exports = (report) => {
  let message = '';

  for (const error of report) {
    switch (error.type) {
      case 'branch':
        message += `\n\`${error.id}\`\n`;
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
    message += error.errors.map(e => `  - ✖ ${e.message}\n`).join('');
    message += error.warnings.map(w => `  - ⚠ ${w.message}\n`).join('');
    message += '\n</details>\n';
  }
  return template.replace('<PLACEHOLDER>', message);
};
