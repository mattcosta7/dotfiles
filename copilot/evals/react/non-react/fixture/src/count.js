export function countWords(text) {
  return text.split(' ').length;
}

export function countLines(text) {
  if (text === '') return 0;
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}
