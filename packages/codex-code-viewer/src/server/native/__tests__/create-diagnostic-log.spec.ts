import {describe, expect, it} from 'vitest'
import {createDiagnosticLog} from '../create-diagnostic-log'

describe('createDiagnosticLog', () => {
  it('should retain recent messages within a shared size budget during sustained logging', () => {
    const log = createDiagnosticLog<string>()
    for (let index = 0; index < 1000; index += 1) {
      log.append(`${index}:${'x'.repeat(4096)}`)
    }
    expect(JSON.stringify(log.read()).length).toBeLessThanOrEqual(65536)
    expect(log.read().at(-1)).toBe(`999:${'x'.repeat(4096)}`)
    expect(log.omitted()).toBeGreaterThan(0)
  })
  it('should bound tiny messages by count and return independent snapshots', () => {
    const log = createDiagnosticLog<number>()
    const initial = log.read()
    for (let index = 0; index < 1000; index += 1) {
      log.append(index)
    }
    expect(log.read()).toHaveLength(64)
    expect(log.read().at(-1)).toBe(999)
    expect(initial).toEqual([])
    log.clear()
    expect(log.read()).toEqual([])
  })
  it('should omit an oversized entry and accept subsequent messages', () => {
    const log = createDiagnosticLog<string>()
    log.append('x'.repeat(8193))
    log.append('latest')
    expect(log.read()).toEqual(['latest'])
    expect(log.omitted()).toBe(1)
  })
})
