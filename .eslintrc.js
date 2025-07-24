module.exports = {
  root: true, // Add this line to prevent ESLint from looking for config in parent directories
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    // Removing the security plugin from extends as it's causing issues
    // 'plugin:security/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
    'security',
  ],
  rules: {
    // React rules
    'react/prop-types': 'warn',
    'react/no-danger': 'error',
    'react/no-unsafe': 'error',
    'react/jsx-no-script-url': 'error',
    'react/jsx-no-target-blank': 'error',
    
    // Security rules - manually defined instead of using the recommended preset
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-require': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-unsafe-regex': 'error',
    
    // General rules
    'no-alert': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-useless-escape': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};