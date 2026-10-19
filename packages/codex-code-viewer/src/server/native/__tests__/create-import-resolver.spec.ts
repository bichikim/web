import typescript from '@typescript/typescript6'
import {describe, expect, it, vi} from 'vitest'
import {createImportResolver} from '../create-import-resolver'

const setup = () => {
  const readFile = vi.fn(() => undefined)
  const host = {
    ...typescript.sys,
    directoryExists: vi.fn((path: string) => path === '/workspace'),
    fileExists: vi.fn((path: string) => path === '/workspace/dependency.ts'),
    readFile,
  }
  return {host, resolver: createImportResolver(host)}
}

describe('createImportResolver', () => {
  it('should skip compiler preprocessing for source without module or reference syntax', () => {
    const {host, resolver} = setup()
    expect(resolver.read('/workspace/main.ts', 'export const greet = () => 1')).toEqual([])
    expect(resolver.statistics().importTimings).toEqual({})
    expect(host.fileExists).not.toHaveBeenCalled()
    expect(host.readFile).not.toHaveBeenCalled()
  })
  it.each([
    "import {greet} from './dependency'",
    "export {greet} from './dependency'",
    "import './dependency'",
    "const greet = require('./dependency')",
    "define(['./dependency'], (dependency) => dependency)",
    "type Greet = import('./dependency').Greet",
    '/** @import {Greet} from "./dependency" */',
    '/// <reference path="dependency.ts" />',
    "const greet = requ\\u0069re('./dependency')",
  ])('should retain module and declaration discovery for %s', (source) => {
    const {resolver} = setup()
    expect(resolver.read('/workspace/main.ts', source)).toContain('/workspace/dependency.ts')
  })
})
