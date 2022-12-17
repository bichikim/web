import * as modules from '../../../packages/utils'

module.exports = Object.fromEntries(
  Object.entries(modules).map(([name, module]: any) => [
    name,
    typeof module === 'function' ? jest.fn(module) : module,
  ]),
)
