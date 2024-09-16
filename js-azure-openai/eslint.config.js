const airbnb = require('eslint-config-airbnb-base');
const prettier = require('eslint-plugin-prettier');

module.exports = {
    plugins: {
        airbnb: airbnb,
        prettier: prettier
    },

    ignores: ['**/out', '**/node_modules', '**/coverage'],

    languageOptions: {
        ecmaVersion: 2022
    },

    rules: {
        'no-console': 'off',
        semi: 1,
        quotes: ['error', 'single'],

        'no-trailing-spaces': [2, {
            skipBlankLines: true,
        }],

        'no-use-before-define': ['error', {
            functions: false,
            variables: true,
        }],

        'prefer-destructuring': ['error', {
            object: true,
            array: false,
        }],

        'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
        'no-await-in-loop': 'off',
    },
};