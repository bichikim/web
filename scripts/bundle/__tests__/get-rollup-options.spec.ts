import {genRollupOptions} from '../gen-rollup-options'
import tsTreeShaking from 'rollup-plugin-ts-treeshaking'
import typescript from 'rollup-plugin-typescript2'
import ttypescript from 'ttypescript'
import path from 'path'

jest.mock('ttypescript')

jest.mock('rollup-plugin-typescript2')

jest.mock('rollup-plugin-ts-treeshaking')

const tsTreeShakingMock: jest.Mock & {plugin: any} = tsTreeShaking as any
const typescriptMock: jest.Mock & {plugin: any} = typescript as any

describe('getRollupOptions', function test() {
  afterEach(() => {
    tsTreeShakingMock.mockClear()
    typescriptMock.mockClear()
  })

  it('should return options with input', function test() {
    const result = genRollupOptions()

    expect(typeof result.input).toBe('object')

    const input = result.input as any

    expect(input.input).toBe(path.join('src', 'index.ts'))
  })

  it('should return options with treeshaking plugin', function test() {
    const result = genRollupOptions()

    const input = result.input as any

    // make sure it is mocked
    expect(typeof tsTreeShakingMock.plugin).toBe('function')

    expect(input.plugins).toContain(tsTreeShakingMock.plugin)
  })

  it('should return options with rollup-plugin-typescript2', function test() {
    const result = genRollupOptions()

    const input = result.input as any

    // make sure it is mocked
    expect(typeof typescriptMock.plugin).toBe('function')

    expect(input.plugins).toContain(typescriptMock.plugin)
    // check if the typescript function is called once
    expect(typescriptMock.mock.calls.length).toBe(1)
    // check if the typescript function is called well
    const typescriptOptions = typescriptMock.mock.calls[0][0]
    expect(typescriptOptions.typescript).toBe(ttypescript)
    expect(typescriptOptions.tsconfigOverride).toEqual({
      compilerOptions: {
        plugins: [
          {transform: '@zerollup/ts-transform-paths'},
        ],
      },
    })
  })
})
