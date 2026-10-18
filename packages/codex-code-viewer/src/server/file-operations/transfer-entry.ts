import {constants} from 'node:fs'
import {chmod, copyFile, mkdir, readdir, rm} from 'node:fs/promises'
import {basename, extname, join} from 'node:path'
import {failure, type Result, success, type WorkspaceEntry} from '../../shared/contracts'
import {isWithin} from '../file-access'
import {isEntryName} from '../is-entry-name'
import {readEntry} from './read-entry'
import {resolveEntry} from './resolve-entry'
import type {EntryPath, EntrySnapshot, TransferEntryProps} from './types'

const copyName = (name: string, names: ReadonlySet<string>): string => {
  if (!names.has(name)) {
    return name
  }
  const extension = extname(name)
  const stem = (extension === '' ? name : name.slice(0, -extension.length)).replace(/^\.+/u, '')
  let index = 1
  let candidate = `${stem} 복사본${extension}`
  while (names.has(candidate)) {
    index += 1
    candidate = `${stem} 복사본 ${index}${extension}`
  }
  return candidate
}

const copySnapshot = async (
  source: EntrySnapshot,
  target: string,
  created: () => void,
): Promise<void> => {
  const copy = async (entry: EntrySnapshot['entries'][number]): Promise<void> => {
    const destination = join(target, entry.path)
    if (entry.kind === 'directory') {
      await mkdir(destination, {mode: 0o700})
    } else {
      await copyFile(join(source.absolute, entry.path), destination, constants.COPYFILE_EXCL)
    }
  }
  await copy(source.entries[0]!)
  created()
  // Parent directories must exist before their children and later writes must stop on failure.
  await source.entries.slice(1).reduce(async (previous, entry) => {
    await previous
    await copy(entry)
  }, Promise.resolve())
  await source.entries
    .filter((entry) => entry.kind === 'directory')
    .toReversed()
    .reduce(async (previous, entry) => {
      await previous
      await chmod(join(target, entry.path), entry.mode)
    }, Promise.resolve())
}

interface TransferPlan {
  readonly parent: EntryPath
  readonly source: EntrySnapshot
}
const prepareTransfer = async (props: TransferEntryProps): Promise<Result<TransferPlan>> => {
  const parent = await resolveEntry({allowRoot: true, path: props.parent, root: props.root})
  if (!parent.ok) {
    return parent
  }
  if (parent.value.kind !== 'directory') {
    return failure('invalid-destination')
  }
  const source = await readEntry(props)
  if (!source.ok) {
    return source
  }
  if (props.name !== undefined && !isEntryName(props.name, source.value.kind)) {
    return failure('invalid-name')
  }
  if (source.value.revision !== props.revision) {
    return failure('entry-changed')
  }
  if (source.value.kind === 'directory' && isWithin(source.value.absolute, parent.value.absolute)) {
    return failure('invalid-destination')
  }
  return success({parent: parent.value, source: source.value})
}

/** Copies exclusively; a cut removes its source only after the complete copy and revision check. */
export const transferEntry = async (props: TransferEntryProps): Promise<Result<WorkspaceEntry>> => {
  const plan = await prepareTransfer(props)
  if (!plan.ok) {
    return plan
  }
  const {parent, source} = plan.value
  let target: string | null = null
  let created = false
  let removing = false
  try {
    const names = new Set(await readdir(parent.absolute))
    const original = props.name ?? basename(source.absolute)
    if (props.action === 'cut' && names.has(original)) {
      return failure('already-exists')
    }
    const name = props.action === 'copy' ? copyName(original, names) : original
    target = join(parent.absolute, name)
    await copySnapshot(source, target, () => {
      created = true
    })
    const current = await readEntry(props)
    if (!current.ok || current.value.revision !== props.revision) {
      await rm(target, {force: true, recursive: true})
      return failure('entry-changed')
    }
    if (props.action === 'cut') {
      removing = true
      await rm(source.absolute, {recursive: source.kind === 'directory'})
    }
    return success({
      kind: source.kind,
      path: parent.path === '' ? name : `${parent.path}/${name}`,
    })
  } catch (error) {
    if (created && target !== null && !removing) {
      const removal = await rm(target, {force: true, recursive: true}).then(
        () => null,
        (cause: unknown) => cause,
      )
      if (removal !== null) {
        return failure('file-operation-failed')
      }
    }
    return failure(
      !created && error instanceof Error && 'code' in error && error.code === 'EEXIST'
        ? 'already-exists'
        : 'file-operation-failed',
    )
  }
}
