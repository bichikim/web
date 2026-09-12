import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {batch, createComputed, createRoot, createSignal} from 'solid-js'

const require = createRequire(import.meta.url)
const SIGNAL_VALUE = 7
const SECOND_VALUE = 5
assert.ok(import.meta.resolve('solid-js').endsWith('/dist/solid.js'))
const measured = createRoot((dispose) => {
  const [value, setValue] = createSignal(SIGNAL_VALUE, {equals: false})
  let signalCalls = 0
  createComputed(() => {
    value()
    signalCalls += 1
  })
  signalCalls = 0
  setValue(SIGNAL_VALUE)
  const [first, setFirst] = createSignal(0)
  const [second, setSecond] = createSignal(0)
  const batches = []
  createComputed(() => batches.push([first(), second()]))
  batches.length = 0
  batch(() => {
    setFirst(1)
    setSecond(SECOND_VALUE)
  })
  assert.equal(signalCalls, 1)
  assert.deepEqual(batches, [[1, SECOND_VALUE]])
  dispose()
  return {batches, signalCalls}
})
console.log(JSON.stringify({measured, solidVersion: require('solid-js/package.json').version}))
