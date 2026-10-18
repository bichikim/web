import {describe, expect, it} from 'vitest'
import {createPreparationGate} from '../create-preparation-gate'

describe('createPreparationGate', () => {
  it('should wait for the foreground milestone', async () => {
    const gate = createPreparationGate()
    const release = gate.begin()
    let ready = false
    const pending = gate.wait().then(() => {
      ready = true
    })
    await Promise.resolve()
    expect(ready).toBe(false)
    release()
    await pending
    expect(ready).toBe(true)
  })

  it('should retain a replacement owner when an older owner finishes', async () => {
    const gate = createPreparationGate()
    const previous = gate.begin()
    const current = gate.begin()
    previous()
    let ready = false
    const pending = gate.wait().then(() => {
      ready = true
    })
    await Promise.resolve()
    expect(ready).toBe(false)
    current()
    await pending
    expect(ready).toBe(true)
  })

  it('should release preparation when the workspace closes', async () => {
    const gate = createPreparationGate()
    gate.begin()
    const pending = gate.wait()
    gate.release()
    await pending
    await gate.wait()
  })
})
