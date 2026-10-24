import typescript from '@typescript/typescript6'
import {type BigIntStats, statSync} from 'node:fs'
import {fileRevision} from './file-revision'
import {readCompilerSource} from './read-compiler-source'

const readCachedValue = <Key, Value>(
  values: Map<Key, Value>,
  key: Key,
  read: () => Value,
): Value => {
  if (!values.has(key)) {
    values.set(key, read())
  }
  return values.get(key) as Value
}

/** Caches compiler filesystem reads until the owning navigation operation releases them. */
export const createNavigationFileSystem = (system?: typescript.System) => {
  const metadata = new Map<string, BigIntStats | undefined>()
  const stats = (path: string): BigIntStats | undefined =>
    readCachedValue(metadata, path, () => {
      try {
        return statSync(path, {bigint: true, throwIfNoEntry: false})
      } catch {
        return undefined
      }
    })
  const reader: typescript.System = system ?? {
    ...typescript.sys,
    directoryExists: (path) =>
      metadata.has(path)
        ? metadata.get(path)?.isDirectory() === true
        : typescript.sys.directoryExists(path),
    fileExists: (path) =>
      metadata.has(path) || /\.[cm]?[jt]sx?$/iu.test(path)
        ? stats(path)?.isFile() === true
        : typescript.sys.fileExists(path),
    readFile: readCompilerSource,
  }
  const reads = new Map<string | undefined, Map<string, string | undefined>>()
  const files = new Map<string, boolean>()
  const directories = new Map<string, boolean>()
  const children = new Map<string, string[]>()
  const canonical = new Map<string, string>()
  const host: typescript.System = {
    ...reader,
    directoryExists: (path) =>
      readCachedValue(directories, path, () => reader.directoryExists(path)),
    fileExists: (path) => readCachedValue(files, path, () => reader.fileExists(path)),
    getDirectories: (path) =>
      readCachedValue(children, path, () => reader.getDirectories(path)).slice(),
    readFile: (path, encoding) =>
      readCachedValue(
        readCachedValue(reads, encoding, () => new Map<string, string | undefined>()),
        path,
        () => reader.readFile(path, encoding),
      ),
    ...(reader.realpath === undefined
      ? {}
      : {
          realpath: (path: string) =>
            readCachedValue(canonical, path, () => reader.realpath?.(path) ?? path),
        }),
  }
  return {
    clear: (): void => {
      reads.clear()
      files.clear()
      directories.clear()
      children.clear()
      canonical.clear()
      metadata.clear()
    },
    host,
    record: (path: string, current: BigIntStats): void => {
      metadata.set(path, current)
      files.delete(path)
      directories.delete(path)
      canonical.delete(path)
      for (const contents of reads.values()) {
        contents.delete(path)
      }
    },
    revision: (path: string): string => {
      const current = stats(path)
      return current === undefined ? 'missing' : fileRevision(current)
    },
  }
}
