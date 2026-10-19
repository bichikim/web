/** 붙여 넣은 숫자, 부호, 전각 쉼표를 정규화하고 나머지 텍스트는 유지한다. */
export const normalizePasteNumericInput = (value: string): string =>
  value
    .replace(/[０-９＋－]/gu, (character) => character.normalize('NFKC'))
    .replace(/^(?<leadingWhitespace>\s*)[‒–﹣]/u, '$<leadingWhitespace>-')
    .replaceAll('−', '-')
    .replaceAll('，', ',')
