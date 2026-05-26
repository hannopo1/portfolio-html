/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  testEnvironmentOptions: {
    url: 'http://localhost/',
    resources: 'usable',
  },
};