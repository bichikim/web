import {describe, expect, it} from 'vitest'
import typescript from '@typescript/typescript6'
import {readDeclarationPositions} from '../read-declaration-positions'

const parse = (name: string, text: string) =>
  typescript.createSourceFile(name, text, typescript.ScriptTarget.Latest, true)
describe('readDeclarationPositions', () => {
  it('should map a named function declaration without including its return-type reference', () => {
    const source = 'export function greet() {}'
    const declaration = 'export declare function greet(): typeof greet;'
    expect(
      readDeclarationPositions({
        declaration: parse('entry.d.ts', declaration),
        offset: source.indexOf('greet'),
        source: parse('entry.ts', source),
      }),
    ).toEqual([declaration.indexOf('greet')])
  })
  it('should distinguish identical member names by their containing declarations', () => {
    const source = 'export class First { run() {} } export class Second { run() {} }'
    const declaration =
      'export declare class First { run(): void; } export declare class Second { run(): void; }'
    expect(
      readDeclarationPositions({
        declaration: parse('entry.d.ts', declaration),
        offset: source.indexOf('run'),
        source: parse('entry.ts', source),
      }),
    ).toEqual([declaration.indexOf('run')])
  })
  it('should exclude function-local names from similarly named namespace members', () => {
    const source = 'export function greet() { const inside = 1; return inside }'
    const declaration = 'export declare namespace greet { const inside: number; }'
    expect(
      readDeclarationPositions({
        declaration: parse('entry.d.ts', declaration),
        offset: source.indexOf('inside'),
        source: parse('entry.ts', source),
      }),
    ).toEqual([])
  })
  it('should support declaration signatures for an exported function-valued variable', () => {
    const source = 'export const greet = () => {}'
    const declaration = 'export declare function greet(): void;'
    expect(
      readDeclarationPositions({
        declaration: parse('entry.d.ts', declaration),
        offset: source.indexOf('greet'),
        source: parse('entry.ts', source),
      }),
    ).toEqual([declaration.indexOf('greet')])
  })
})
