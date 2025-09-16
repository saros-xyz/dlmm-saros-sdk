import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  prettier, // Disables formatting rules that conflict with Prettier

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Code quality rules only (no formatting)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      //   'no-unused-vars': 'off',
      //   'no-async-promise-executor': 'off',
      //   'no-useless-catch': 'off',
    },
  },

  {
    ignores: ['dist/**', 'node_modules/**', '**/*.json', '.claude/**'],
  },
];
