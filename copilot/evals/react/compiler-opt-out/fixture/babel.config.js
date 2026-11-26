import { compilerOptOut } from './compiler.config.js';

export default {
  plugins: [
    [
      'babel-plugin-react-compiler',
      { sources: (filename) => !compilerOptOut.some((file) => filename.endsWith(file)) },
    ],
  ],
};
