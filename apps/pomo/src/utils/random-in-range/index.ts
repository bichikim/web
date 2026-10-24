/** 연속 구간에서 값을 추출하며, 호출자가 난수 생성기를 지정할 수 있다. */
export const randomInRange = (
  minimum: number,
  maximum: number,
  random: () => number = Math.random,
): number => minimum + random() * (maximum - minimum)
