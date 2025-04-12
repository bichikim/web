export const getId = (...args: string[]) => {
  return `coong:${args.join('-')}`
}
