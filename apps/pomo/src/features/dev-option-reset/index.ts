import {uniq} from 'es-toolkit/array'
export {
  deleteStoredDialogueAudio,
  type DialogueAudioDeletionResult,
  type DialogueAudioStorage,
} from './delete-stored-dialogue-audio'
import {DISPLAY_PREFERENCES_STORAGE_KEY} from '../focus-room-display-preferences/storage'
import {settleEntryHistoryWrites} from '../focus-room-entry-history'
import {DIALOGUE_DRAFT_KEY_PREFIX} from '../focus-room-dialogue'
import {clearEntryEventPlaybackSession} from '../focus-room-dialogue/use-p-event-controller/entry-playback'
import {LOCALE_RESET_STORAGE_COUNT, resetLocale as resetLocaleStorage} from '../locale'
import {hasNativeStorageBridge} from 'src/utils/runtime-storage'

interface OptionResetGroupDefinitionBase {
  readonly description: string
  readonly id: OptionResetGroupId
  readonly label: string
}

interface StorageOptionResetGroupDefinition extends OptionResetGroupDefinitionBase {
  readonly sessionStoragePrefixes?: ReadonlyArray<string>
  readonly resetKind?: undefined
  readonly storageKeys: ReadonlyArray<string>
}

interface LocaleOptionResetGroupDefinition extends OptionResetGroupDefinitionBase {
  readonly resetKind: 'locale'
  readonly storageKeyCount: number
}

type OptionResetGroupDefinition =
  | LocaleOptionResetGroupDefinition
  | StorageOptionResetGroupDefinition

export type OptionResetGroupId =
  | 'entry'
  | 'desktop'
  | 'dialogue'
  | 'focus-room'
  | 'language'
  | 'playback'
  | 'timer'
  | 'updates'

export interface OptionResetGroup {
  readonly description: string
  readonly id: OptionResetGroupId
  readonly label: string
  readonly storageKeyCount: number
}

export interface CompleteOptionResetResult {
  readonly status: 'complete'
}

export interface PartialOptionResetResult {
  readonly preservedCount: number
  readonly resetCount: number
  readonly status: 'partial'
  readonly unresolvedCount: number
}

export type OptionResetResult = CompleteOptionResetResult | PartialOptionResetResult

export interface OptionResetManager {
  readonly reset: (groupId: OptionResetGroupId) => Promise<OptionResetResult>
  readonly resetAll: () => Promise<OptionResetResult>
}

export interface OptionResetSessionStorageEntry {
  readonly key: string
  readonly value: string
}

export interface OptionResetStorage {
  readonly getToss: (key: string) => Promise<string | null>
  readonly getSessionStorageEntriesByPrefix: (
    prefix: string,
  ) => ReadonlyArray<OptionResetSessionStorageEntry>
  readonly usesTossStorage: () => boolean
  readonly removeToss: (key: string) => Promise<void>
  readonly removeWeb: (key: string) => void
  readonly removeSessionStorageByPrefix: (prefix: string) => void
  readonly setSessionStorageItem: (key: string, value: string) => void
  readonly setToss: (key: string, value: string) => Promise<void>
  readonly setWeb: (key: string, value: string) => void
}

interface CreateOptionResetManagerOptions {
  readonly resetEntrySession: () => void | Promise<void>
  readonly resetLocale: () => Promise<void>
  readonly storage: OptionResetStorage
}

interface TossSnapshot {
  readonly key: string
  readonly value: string | null
}

interface TossOptionResetStorage {
  readonly getItem: (key: string) => Promise<string | null>
  readonly removeItem: (key: string) => Promise<void>
  readonly setItem: (key: string, value: string) => Promise<void>
}

interface TossReadResult {
  readonly snapshots: ReadonlyArray<TossSnapshot>
  readonly unresolvedKeys: ReadonlyArray<string>
}

const COMPLETE_RESET_RESULT: CompleteOptionResetResult = {status: 'complete'}
let tossStoragePromise: Promise<TossOptionResetStorage> | null = null

const loadTossStorage = (): Promise<TossOptionResetStorage> => {
  tossStoragePromise ??= import('@apps-in-toss/web-framework').then(({Storage}) => Storage)
  return tossStoragePromise
}

const withResetError = async <Result>(operation: () => Promise<Result>): Promise<Result> => {
  try {
    return await operation()
  } catch (error) {
    throw new Error('Failed to reset Pomo options.', {cause: error})
  }
}

