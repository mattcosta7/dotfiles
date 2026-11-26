// The oracle's own lint config, so an agent can't pass by weakening the fixture's config.
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    files: ['src/**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  { ...reactHooks.configs.flat.recommended, files: ['src/**/*.{js,jsx,mjs}'] },
];
