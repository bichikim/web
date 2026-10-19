import {describe, expect, it} from 'vitest'
import {readDirectReferences} from '../read-direct-references'
const source = 'export const greet = () => 1'
const input = {file: '/root/greet.mjs', offset: source.indexOf('greet'), source}
const consumer = "import {greet as hello} from './greet.mjs'; hello()"
const read = (text = consumer, resolved: readonly string[] = [input.file]) =>
  readDirectReferences({input, paths: ['/root/use.mjs'], read: () => text, resolve: () => resolved})
describe('readDirectReferences', () => {
  it('should publish the original import name for a renamed function import', () => {
    expect(read()).toEqual([{file: '/root/use.mjs', offset: 8, source: consumer}])
  })
  it('should omit unrelated modules with the same exported name', () => {
    expect(read(consumer, ['/root/other.mjs'])).toEqual([])
  })
  it('should omit conditional resolution disagreement', () => {
    expect(read(consumer, [input.file, '/root/other.mjs'])).toEqual([])
  })
  it('should omit comments, strings and dynamic requires', () => {
    expect(
      read("// import {greet} from './greet.mjs'\nconst text = `greet`; require('./greet.mjs')"),
    ).toEqual([])
  })
  it('should omit package imports until native identity verification', () => {
    expect(read("import {greet} from 'greet'")).toEqual([])
  })
  it('should omit namespace and default imports', () => {
    expect(read("import greet from './greet.mjs'; import * as other from './greet.mjs'")).toEqual(
      [],
    )
  })
  it('should leave quoted import names to native range normalization', () => {
    expect(read("import {'greet' as hello} from './greet.mjs'")).toEqual([])
  })
  it('should omit alias initializers needing canonical origin verification', () => {
    const alias = 'export const greet = other'
    expect(
      readDirectReferences({
        input: {...input, source: alias},
        paths: ['/root/use.mjs'],
        read: () => consumer,
        resolve: () => [input.file],
      }),
    ).toEqual([])
  })
  it('should omit declaration files and duplicate declarations', () => {
    expect(
      readDirectReferences({
        input: {...input, file: '/root/greet.d.ts'},
        paths: ['/root/use.mjs'],
        read: () => consumer,
        resolve: () => [input.file],
      }),
    ).toEqual([])
    expect(
      readDirectReferences({
        input: {...input, source: `${source}; const greet = 2`},
        paths: ['/root/use.mjs'],
        read: () => consumer,
        resolve: () => [input.file],
      }),
    ).toEqual([])
  })
  it('should inspect a declaration only, excluding calls and malformed syntax', () => {
    expect(
      readDirectReferences({
        input: {...input, offset: source.length - 1},
        paths: ['/root/use.mjs'],
        read: () => consumer,
        resolve: () => [input.file],
      }),
    ).toEqual([])
    expect(read('import {greet from "./greet.mjs"')).toEqual([])
  })
  it('should retain cross-package relative imports without local shadow usages', () => {
    const text = "import {greet as hello} from '../greet.mjs'; function use(hello) { hello() }"
    expect(
      readDirectReferences({
        input,
        paths: ['/root/package/use.mjs'],
        read: () => text,
        resolve: () => [input.file],
      }),
    ).toEqual([{file: '/root/package/use.mjs', offset: 8, source: text}])
  })
})

const usages = (text: string) =>
  readDirectReferences({
    includeUsages: true,
    input,
    paths: ['/root/use.tsx'],
    read: () => text,
    resolve: () => [input.file],
  }).map((point) => point.offset)
describe('direct import usages', () => {
  it('should include renamed calls while excluding parameters, property names, strings and comments', () => {
    const text =
      "import {greet as hello} from './greet.mjs'; hello(); " +
      "function f(hello) { hello() }; object.hello; const x = 'hello'; // hello"
    expect(usages(text)).toEqual([8, text.indexOf('hello();')])
  })
  it('should resolve shorthand values and closures to the imported local symbol', () => {
    const text =
      "import {greet as hello} from './greet.mjs'; const object = {hello}; const closure = () => hello()"
    expect(usages(text)).toEqual([8, text.indexOf('{hello}') + 1, text.lastIndexOf('hello')])
  })
  it('should omit a separate block binding and a renamed export public name', () => {
    const text =
      "import {greet as hello} from './greet.mjs'; { const hello = () => 2; hello() }; " +
      'export {hello as publicName}; hello()'
    expect(usages(text)).toEqual([
      8,
      text.indexOf('hello as publicName'),
      text.lastIndexOf('hello'),
    ])
  })
  it('should retain type queries and computed keys but exclude literal keys', () => {
    const text =
      "import {greet as hello} from './greet.mjs'; type Value = typeof hello; " +
      'const object = {[hello()]: 1, hello: 2}'
    expect(usages(text)).toEqual([8, text.indexOf('hello;'), text.indexOf('hello()')])
  })
  it('should leave import aliases shadowed by duplicate declarations to native analysis', () => {
    const text = "import {greet as hello} from './greet.mjs'; const hello = () => 2; hello()"
    expect(usages(text)).toEqual([8])
  })
})
