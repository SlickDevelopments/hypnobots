module.exports = {
  extends: ['@poool/eslint-config-node'],
  overrides: [{
    files: ['**/*.test.js', 'tests/**/*.js'],
    env: {
      jest: true,
    },
  }],
  rules: {
    'max-len': [2, { ignoreTemplateLiterals: true }],
  },
};
