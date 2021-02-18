import {} from 'graphql'

/**
 * functional graphql creator
 * Experiment step
 * @WIP
 */

export type Args = Record<string, any>

export interface CreateObjectConfig {
  args?: any
}

export type GetArgs<Config extends CreateObjectConfig> = Config extends {args: infer R} ? R : undefined

export const createObject = <T extends CreateObjectConfig>(config: T): GetArgs<T> => {
  return config.args
}

const a = createObject({args: {foo: 'foo'}})
