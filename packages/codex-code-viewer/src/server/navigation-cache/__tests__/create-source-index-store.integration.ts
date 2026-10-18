import {mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {createSourceIndexStore} from '../create-source-index-store'

const directories: string[] = []
const setup = () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'source-index-store-')))
  directories.push(directory)
  return {directory, root: '/project'}
}
const snapshot = {
  configurations: [['/project/tsconfig.json', 'config']] as [string, string][],
  entries: [
    {
      file: {dependencies: [], fingerprint: 'f', names: ['greet'], surface: 'f', uncertain: false},
      path: 'entry.ts',
      source: {
        revision: 'r',
        summary: {fingerprint: 'f', imports: [], names: ['greet'], surface: 'f', uncertain: false},
      },
    },
  ],
}
const signal = () => new AbortController().signal

afterEach(() =>
  directories.splice(0).forEach((directory) => rmSync(directory, {force: true, recursive: true})),
)
describe('createSourceIndexStore', () => {
  it('should restore per-file summaries in a new owner and isolate workspaces', async () => {
    const options = setup()
    expect(await createSourceIndexStore(options).read(signal())).toBeUndefined()
    await createSourceIndexStore(options).write(snapshot, signal())
    expect(await createSourceIndexStore(options).read(signal())).toEqual(snapshot)
    expect(
      await createSourceIndexStore({...options, root: '/another'}).read(signal()),
    ).toBeUndefined()
  })
  it('should discard truncated and checksum-mismatched cache files', async () => {
    const options = setup()
    const store = createSourceIndexStore(options)
    await store.write(snapshot, signal())
    const path = join(options.directory, readdirSync(options.directory)[0])
    const content = readFileSync(path, 'utf8')
    writeFileSync(path, content.replace('greet', 'other'))
    expect(await store.read(signal())).toBeUndefined()
    writeFileSync(path, '{')
    expect(await store.read(signal())).toBeUndefined()
  })
  it('should keep navigation available when the cache destination is unavailable', async () => {
    const options = setup()
    const file = join(options.directory, 'file')
    writeFileSync(file, '')
    const store = createSourceIndexStore({...options, directory: file})
    expect(await store.write(snapshot, signal())).toBe(false)
    expect(await store.read(signal())).toBeUndefined()
  })
  it('should propagate cancellation separately from a cache miss', async () => {
    const options = setup()
    const controller = new AbortController()
    controller.abort()
    const store = createSourceIndexStore(options)
    await expect(store.read(controller.signal)).rejects.toThrow()
    await expect(store.write(snapshot, controller.signal)).rejects.toThrow()
  })
})
