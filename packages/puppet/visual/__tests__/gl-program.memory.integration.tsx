import {GlProgram} from 'pixi.js'
import {expect, test} from 'vitest'
import {cdp} from 'vitest/browser'
import type {CDPSession} from '@vitest/browser-playwright'

const padding = `/*${' shader lifetime regression '.repeat(160)}*/`
const options = {
  fragment: `precision mediump float; ${padding}\nvoid main() { gl_FragColor = vec4(1.0); }`,
  name: 'puppet-lifetime-regression',
  vertex: `precision highp float; ${padding}\nvoid main() { gl_Position = vec4(0.0); }`,
}

test('should bound retained shader strings after repeated program destruction', async () => {
  const session: CDPSession = cdp()
  const cycle = () => new GlProgram(options).destroy()
  await session.send('HeapProfiler.enable')
  try {
    Array.from({length: 30}).forEach(cycle)
    await session.send('HeapProfiler.collectGarbage')
    const before = await session.send('Runtime.getHeapUsage')
    Array.from({length: 300}).forEach(cycle)
    await session.send('HeapProfiler.collectGarbage')
    const after = await session.send('Runtime.getHeapUsage')
    expect(after.usedSize - before.usedSize).toBeLessThan(262144)
  } finally {
    await session.send('HeapProfiler.disable')
  }
})

test('should retain independent program ownership and distinct shader variants', () => {
  const first = new GlProgram(options)
  const second = new GlProgram(options)
  const variant = new GlProgram({
    ...options,
    fragment: options.fragment.replace('vec4(1.0)', 'vec4(0.5)'),
  })
  first.destroy()
  expect(second.vertex).toContain('gl_Position')
  expect(second.fragment).toContain('vec4(1.0)')
  expect(variant.fragment).toContain('vec4(0.5)')
  expect(variant.fragment).not.toBe(second.fragment)
  second.destroy()
  variant.destroy()
})
