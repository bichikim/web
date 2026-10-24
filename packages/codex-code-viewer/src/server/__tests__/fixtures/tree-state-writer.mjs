import fs from 'node:fs'
import {syncBuiltinESMExports} from 'node:module'
import {parentPort, workerData} from 'node:worker_threads'
import {createThreadTreeState} from '../../create-thread-tree-state'

const read = fs.readFileSync
const control = new Int32Array(workerData.control)
let paused = false
fs.readFileSync = (...input) => {
  const snapshot = read(...input)
  if (!paused && String(input[0]).includes('/trees/')) {
    paused = true
    parentPort.postMessage('read')
    Atomics.wait(control, 0, 0)
  }
  return snapshot
}
syncBuiltinESMExports()
const result = createThreadTreeState(workerData.home).write(workerData.metadata, '/project', {
  visible: false,
})
parentPort.postMessage(result)
