module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    sourceType: 'module',
  },
  overrides: [
    {
      files: [
        'apps/api/src/**/*.ts',
        'apps/worker/src/**/*.ts',
        'services/ai-gateway/src/**/*.ts',
      ],
      rules: {
        'no-restricted-globals': [
          'error',
          {
            name: 'fetch',
            message: 'Use fetchWithRetry from @family-hub/observability instead of global fetch.',
          },
        ],
      },
    },
  ],
};