const GROUP_DEFINITIONS: ReadonlyArray<OptionResetGroupDefinition> = [
  {
    description:
      '첫 입장 이력과 현재 탭의 입장 기록을 지웁니다. Pomofi 화면을 새로 열면 시작 화면과 둘러보기 안내를 다시 볼 수 있어요.',
    id: 'entry',
    label: '첫 입장 안내',
    storageKeys: ['pomo:focus-room-entry-history:v1'],
  },
  {
    description: '행동·시선·시간·날씨·장면 스타일과 화면 보호기 설정',
    id: 'focus-room',
    label: '집중 공간',
    storageKeys: [
      'pomo:focus-room-scene-preferences:v1',
      'pomo:focus-room-scene-preferences:native-write-failure:v1',
      'pomo:focus-room-scene-style:v1',
      'pomo:weather-preference:v2',
      'pomo:weather-preference:v1',
      DISPLAY_PREFERENCES_STORAGE_KEY,
      'pomo:screen-saver-delay:v1',
    ],
  },
  {
    description: '집중·휴식 시간, 자동 시작 설정과 타이머 진행 상태',
    id: 'timer',
    label: '타이머',
    storageKeys: [
      'pomo:timer:v1',
      'pomo:timer-config:v1',
      'pomo:timer-auto-start:v2',
      'pomo:timer-auto-start:v1',
    ],
  },
  {
    description:
      '자동 대화·랜덤 이벤트·지연 종료 시간과 대화 중 음악 음량 설정, 저장하지 않은 대화 초안을 초기화합니다.',
    id: 'dialogue',
    label: '대화',
    sessionStoragePrefixes: [DIALOGUE_DRAFT_KEY_PREFIX],
    storageKeys: [
      'pomo:automatic-dialogue-settings:v1',
      'pomo:random-event-settings:v1',
      'pomo:delayed-end-event-settings:v1',
      'pomo:dialogue-volume-ducking-settings:v2',
      'pomo:dialogue-volume-ducking-settings:v1',
    ],
  },
  {
    description: '마지막 재생 곡·위치·음량 설정',
    id: 'playback',
    label: '음악 재생',
    storageKeys: ['pomo:focus-room-playback:v1'],
  },
  {
    description: '데스크톱 표시 모드와 종료 상태',
    id: 'desktop',
    label: '데스크톱 모드',
    storageKeys: [
      'pomo:desktop-mode:v1',
      'pomo:desktop-clean-exit:v1',
      'pomo:desktop-mode-owner:v1',
    ],
  },
  {
    description: '선택한 화면 언어',
    id: 'language',
    label: '언어',
    resetKind: 'locale',
    storageKeyCount: LOCALE_RESET_STORAGE_COUNT,
  },
  {
    description: 'What’s new 팝업의 마지막 열람 버전',
    id: 'updates',
    label: '업데이트 안내',
    storageKeys: ['pomo:viewed-version-release:v1'],
  },
]

export const OPTION_RESET_GROUPS: ReadonlyArray<OptionResetGroup> = GROUP_DEFINITIONS.map(
  (group) => ({
    description: group.description,
    id: group.id,
    label: group.label,
    storageKeyCount:
      group.resetKind === 'locale' ? group.storageKeyCount : group.storageKeys.length,
  }),
)

const getAllKeys = (): ReadonlyArray<string> =>
  uniq(
    GROUP_DEFINITIONS.flatMap((group) => (group.resetKind === 'locale' ? [] : group.storageKeys)),
  )

const getSessionStoragePrefixes = (group: OptionResetGroupDefinition): ReadonlyArray<string> =>
  group.resetKind === 'locale' ? [] : (group.sessionStoragePrefixes ?? [])

const getAllSessionStoragePrefixes = (): ReadonlyArray<string> =>
  uniq(GROUP_DEFINITIONS.flatMap((group) => getSessionStoragePrefixes(group)))

const removeSessionStoragePrefixes = (
  storage: OptionResetStorage,
  prefixes: ReadonlyArray<string>,
): void => {
  prefixes.forEach((prefix) => storage.removeSessionStorageByPrefix(prefix))
}

const getSessionStorageEntries = (
  storage: OptionResetStorage,
  prefixes: ReadonlyArray<string>,
): ReadonlyArray<OptionResetSessionStorageEntry> =>
  prefixes.flatMap((prefix) => storage.getSessionStorageEntriesByPrefix(prefix))

const restoreSessionStorageEntries = (
  storage: OptionResetStorage,
  entries: ReadonlyArray<OptionResetSessionStorageEntry>,
): void => {
  entries.forEach(({key, value}) => storage.setSessionStorageItem(key, value))
}

