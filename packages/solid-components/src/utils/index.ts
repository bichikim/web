export * from './event-handler'

export const getId = (...args: string[]) => {
  return `coong:${args.join('-')}`
}
