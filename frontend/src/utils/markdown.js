export function processMarkdown(md) {
  let result = '';

  for (let i = 0; i < md.length; i++) {
    const ch = md[i];

    if (ch === '~') {
      const prev = md[i - 1] || '';
      const next = md[i + 1] || '';
      if (prev === '~' || next === '~') {
        result += ch;
      } else {
        result += '\\~';
      }
      continue;
    }

    result += ch;
  }

  return result;
}
