export const createUuid = (prefix: string = '') => {
  let count = 0
  return () => {
    count += 1
    return prefix + count
  }
}

export const createGetAtomPrams = (getId: () => string) => (unknown?: any, mayRecipe?: any, name?: string) => {
  let recipe
  let state
  let _name

  if (typeof mayRecipe === 'function') {
    state = unknown
    recipe = mayRecipe
    _name = name
  } else {
    recipe = unknown
    _name = mayRecipe
  }

  if (!_name) {
    _name = getId()
  }
  return {
    name: _name,
    recipe,
    state,
  }
}
