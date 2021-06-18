export const getKeys = (object: Record<string, any>) => {
  const _object = {...object}
  delete _object.config
  return Object.keys(_object)
}
