import {describe, expect, it} from 'vitest'
import {createTreeModel} from '../create-tree-model'
import {getVisibleNodes} from '../get-visible-nodes'

describe('createTreeModel', () => {
  it('should merge streamed batches in natural order without replacing unaffected branches', () => {
    const model = createTreeModel()
    model.begin()
    model.receive({
      complete: true,
      directories: ['src', 'test'],
      directory: '',
      files: [],
      version: 'root',
    })
    model.receive({
      complete: true,
      directories: [],
      directory: 'test',
      files: [{openable: true, path: 'test/keep.ts'}],
    })
    const retained = model.node('test')
    model.receive({
      complete: false,
      directories: [],
      directory: 'src',
      files: [{openable: true, path: 'src/file10.ts'}],
    })
    expect(model.node('src/file10.ts')).toBeDefined()
    model.receive({
      complete: true,
      directories: [],
      directory: 'src',
      files: [{openable: true, path: 'src/file2.ts'}],
      version: 'source',
    })
    expect(getVisibleNodes(model.roots(), () => true).map((node) => node.path)).toEqual([
      'src',
      'src/file2.ts',
      'src/file10.ts',
      'test',
      'test/keep.ts',
    ])
    expect(model.node('test')).toBe(retained)
    expect(model.versions(['', 'src'])).toEqual({'': 'root', src: 'source'})
  })

  it('should preserve loaded children on parent refresh and prune deleted descendants and versions', () => {
    const model = createTreeModel()
    model.begin()
    model.receive({complete: true, directories: ['src'], directory: '', files: [], version: '1'})
    model.receive({
      complete: true,
      directories: ['src/nested'],
      directory: 'src',
      files: [],
      version: '2',
    })
    model.receive({
      complete: true,
      directories: [],
      directory: 'src/nested',
      files: [{openable: true, path: 'src/nested/main.ts'}],
      version: '3',
    })
    const source = model.node('src')
    model.begin()
    model.receive({complete: true, directories: ['src'], directory: '', files: [], version: '4'})
    expect(model.node('src')).toBe(source)
    expect(model.node('src/nested/main.ts')).toBeDefined()
    model.begin()
    model.receive({complete: true, directories: [], directory: 'src', files: [], version: '5'})
    expect(model.node('src/nested/main.ts')).toBeUndefined()
    expect(model.versions(['src', 'src/nested'])).toEqual({src: '5'})
  })

  it('should retry incomplete directories and construct missing search ancestors', () => {
    const model = createTreeModel()
    model.begin()
    model.receive({
      complete: true,
      directories: [],
      directory: 'src/nested',
      files: [{openable: true, path: 'src/nested/main.ts'}],
      version: '1',
    })
    expect(getVisibleNodes(model.roots(), () => true).map((node) => node.path)).toEqual([
      'src',
      'src/nested',
      'src/nested/main.ts',
    ])
    model.begin()
    model.receive({complete: false, directories: [], directory: 'src/nested', files: []})
    expect(model.versions(['src/nested'])).toEqual({})
    model.begin()
    model.receive({
      complete: true,
      directories: [],
      directory: 'src/nested',
      files: [{openable: false, path: 'src/nested/new.ts'}],
      version: '2',
    })
    expect(model.node('src/nested/main.ts')).toBeUndefined()
    expect(model.node('src/nested/new.ts')).toMatchObject({openable: false})
  })

  it('should replace snapshot results and clear cached versions', () => {
    const model = createTreeModel()
    model.receive({
      complete: true,
      directories: [],
      directory: '',
      files: [{openable: true, path: 'old.ts'}],
      version: '1',
    })
    model.receive({
      complete: true,
      directories: ['empty'],
      directory: '',
      files: [{openable: true, path: 'src/main.ts'}],
      snapshot: true,
    })
    expect(model.node('old.ts')).toBeUndefined()
    expect(model.node('src/main.ts')).toBeDefined()
    expect(model.node('empty')).toBeDefined()
    expect(model.versions([''])).toEqual({})
  })
})
