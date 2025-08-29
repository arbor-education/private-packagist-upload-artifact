module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/test/**/*.test.js'
    ],
    collectCoverage: true,
    collectCoverageFrom: [
        'index.js',
        '!**/node_modules/**'
    ],
    coverageReporters: [
        'text',
        'lcov',
        'html'
    ],
    coverageDirectory: 'coverage',
    verbose: true
};
