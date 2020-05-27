module.exports = {
  extends: ['@poool/eslint-config-node'],
  overrides: [{
    files: ['tests/**/*.js'],
    parser: 'babel-eslint',
    env: {
      jest: true,
    },
  }],
};
