const template = `
The following <TYPE> does not follow Poool's rules:

<PLACEHOLDER>

<details>

<DETAILS>

</details>

--------

Happy coding!
`;

module.exports = (id, type, errors, warnings) => {
  const message = `* id : ${id}\n`;
  let details = '';

  details += errors.map(e => `  - ✖ ${e.message}\n`).join('');
  details += warnings.map(w => `  - ⚠ ${w.message}\n`).join('');

  return template
    .replace('<TYPE>', type)
    .replace('<PLACEHOLDER>', message)
    .replace('<DETAILS>', details);
};
