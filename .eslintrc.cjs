module.exports = {
  root: true,
  env: {},
  globals: {},
  extends: ['ts-prefixer', 'next/core-web-vitals'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json'],
  },
  plugins: [],
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
  },
  settings: {},
  overrides: [],
}
