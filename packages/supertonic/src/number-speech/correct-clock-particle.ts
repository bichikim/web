const CONSONANT_CLOCK_PARTICLES: ReadonlyMap<string, string> = new Map([
  ['가', '이'],
  ['나', '이나'],
  ['는', '은'],
  ['라고', '이라고'],
  ['로', '으로'],
  ['를', '을'],
  ['였어요', '이었어요'],
  ['예요', '이에요'],
  ['와', '과'],
])

/** 닫힘 기호를 보존하며 삽입된 분에 맞는 조사를 적용한다. */
export const correctClockParticle = (suffix: string): string =>
  suffix.replace(/[^\s\p{Pe}\p{Pf}"']+/u, (value) => CONSONANT_CLOCK_PARTICLES.get(value) ?? value)
