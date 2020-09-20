import {ResponsiveValue} from 'styled-system'

/**
 * a[] -->\   /--> A[]
 * b   ----------> B[]
 * c   -->/   \--> C[]
 *            \--> D[]
 * @param props
 * @param execute
 */
export const parallelProps = (
  props: Record<string, any[] | any>,
  execute?: (props: any) => Record<string, any>,
) => {
  let max = 1
  let i = 0
  const resultProps = {}

  do {
    const {maxIndex, result} = gatherObjectItems(props, i)
    max = maxIndex
    const executedResult = execute ? execute(result) : result
    multiObjectKeyPush(resultProps, executedResult)
    i += 1
  } while (i <= max)

  return resultProps
}

interface TravelResult {
  maxIndex: number
  result: Record<string, any>
}

export const gatherObjectItems = (
  props: Record<string, any[] | any>,
  index: number,
): TravelResult => {
  const keys = Object.keys(props)
  let maxIndex = 0
  const result = {}

  for (const key of keys) {
    const value = props[key]
    const isArrayValue = Array.isArray(value)

    if (isArrayValue) {
      const maxValueIndex = value.length - 1
      if (maxIndex < maxValueIndex) {
        maxIndex = maxValueIndex
      }
      result[key] = value[index] ?? value[maxValueIndex]
      continue
    }

    result[key] = value
  }

  return {
    maxIndex,
    result,
  }
}

/**
 * a[] | a --> A[] | A
 * @param value
 * @param mapper
 */
export const parallelProp = <T, R>(value: ResponsiveValue<T>, mapper: ((value: T | null) => R)): ResponsiveValue<R> => {
  if (Array.isArray(value)) {
    return value.map(mapper)
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).reduce((result, key) => {
      const _value = value[key]
      result[key] = mapper(_value)
      return result
    }, {})
  }
  return mapper(value)
}

export const multiObjectKeyPush = (target: Record<string, any>, source: Record<string, any>) => {
  const keys = Object.keys(source)

  for (const key of keys) {
    if (!Array.isArray(target[key])) {
      target[key] = []
    }
    target[key].push(source[key])
  }
}
