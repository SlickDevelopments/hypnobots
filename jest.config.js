module.exports = {
  clearMocks: true,
  testPathIgnorePatterns: [
    '<rootDir>/node_modules',
  ],
  coverageDirectory: './coverage/',
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
};
