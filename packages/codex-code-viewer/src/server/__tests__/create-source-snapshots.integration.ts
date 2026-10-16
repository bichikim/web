import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it, vi} from 'vitest'
import {createSourceSnapshots} from '../create-source-snapshots'
import typescript from '@typescript/typescript6'
import {createNavigationFileSystem} from '../create-navigation-file-system'

const text = (
  snapshot: ReturnType<ReturnType<typeof createSourceSnapshots>['read']>,
): string | undefined => snapshot?.getText(0, snapshot.getLength())

describe('createSourceSnapshots', () => {
  it.each(['utf8', 'utf8-bom', 'utf16le', 'utf16be'] as const)(
    'should preserve compiler decoding for %s',
    async (encoding) => {
      const root = mkdtempSync(join(tmpdir(), 'encoded-snapshot-'))
      const file = join(root, 'source.ts')
      const snapshots = createSourceSnapshots(new Map())
      const original = 'export const 인사 = "hello"'
      const bytes =
        encoding === 'utf8' || encoding === 'utf8-bom'
          ? Buffer.from(original)
          : Buffer.from(original, 'utf16le')
      const contents =
        encoding === 'utf8'
          ? bytes
          : encoding === 'utf8-bom'
            ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes])
            : encoding === 'utf16le'
              ? Buffer.concat([Buffer.from([0xff, 0xfe]), bytes])
              : Buffer.concat([Buffer.from([0xfe, 0xff]), bytes.swap16()])
      try {
        writeFileSync(file, contents)
        await snapshots.prepare([file])
        expect(text(snapshots.read(file))).toBe(original)
        expect(text(snapshots.read(file))).toBe(typescript.sys.readFile(file))
      } finally {
        snapshots.dispose()
        rmSync(root, {force: true, recursive: true})
      }
    },
  )
  it('should discard pending source reads when the snapshot owner is disposed', async () => {
    const root = mkdtempSync(join(tmpdir(), 'disposed-snapshot-'))
    const file = join(root, 'source.ts')
    const metadata = createNavigationFileSystem()
    const record = vi.spyOn(metadata, 'record')
    const snapshots = createSourceSnapshots(new Map(), metadata)
    try {
      writeFileSync(file, 'initial')
      const pending = snapshots.prepare([file])
      snapshots.dispose()
      await pending
      expect(record).not.toHaveBeenCalled()
      writeFileSync(file, 'after disposal')
      expect(text(snapshots.read(file))).toBe('after disposal')
    } finally {
      snapshots.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should prepare encoded sources and drafts without changing operation snapshot semantics', async () => {
    const root = mkdtempSync(join(tmpdir(), 'prepared-snapshot-'))
    const file = join(root, 'source.ts')
    const draft = join(root, 'draft.ts')
    const missing = join(root, 'missing.ts')
    const original = 'export const 인사 = "hello"'
    const snapshots = createSourceSnapshots(new Map([[draft, 'draft content']]))
    try {
      writeFileSync(
        file,
        Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(original, 'utf16le')]),
      )
      await snapshots.prepare([file, draft, missing])
      expect(text(snapshots.read(file))).toBe(typescript.sys.readFile(file))
      expect(text(snapshots.read(draft))).toBe('draft content')
      expect(snapshots.read(missing)).toBeUndefined()
      const initial = snapshots.read(file)
      writeFileSync(file, 'changed')
      await snapshots.prepare([file])
      expect(snapshots.read(file)).toBe(initial)
      expect(snapshots.refresh()).toBe(true)
      expect(text(snapshots.read(file))).toBe('changed')
      await expect(snapshots.prepare([file], () => true)).rejects.toThrow(
        typescript.OperationCanceledException,
      )
      await snapshots.prepare([file])
      expect(text(snapshots.read(file))).toBe('changed')
    } finally {
      snapshots.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should retain one operation snapshot and refresh edits and deletions for the next operation', () => {
    const root = mkdtempSync(join(tmpdir(), 'source-snapshot-'))
    const file = join(root, 'source.ts')
    const snapshots = createSourceSnapshots(new Map())
    try {
      writeFileSync(file, 'first')
      const initial = snapshots.read(file)
      writeFileSync(file, 'updated source')
      expect(snapshots.read(file)).toBe(initial)
      expect(snapshots.refresh()).toBe(true)
      expect(text(snapshots.read(file))).toBe('updated source')
      expect(snapshots.refresh()).toBe(false)
      rmSync(file)
      expect(snapshots.refresh()).toBe(true)
      expect(snapshots.read(file)).toBeUndefined()
      writeFileSync(file, 'restored')
      expect(snapshots.refresh()).toBe(true)
      expect(text(snapshots.read(file))).toBe('restored')
    } finally {
      snapshots.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should preserve a draft independently of disk changes and release a missing-file draft on refresh', () => {
    const root = mkdtempSync(join(tmpdir(), 'draft-snapshot-'))
    const file = join(root, 'source.ts')
    const drafts = new Map([[file, 'missing']])
    const snapshots = createSourceSnapshots(drafts)
    try {
      expect(text(snapshots.read(file))).toBe('missing')
      writeFileSync(file, 'saved')
      expect(snapshots.refresh()).toBe(false)
      expect(text(snapshots.read(file))).toBe('missing')
      rmSync(file)
      drafts.delete(file)
      expect(snapshots.refresh()).toBe(true)
      expect(snapshots.read(file)).toBeUndefined()
    } finally {
      snapshots.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
})
