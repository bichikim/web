import {UnwrapNestedRefs} from './types'

export const createUuid = (prefix: string = '') => {
  let count = 0
  return () => {
    count += 1
    return prefix + count
  }
}

export const createGetAtomPrams = (
  getId: () => string,
  isRecipeOption: (value: any) => boolean = (value) => typeof value === 'function',
) => (unknown?: any, mayRecipe?: any, name?: string) => {
  let recipe
  let state
  let _name

  if (isRecipeOption(mayRecipe)) {
    state = unknown
    recipe = mayRecipe
    _name = name
  } else {
    recipe = unknown
    _name = mayRecipe
  }

  const id = getId()

  return {
    id,
    name: _name ?? id,
    recipe,
    state,
  }
}

const MAX_LENGTH = 50

export const getRawFunctionString = (value: any, maxLength = MAX_LENGTH): string => {
  if (typeof value === 'function') {
    const stringValue = value.toString()
    const deco = stringValue.length > maxLength ? '...' : ''
    return stringValue.slice(0, maxLength) + deco
  }
  return ''
}

export const shallowUpdate = (target: UnwrapNestedRefs<any>, source?: Record<string, any>) => {
  if (!source) {
    return
  }
  Object.entries(source).forEach(([key, value]) => {
    if (typeof value === 'undefined') {
      return
    }
    target[key] = value
  })
}
