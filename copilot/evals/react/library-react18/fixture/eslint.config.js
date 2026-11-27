import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  { ...reactHooks.configs.flat.recommended, files: ['src/**/*.{js,jsx}'] },
];
