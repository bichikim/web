const REFERENCE_OPENINGS = [
  String.raw`(?:(?:위|아래|제공된|입력된|주어진|확인한|살펴본)\s*)?`,
  String.raw`(?:내용|자료|정보|항목|계산\s*결과|분석\s*결과)(?:을|를|에)?\s*`,
  String.raw`(?:(?:참고|종합|정리)(?:해|하여)?\s*(?:보면|하면)|따르면|바탕으로(?:\s*보면)?)`,
].join('')
const OPENING_PATTERN = new RegExp(
  String.raw`^\s*(?:(?:${REFERENCE_OPENINGS}|` +
    String.raw`(?:전체적인\s*)?흐름을\s*(?:살펴보면|보면))\s*[,，:]?\s*)+`,
  'u',
)

/** Removes reference-only openings when a consultation body remains; otherwise preserves the response. */
export function formatSajuAnswer(text: string): string {
  const body = text.replace(OPENING_PATTERN, '')
  return body.trim() === '' ? text : body
}
