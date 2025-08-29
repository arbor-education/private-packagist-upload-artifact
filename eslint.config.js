const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        ignores: ['node_modules/**', 'dist/**', 'coverage/**', '*.log'],
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.jest,
            }
        },
        rules: {
            // Code style rules
            'indent': ['error', 4],
            'quotes': ['error', 'single', { 'avoidEscape': true }],
            'semi': ['error', 'always'],
            'comma-trailing': 'off',
            'no-trailing-spaces': 'error',
            'eol-last': 'error',

            // Best practices
            'no-console': 'off', // GitHub Actions need console output
            'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
            'no-var': 'error',
            'prefer-const': 'error',
            'prefer-arrow-callback': 'error',
            'arrow-spacing': 'error',

            // Error prevention
            'no-undef': 'error',
            'no-unused-expressions': 'error',
            'no-unreachable': 'error',
            'no-duplicate-imports': 'error',

            // GitHub Actions specific
            'no-process-exit': 'off', // Actions may need process.exit
        }
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.jest,
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                beforeEach: 'readonly',
                afterAll: 'readonly',
                afterEach: 'readonly',
            }
        },
        rules: {
            'no-unused-expressions': 'off', // Jest assertions can look like unused expressions
        }
    }
];
