import {PureObject} from '@winter-love/utils'
import {createStyleSystemFunction, StyleFunctionRunner, StyleSystemFunction} from './system'

const priorityConcat = <Theme extends PureObject>(
  systemFunctionsA: StyleFunctionRunner<Theme>[],
  systemFunctionsB: StyleFunctionRunner<Theme>[],
) => {
  return [...systemFunctionsA, ...systemFunctionsB].sort((systemFunctionsA, systemFunctionsB) => {
    return systemFunctionsA.priority - systemFunctionsB.priority
  })
}

export const compose = <Theme extends PureObject>(...args: StyleSystemFunction<Theme>[]) => {

  const allowCssProp: boolean = args[0]?.allowCssProp

  const systemFunctions = args.reduce((result, styleSystem) => {
    const {systemFunctions} = styleSystem

    Object.keys(systemFunctions).forEach((key) => {
      const value = systemFunctions[key]
      if (!value) {
        return
      }
      const newSystemFunctions = result[key]
      if (!newSystemFunctions) {
        result[key] = [...value]
        return
      }
      result[key] = priorityConcat(newSystemFunctions, value)
    })

    return result
  }, {})
  return createStyleSystemFunction(systemFunctions, allowCssProp)
}