const resetWithSessionStorageRollback = async (
  storage: OptionResetStorage,
  prefixes: ReadonlyArray<string>,
  reset: () => Promise<OptionResetResult>,
): Promise<OptionResetResult> => {
  const entries = getSessionStorageEntries(storage, prefixes)
  let resetResult: OptionResetResult

  try {
    removeSessionStoragePrefixes(storage, prefixes)
    resetResult = await reset()
  } catch (error: unknown) {
    try {
      restoreSessionStorageEntries(storage, entries)
    } catch (restoreError: unknown) {
      throw new AggregateError(
        [error, restoreError],
        'Failed to restore session storage after option reset failure.',
      )
    }

    throw error
  }

  if (resetResult.status === 'partial') {
    restoreSessionStorageEntries(storage, entries)
  }

  return resetResult
}

const readTossSnapshots = (
  storage: OptionResetStorage,
  keys: ReadonlyArray<string>,
): Promise<ReadonlyArray<TossSnapshot>> =>
  Promise.all(
    keys.map(async (key) => ({
      key,
      value: await storage.getToss(key),
    })),
  )

const restoreTossSnapshots = async (
  storage: OptionResetStorage,
  snapshots: ReadonlyArray<TossSnapshot>,
): Promise<boolean> => {
  const restorationResults = await Promise.allSettled(
    snapshots
      .filter(
        (snapshot): snapshot is TossSnapshot & {readonly value: string} => snapshot.value !== null,
      )
      .toReversed()
      .map((snapshot) => storage.setToss(snapshot.key, snapshot.value)),
  )

  return restorationResults.every((result) => result.status === 'fulfilled')
}

const readAvailableTossSnapshots = async (
  storage: OptionResetStorage,
  keys: ReadonlyArray<string>,
): Promise<TossReadResult> => {
  const readResults = await Promise.allSettled(
    keys.map(async (key) => ({key, value: await storage.getToss(key)})),
  )
  const snapshots: Array<TossSnapshot> = []
  const unresolvedKeys: Array<string> = []

  for (const [index, readResult] of readResults.entries()) {
    const key = keys[index]
    if (key === undefined) {
      throw new Error('Toss storage read result has no matching key.')
    }

    if (readResult.status === 'fulfilled') {
      snapshots.push(readResult.value)
    } else {
      unresolvedKeys.push(key)
    }
  }

  return {snapshots, unresolvedKeys}
}

const convergeWebStorage = (
  storage: OptionResetStorage,
  snapshots: ReadonlyArray<TossSnapshot>,
  initialUnresolvedKeys: ReadonlyArray<string> = [],
): OptionResetResult => {
  const preservedKeys: Array<string> = []
  const resetKeys: Array<string> = []
  const unresolvedKeys = [...initialUnresolvedKeys]

  for (const snapshot of snapshots) {
    try {
      if (snapshot.value === null) {
        storage.removeWeb(snapshot.key)
        resetKeys.push(snapshot.key)
      } else {
        storage.setWeb(snapshot.key, snapshot.value)
        preservedKeys.push(snapshot.key)
      }
    } catch {
      unresolvedKeys.push(snapshot.key)
    }
  }

  if (preservedKeys.length === 0 && unresolvedKeys.length === 0) {
    return COMPLETE_RESET_RESULT
  }

  return {
    preservedCount: preservedKeys.length,
    resetCount: resetKeys.length,
    status: 'partial',
    unresolvedCount: unresolvedKeys.length,
  }
}

const recoverTossDeletion = async (
  storage: OptionResetStorage,
  attemptedSnapshots: ReadonlyArray<TossSnapshot>,
  originalSnapshots: ReadonlyArray<TossSnapshot>,
  deletionError: unknown,
): Promise<OptionResetResult> => {
  const isRestored = await restoreTossSnapshots(storage, attemptedSnapshots)
  if (isRestored) {
    throw deletionError
  }

  const currentRead = await readAvailableTossSnapshots(
    storage,
    originalSnapshots.map((snapshot) => snapshot.key),
  )
  const matchesOriginal =
    currentRead.unresolvedKeys.length === 0 &&
    currentRead.snapshots.every(
      (snapshot, index) => snapshot.value === originalSnapshots[index]?.value,
    )
  if (matchesOriginal) {
    throw deletionError
  }

  return convergeWebStorage(storage, currentRead.snapshots, currentRead.unresolvedKeys)
}

const removeTossKeys = async (
  storage: OptionResetStorage,
  keys: ReadonlyArray<string>,
): Promise<OptionResetResult> => {
  const originalSnapshots = await readTossSnapshots(storage, keys)
  const attemptedSnapshots: Array<TossSnapshot> = []

  try {
    for (const snapshot of originalSnapshots) {
      attemptedSnapshots.push(snapshot)
      // Deletions stay serial so a failure has a bounded rollback set.
      // eslint-disable-next-line no-await-in-loop
      await storage.removeToss(snapshot.key)
    }
  } catch (error) {
    return recoverTossDeletion(storage, attemptedSnapshots, originalSnapshots, error)
  }

  return COMPLETE_RESET_RESULT
}

