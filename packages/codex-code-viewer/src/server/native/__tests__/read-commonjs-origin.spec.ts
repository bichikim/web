import {describe, expect, it} from 'vitest'
import typescript from '@typescript/typescript6'
import {readCommonjsOrigin} from '../read-commonjs-origin'

const read = (text: string, name: string) =>
  readCommonjsOrigin(
    typescript.createSourceFile('api.cjs', text, typescript.ScriptTarget.Latest, true),
    text.lastIndexOf(name),
  )
describe('readCommonjsOrigin', () => {
  it('should identify the value of a shorthand CommonJS export', () => {
    const text = 'function greet() {}\nmodule.exports = {greet}'
    expect(read(text, 'greet')).toBe(text.lastIndexOf('greet'))
  })
  it('should identify the value behind a renamed CommonJS export', () => {
    const text = 'function greet() {}\nmodule.exports = {publicName: greet}'
    expect(read(text, 'publicName')).toBe(text.lastIndexOf('greet'))
  })
  it('should exclude ordinary object properties and non-identifier initializers', () => {
    expect(read('const ordinary = {greet}', 'greet')).toBeUndefined()
    expect(read('module.exports = {greet: () => 1}', 'greet')).toBeUndefined()
  })
})
