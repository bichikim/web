import {genRollupOptions, defEntry, defSrc, defFile, defDist} from '../gen-rollup-options'
import tsTreeShaking from 'rollup-plugin-ts-treeshaking'
import typescript from 'rollup-plugin-typescript2'
import path from 'path'
// noinspection ES6PreferShortImport
import {getPackage} from '../../utils'
import {terser} from 'rollup-plugin-terser'

jest.mock('ttypescript')

jest.mock('rollup-plugin-typescript2')

jest.mock('rollup-plugin-ts-treeshaking')

jest.mock('rollup-plugin-terser')

const tsTreeShakingMock: jest.Mock & {plugin: any} = tsTreeShaking as any
const typescriptMock: jest.Mock & {plugin: any} = typescript as any
const terserMock: jest.Mock & {plugin: any} = terser as any

describe('getRollupOptions', function test() {
  afterEach(() => {
    tsTreeShakingMock.mockClear()
    typescriptMock.mockClear()
  })

  describe('input', function test() {
    it('should return rollup input options without options', function test() {
      const result = genRollupOptions()

      expect(typeof result.input).toBe('object')

      const cwd = process.cwd()

      const input = result.input as any

      expect(input.input).toBe(path.resolve(cwd, defSrc, defEntry))
    })

    it('should return rollup input options with src', function test() {
      const src = 'foo'
      const result = genRollupOptions({
        src,
      })

      const cwd = process.cwd()

      const input = result.input as any

      expect(input.input).toBe(path.resolve(cwd, src, defEntry))
    })

    it('should return rollup input options with entry', function test() {
      const entry = 'foo.ts'
      const result = genRollupOptions({
        entry,
      })

      const cwd = process.cwd()

      const input = result.input as any

      expect(input.input).toBe(path.resolve(cwd, defSrc, entry))
    })

    it('should return rollup input options with treeShaking plugin', function test() {
      const result = genRollupOptions()

      const input = result.input as any

      // make sure it is mocked
      expect(typeof tsTreeShakingMock.plugin).toBe('function')

      expect(input.plugins).toContain(tsTreeShakingMock.plugin)
    })

    it('should return rollup input options with rollup-plugin-typescript2', function test() {
      const result = genRollupOptions()

      const input = result.input as any

      // make sure it is mocked
      expect(typeof typescriptMock.plugin).toBe('function')

      expect(input.plugins).toContain(typescriptMock.plugin)
      // check if the typescript function is called once
      expect(typescriptMock.mock.calls.length).toBe(1)
      // check if the typescript function is called well
      const typescriptOptions = typescriptMock.mock.calls[0][0]
      // expect(typescriptOptions.typescript).toBe(ttypescript)
      expect(typescriptOptions.tsconfigOverride).toEqual({
        compilerOptions: {
          emitDeclarationOnly: false,
          target: 'ESNext',
          module: 'ESNext',
          paths: {
            '@/*': [
              'src/*',
            ],
          },
          plugins: [
            {transform: '@zerollup/ts-transform-paths'},
          ],
        },
      })
    })
  })

  describe('output', function test() {
    it('should return rollup output options without options', function test() {
      const result = genRollupOptions()

      const output = result.output as any

      expect(output).toEqual([])
    })

    it('should return rollup output options with output options', function test() {
      const result = genRollupOptions({
        output: [
          {},
        ],
      })

      const output = result.output as any

      const cwd = process.cwd()

      expect(output).toEqual([
        {
          file: path.resolve(cwd, defDist, defFile),
          name: getPackage(cwd).name,
          plugins: [],
        },
      ])
    })

    it('should return rollup output options with a file', function test() {
      const file = 'foo.js'

      const result = genRollupOptions({
        output: [{
          file,
        }],
      })

      const cwd = process.cwd()

      const output = result.output as any

      expect(output[0].file).toBe(path.resolve(cwd, defDist, file))
    })

    it('should return rollup output options with a dist', function test() {
      const dist = 'dist'

      const result = genRollupOptions({
        dist,
        output: [{
        }],
      })

      const cwd = process.cwd()

      const output = result.output as any

      expect(output[0].file).toBe(path.resolve(cwd, dist, defFile))
    })

    it('should return rollup output options with a name', function test() {
      const name = 'foo'
      const result = genRollupOptions({
        name,
        output: [
          {},
        ],
      })

      const output = result.output as any

      expect(output[0].name).toBe(name)
    })

    it('should override output name over name', function test() {
      const name = 'foo'
      const outputName = 'bar'
      const result = genRollupOptions({
        name,
        output: [
          {
            name: outputName,
          },
        ],
      })

      const output = result.output as any

      expect(output[0].name).toBe(outputName)
    })

    it('should return rollup output with minify', function test() {
      const result = genRollupOptions({
        output: [
          {
            minify: true,
          },
        ],
      })

      const output = result.output as any

      expect(output[0].plugins).toContain(terserMock.plugin)
    })
  })
})
