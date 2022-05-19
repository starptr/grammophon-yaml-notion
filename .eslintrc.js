module.exports = {
  env: {
    es2017: true,
  },
  extends: [
    'airbnb-base',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-restricted-syntax': 'off',
    'no-await-in-loop': 'off',
  },
};
