export function countWords(text) {
  const words = text.trim().split(/\s+/);
  return words[0] === '' ? 0 : words.length;
}

export function countLines(text) {
  if (text === '') return 0;
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}
