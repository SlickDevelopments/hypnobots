const path = require('path');

module.exports = {
  clearMocks: true,
  testEnvironment: 'node',
  coverageDirectory: './coverage/',
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
  moduleNameMapper: {
    '^~fixtures(.+)$': path.resolve('./tests/fixtures') + '$1',
  },
  globals: {
    __TEST__: JSON.stringify(true),
  },
};
