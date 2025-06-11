module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/prisma/',
    '/.vercel/',
    '/tests/fixtures/'
  ],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 30000
}; 