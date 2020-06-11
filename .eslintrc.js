module.exports = {
  extends: ['@poool/eslint-config-node'],
  overrides: [{
    files: ['tests/**/*.js'],
    parser: 'babel-eslint',
    env: {
      jest: true,
    },
  }],
  rules: {
    'max-len': [2, { ignoreTemplateLiterals: true }],
  },
};
