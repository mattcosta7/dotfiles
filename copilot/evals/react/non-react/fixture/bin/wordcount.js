#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { countLines, countWords } from '../src/count.js';

const file = process.argv[2];
if (!file) {
  console.error('usage: wordcount <file>');
  process.exit(2);
}
const text = readFileSync(file, 'utf8');
console.log(`${countLines(text)} lines, ${countWords(text)} words`);
