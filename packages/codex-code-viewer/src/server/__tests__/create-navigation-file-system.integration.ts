import {mkdtempSync, rmSync, statSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {createNavigationFileSystem} from '../create-navigation-file-system'
import {fileRevision} from '../file-revision'

describe('createNavigationFileSystem metadata reuse', () => {
  it('should replace failed probes with prepared metadata without probing the disk again', () => {
    const root = mkdtempSync(join(tmpdir(), 'prepared-metadata-'))
    const file = join(root, 'source.ts')
    const filesystem = createNavigationFileSystem()
    try {
      expect(filesystem.host.fileExists(file)).toBe(false)
      expect(filesystem.host.readFile(file)).toBeUndefined()
      writeFileSync(file, 'prepared')
      filesystem.record(file, statSync(file, {bigint: true}))
      rmSync(file)
      expect(filesystem.host.fileExists(file)).toBe(true)
      writeFileSync(file, 'restored')
      expect(filesystem.host.readFile(file)).toBe('restored')
      filesystem.clear()
      expect(filesystem.host.fileExists(file)).toBe(true)
    } finally {
      filesystem.clear()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should share one operation metadata snapshot between existence and version reads', () => {
    const root = mkdtempSync(join(tmpdir(), 'navigation-metadata-'))
    const file = join(root, 'source.ts')
    const filesystem = createNavigationFileSystem()
    try {
      writeFileSync(file, 'initial')
      const initial = fileRevision(statSync(file, {bigint: true}))
      expect(filesystem.host.fileExists(file)).toBe(true)
      expect(filesystem.host.readFile(file)).toBe('initial')
      writeFileSync(file, 'updated source')
      expect(filesystem.revision(file)).toBe(initial)
      expect(filesystem.host.readFile(file)).toBe('initial')
      filesystem.clear()
      expect(filesystem.revision(file)).toBe(fileRevision(statSync(file, {bigint: true})))
      expect(filesystem.revision(file)).not.toBe(initial)
      expect(filesystem.host.readFile(file)).toBe('updated source')
      rmSync(file)
      filesystem.clear()
      expect(filesystem.host.fileExists(file)).toBe(false)
      writeFileSync(file, 'restored')
      expect(filesystem.revision(file)).toBe('missing')
      filesystem.clear()
      expect(filesystem.host.fileExists(file)).toBe(true)
      expect(filesystem.host.readFile(file)).toBe('restored')
      expect(filesystem.revision(file)).toBe(fileRevision(statSync(file, {bigint: true})))
    } finally {
      filesystem.clear()
      rmSync(root, {force: true, recursive: true})
    }
  })
})
