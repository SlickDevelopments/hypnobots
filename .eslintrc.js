module.exports = {
  extends: ['@poool/eslint-config/backend'],
  overrides: [{
    files: ['tests/**/*.js'],
    parser: 'babel-eslint',
    env: {
      jest: true,
    },
  }],
};