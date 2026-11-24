import Dexie from 'dexie'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {
  createLibraryRepository,
  type LibraryRepository,
} from '@winter-love/wallpaper/settings/library-repository'
import {trackingProfile} from '@winter-love/wallpaper/settings/tracking-profile'
import type {PoffoConnections} from '@winter-love/wallpaper/settings/connections'
import {builtinConnectionProfile} from '../../connection-profiles/builtin-profile'
import {createBuiltinLibrary} from '../create-builtin-library'

vi.mock('@winter-love/wallpaper/settings/library-repository', () => ({
  createLibraryRepository: vi.fn(),
}))

let factory: typeof createLibraryRepository
const repositories: LibraryRepository[] = []
const databases: string[] = []
const releases: (() => void)[] = []
const operations: Promise<unknown>[] = []

beforeEach(async () => {
  const actual = await vi.importActual<
    typeof import('@winter-love/wallpaper/settings/library-repository')
  >('@winter-love/wallpaper/settings/library-repository')
  factory = actual.createLibraryRepository
  vi.mocked(createLibraryRepository).mockImplementation(factory)
})
afterEach(async () => {
  releases.forEach((release) => release())
  await Promise.allSettled(operations)
  repositories.forEach((repository) => repository.close())
  await Promise.all(databases.map((name) => Dexie.delete(name)))
  const remaining = await Dexie.getDatabaseNames()
  expect(remaining.filter((name) => databases.includes(name))).toEqual([])
  repositories.length = 0
  databases.length = 0
  releases.length = 0
  operations.length = 0
  vi.resetAllMocks()
})

const seed = async (overrides: PoffoConnections = {}) => {
  const name = `tracking-migration-${crypto.randomUUID()}`
  databases.push(name)
  const writer = factory(name)
  repositories.push(writer)
  const widget = await writer.addWidget('builtin:ash')
  const defaults = builtinConnectionProfile('builtin:ash')!.connections
  await writer.configureConnections(widget.id, {
    ...defaults,
    trackingBindingsVersion: undefined,
    ...overrides,
  })
  await writer.trackWidget(widget.id, 'cursor')
  await writer.bindWidget(widget.id, {
    ...defaults.trackingBindings,
    headX: {blend: 'overwrite', inverted: false, parameterId: 'old-head'},
  })
  return {id: widget.id, name, writer}
}

/** Delays an actual IndexedDB snapshot before the migration consumes it. */
const delaySnapshot = (name: string) => {
  const taken = Promise.withResolvers<void>()
  const resume = Promise.withResolvers<void>()
  releases.push(resume.resolve)
  let delayed = false
  vi.mocked(createLibraryRepository).mockImplementation((database, options) => {
    const repository = factory(database, options)
    return {
      ...repository,
      read: async () => {
        const snapshot = await repository.read()
        if (database === name && !delayed) {
          delayed = true
          taken.resolve()
          await resume.promise
        }
        return snapshot
      },
    }
  })
  const reader = createBuiltinLibrary(name)
  repositories.push(reader)
  const reading = reader.read()
  operations.push(reading)
  return {reading, resume: resume.resolve, taken: taken.promise}
}

test('should retain edits saved after another reader has finished the tracking migration', async () => {
  const {id, name, writer} = await seed()
  const delayed = delaySnapshot(name)
  await delayed.taken
  const other = createBuiltinLibrary(name)
  repositories.push(other)
  await other.read()
  const changed = {blend: 'overwrite' as const, inverted: true, parameterId: 'new-head'}
  await writer.bindWidget(id, {headX: changed}, 'cursor')
  delayed.resume()
  await delayed.reading
  const saved = (await writer.read()).widgets.find((widget) => widget.id === id)!
  expect(saved.trackingBindingsVersion).toBe(1)
  expect(trackingProfile(saved, 'cursor').bindings?.headX).toEqual(changed)
})

