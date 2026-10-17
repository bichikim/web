/** 이름 조각을 하이픈으로 연결하고 coong: 접두사를 붙인 식별자를 반환한다. */
export const getId = (...args: string[]) => {
  return `coong:${args.join('-')}`
}
