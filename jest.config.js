/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
};