test('should complete a read when its unmigrated widget is removed after the snapshot', async () => {
  const {id, name, writer} = await seed()
  const delayed = delaySnapshot(name)
  await delayed.taken
  await writer.removeWidget(id)
  delayed.resume()
  await expect(delayed.reading).resolves.toMatchObject({widgets: []})
})

const oldVersions: Readonly<Record<string, PoffoConnections>> = {
  agent: {agentBindingsVersion: undefined},
  semantic: {semanticBindingsVersion: undefined},
  touch: {touchBindingsVersion: 12},
}
const editedConnections = (kind: string): PoffoConnections => {
  const defaults = builtinConnectionProfile('builtin:ash')!.connections
  const patches: Readonly<Record<string, PoffoConnections>> = {
    agent: {agentBindings: {working: {parameterId: 'new-agent'}}},
    semantic: {semanticBindings: []},
    touch: {touch: {...defaults.touch!, distance: 333}},
  }
  return patches[kind]!
}

test.each(['touch', 'agent', 'semantic'])(
  'should preserve newer %s choices after a delayed migration',
  async (kind) => {
    const {id, name, writer} = await seed(oldVersions[kind])
    const delayed = delaySnapshot(name)
    await delayed.taken
    const other = createBuiltinLibrary(name)
    repositories.push(other)
    await other.read()
    const patch = editedConnections(kind)
    await writer.configureConnections(id, patch)
    delayed.resume()
    await delayed.reading
    expect((await writer.read()).widgets.find((widget) => widget.id === id)?.speech).toMatchObject(
      patch,
    )
  },
)

test.each(['touch', 'agent', 'semantic'])(
  'should finish reading when a pending %s widget has been removed',
  async (kind) => {
    const {id, name, writer} = await seed(oldVersions[kind])
    const delayed = delaySnapshot(name)
    await delayed.taken
    await writer.removeWidget(id)
    delayed.resume()
    await expect(delayed.reading).resolves.toMatchObject({widgets: []})
  },
)

const MULTI_WIDGET_COUNT = 20
const READ_ROUNDS = 5

test.each([1, MULTI_WIDGET_COUNT])(
  'should migrate %i widgets once with no migration work on repeated reads',
  async (count) => {
    const {name, writer} = await seed()
    const defaults = builtinConnectionProfile('builtin:ash')!.connections
    await Promise.all(
      Array.from({length: count - 1}, async () => {
        const widget = await writer.addWidget('builtin:ash')
        await writer.configureConnections(widget.id, {
          ...defaults,
          trackingBindingsVersion: undefined,
        })
      }),
    )
    let migrations = 0
    let writes = 0
    vi.mocked(createLibraryRepository).mockImplementation((database, options) => {
      const repository = factory(database, options)
      return {
        ...repository,
        migrateConnections: (id, migrate) =>
          repository.migrateConnections(id, (current) => {
            migrations += 1
            const patch = migrate(current)
            if (patch !== undefined) {
              writes += 1
            }
            return patch
          }),
      }
    })
    const reader = createBuiltinLibrary(name)
    const other = createBuiltinLibrary(name)
    repositories.push(reader, other)
    const start = Date.now()
    const [migrated, concurrent] = await Promise.all([reader.read(), other.read()])
    const startup = Date.now() - start
    expect(concurrent.widgets).toEqual(migrated.widgets)
    expect(migrated.widgets).toHaveLength(count)
    expect(migrated.widgets.every((widget) => widget.trackingBindingsVersion === 1)).toBe(true)
    expect(migrations).toBeLessThanOrEqual(count * 2)
    expect(writes).toBe(count)
    const initialized = migrations
    const repeated = Date.now()
    for (let index = 0; index < READ_ROUNDS; index += 1) {
      // Each round observes the preceding round's completed storage reads.
      // eslint-disable-next-line no-await-in-loop
      const snapshots = await Promise.all([reader.read(), other.read()])
      snapshots.forEach((snapshot) => expect(snapshot.widgets).toEqual(migrated.widgets))
    }
    expect(migrations).toBe(initialized)
    expect(writes).toBe(count)
    console.info({count, repeated: Date.now() - repeated, startup})
  },
)
