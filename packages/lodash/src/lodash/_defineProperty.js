import getNative from './_getNative.js'

const defineProperty = (function () {
  try {
    const func = getNative(Object, 'defineProperty')
    func({}, '', {})
    return func
  } catch {}
})()

export default defineProperty