const removeKeys = async (
  storage: OptionResetStorage,
  keys: ReadonlyArray<string>,
): Promise<OptionResetResult> => {
  if (storage.usesTossStorage()) {
    const tossResult = await removeTossKeys(storage, keys)
    if (tossResult.status === 'partial') {
      return tossResult
    }

    return convergeWebStorage(
      storage,
      keys.map((key) => ({key, value: null})),
    )
  }

  for (const key of keys) {
    storage.removeWeb(key)
  }

  return COMPLETE_RESET_RESULT
}

export const createOptionResetManager = (
  options: CreateOptionResetManagerOptions,
): OptionResetManager => {
  const resetKeys = (keys: ReadonlyArray<string>): Promise<OptionResetResult> =>
    withResetError(() => removeKeys(options.storage, keys))

  const resetLocale = (): Promise<OptionResetResult> =>
    withResetError(async () => {
      await options.resetLocale()
      return COMPLETE_RESET_RESULT
    })

  const resetGroup = (group: OptionResetGroupDefinition): Promise<OptionResetResult> => {
    if (group.resetKind === 'locale') {
      return resetLocale()
    }

    return withResetError(async () => {
      if (group.id === 'entry') {
        await options.resetEntrySession()
      }
      return resetWithSessionStorageRollback(
        options.storage,
        getSessionStoragePrefixes(group),
        () => resetKeys(group.storageKeys),
      )
    })
  }

  const getGroup = (groupId: OptionResetGroupId): OptionResetGroupDefinition => {
    const group = GROUP_DEFINITIONS.find((candidate) => candidate.id === groupId)

    if (group === undefined) {
      throw new Error(`Unknown option reset group: ${groupId}`)
    }

    return group
  }

  return {
    reset: (groupId) => resetGroup(getGroup(groupId)),
    resetAll: () =>
      withResetError(async () => {
        await options.resetEntrySession()
        return resetWithSessionStorageRollback(
          options.storage,
          getAllSessionStoragePrefixes(),
          async () => {
            const storageResult = await removeKeys(options.storage, getAllKeys())
            if (storageResult.status === 'partial') {
              return {
                ...storageResult,
                preservedCount: storageResult.preservedCount + LOCALE_RESET_STORAGE_COUNT,
              }
            }

            try {
              await options.resetLocale()
            } catch {
              return {
                preservedCount: 0,
                resetCount: getAllKeys().length,
                status: 'partial',
                unresolvedCount: LOCALE_RESET_STORAGE_COUNT,
              }
            }

            return COMPLETE_RESET_RESULT
          },
        )
      }),
  }
}

const runtimeStorage: OptionResetStorage = {
  getSessionStorageEntriesByPrefix: (prefix) => {
    const matchingKeys = Array.from({length: sessionStorage.length}, (_, index) =>
      sessionStorage.key(index),
    ).filter((key): key is string => key !== null && key.startsWith(prefix))
    return matchingKeys.flatMap((key) => {
      const value = sessionStorage.getItem(key)
      return value === null ? [] : [{key, value}]
    })
  },
  async getToss(key) {
    const storage = await loadTossStorage()
    return storage.getItem(key)
  },
  removeSessionStorageByPrefix: (prefix) => {
    const matchingKeys = Array.from({length: sessionStorage.length}, (_, index) =>
      sessionStorage.key(index),
    ).filter((key): key is string => key !== null && key.startsWith(prefix))
    matchingKeys.forEach((key) => sessionStorage.removeItem(key))
  },
  async removeToss(key) {
    const storage = await loadTossStorage()
    await storage.removeItem(key)
  },
  removeWeb: (key) => localStorage.removeItem(key),
  setSessionStorageItem: (key, value) => sessionStorage.setItem(key, value),
  async setToss(key, value) {
    const storage = await loadTossStorage()
    await storage.setItem(key, value)
  },
  setWeb: (key, value) => localStorage.setItem(key, value),
  usesTossStorage: hasNativeStorageBridge,
}

const runtimeLocaleStorage = {
  removeCookie: (cookie: string) => {
    document.cookie = cookie
  },
  removeWeb: runtimeStorage.removeWeb,
}

export const createRuntimeOptionResetManager = (): OptionResetManager =>
  createOptionResetManager({
    resetEntrySession: async () => {
      await settleEntryHistoryWrites()
      sessionStorage.removeItem('pomo:focus-room-entry:v1')
      clearEntryEventPlaybackSession()
    },
    resetLocale: () => resetLocaleStorage(runtimeLocaleStorage),
    storage: runtimeStorage,
  })
