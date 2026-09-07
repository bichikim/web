import {LOCALE_RESET_STORAGE_COUNT, resetLocale as resetLocaleStorage} from '../locale'

interface OptionResetGroupDefinitionBase {
  readonly description: string
  readonly id: OptionResetGroupId
  readonly label: string
}

interface StorageOptionResetGroupDefinition extends OptionResetGroupDefinitionBase {
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

export interface OptionResetStorage {
  readonly getNative: (key: string) => Promise<string | null>
  readonly isNative: () => boolean
  readonly removeNative: (key: string) => Promise<void>
  readonly removeWeb: (key: string) => void
  readonly setNative: (key: string, value: string) => Promise<void>
  readonly setWeb: (key: string, value: string) => void
}

interface CreateOptionResetManagerOptions {
  readonly resetLocale: () => Promise<void>
  readonly storage: OptionResetStorage
}

interface NativeSnapshot {
  readonly key: string
  readonly value: string | null
}

interface NativeOptionResetStorage {
  readonly getItem: (key: string) => Promise<string | null>
  readonly removeItem: (key: string) => Promise<void>
  readonly setItem: (key: string, value: string) => Promise<void>
}

interface NativeReadResult {
  readonly snapshots: ReadonlyArray<NativeSnapshot>
  readonly unresolvedKeys: ReadonlyArray<string>
}

const COMPLETE_RESET_RESULT: CompleteOptionResetResult = {status: 'complete'}
let nativeStoragePromise: Promise<NativeOptionResetStorage> | null = null

const loadNativeStorage = (): Promise<NativeOptionResetStorage> => {
  nativeStoragePromise ??= import('@apps-in-toss/web-framework').then(({Storage}) => Storage)
  return nativeStoragePromise
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
    description: '행동·시선·시간·날씨·장면 스타일과 화면 보호기 설정',
    id: 'focus-room',
    label: '집중 공간',
    storageKeys: [
      'pomo:focus-room-scene-preferences:v1',
      'pomo:focus-room-scene-style:v1',
      'pomo:weather-preference:v2',
      'pomo:weather-preference:v1',
      'pomo:screen-saver-delay:v1',
    ],
  },
  {
    description: '집중·휴식 시간과 자동 시작 설정',
    id: 'timer',
    label: '타이머',
    storageKeys: ['pomo:timer-config:v1', 'pomo:timer-auto-start:v2', 'pomo:timer-auto-start:v1'],
  },
  {
    description: '자동 대화·랜덤 이벤트와 대화 중 음악 음량 설정',
    id: 'dialogue',
    label: '대화',
    storageKeys: [
      'pomo:automatic-dialogue-settings:v1',
      'pomo:random-event-settings:v1',
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
    storageKeys: ['pomo:desktop-mode:v1', 'pomo:desktop-clean-exit:v1'],
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

const getAllKeys = (): ReadonlyArray<string> => [
  ...new Set(
    GROUP_DEFINITIONS.flatMap((group) => (group.resetKind === 'locale' ? [] : group.storageKeys)),
  ),
]

const readNativeSnapshots = (
  storage: OptionResetStorage,
  keys: ReadonlyArray<string>,
): Promise<ReadonlyArray<NativeSnapshot>> =>
  Promise.all(
    keys.map(async (key) => ({
      key,
      value: await storage.getNative(key),
    })),
  )

const restoreNativeSnapshots = async (
  storage: OptionResetStorage,
  snapshots: ReadonlyArray<NativeSnapshot>,
): Promise<boolean> => {
  const restorationResults = await Promise.allSettled(
    snapshots
      .filter(
        (snapshot): snapshot is NativeSnapshot & {readonly value: string} =>
          snapshot.value !== null,
      )
      .toReversed()
      .map((snapshot) => storage.setNative(snapshot.key, snapshot.value)),
  )

  return restorationResults.every((result) => result.status === 'fulfilled')
}

const readAvailableNativeSnapshots = async (
  storage: OptionResetStorage,
  keys: ReadonlyArray<string>,
): Promise<NativeReadResult> => {
  const readResults = await Promise.allSettled(
    keys.map(async (key) => ({key, value: await storage.getNative(key)})),
  )
  const snapshots: Array<NativeSnapshot> = []
  const unresolvedKeys: Array<string> = []

  for (const [index, readResult] of readResults.entries()) {
    const key = keys[index]
    if (key === undefined) {
      throw new Error('Native storage read result has no matching key.')
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
  snapshots: ReadonlyArray<NativeSnapshot>,
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

const recoverNativeDeletion = async (
  storage: OptionResetStorage,
  attemptedSnapshots: ReadonlyArray<NativeSnapshot>,
  originalSnapshots: ReadonlyArray<NativeSnapshot>,
  deletionError: unknown,
): Promise<OptionResetResult> => {
  const isRestored = await restoreNativeSnapshots(storage, attemptedSnapshots)
  if (isRestored) {
    throw deletionError
  }

  const currentRead = await readAvailableNativeSnapshots(
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

const removeNativeKeys = async (
  storage: OptionResetStorage,
  keys: ReadonlyArray<string>,
): Promise<OptionResetResult> => {
  const originalSnapshots = await readNativeSnapshots(storage, keys)
  const attemptedSnapshots: Array<NativeSnapshot> = []

  try {
    for (const snapshot of originalSnapshots) {
      attemptedSnapshots.push(snapshot)
      // Deletions stay serial so a failure has a bounded rollback set.
      // eslint-disable-next-line no-await-in-loop
      await storage.removeNative(snapshot.key)
    }
  } catch (error) {
    return recoverNativeDeletion(storage, attemptedSnapshots, originalSnapshots, error)
  }

  return COMPLETE_RESET_RESULT
}

const removeKeys = async (
  storage: OptionResetStorage,
  keys: ReadonlyArray<string>,
): Promise<OptionResetResult> => {
  if (storage.isNative()) {
    const nativeResult = await removeNativeKeys(storage, keys)
    if (nativeResult.status === 'partial') {
      return nativeResult
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

    return resetKeys(group.storageKeys)
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
      }),
  }
}

const runtimeStorage: OptionResetStorage = {
  async getNative(key) {
    const storage = await loadNativeStorage()
    return storage.getItem(key)
  },
  isNative: () => 'ReactNativeWebView' in window,
  async removeNative(key) {
    const storage = await loadNativeStorage()
    await storage.removeItem(key)
  },
  removeWeb: (key) => localStorage.removeItem(key),
  async setNative(key, value) {
    const storage = await loadNativeStorage()
    await storage.setItem(key, value)
  },
  setWeb: (key, value) => localStorage.setItem(key, value),
}

const runtimeLocaleStorage = {
  removeCookie: (cookie: string) => {
    document.cookie = cookie
  },
  removeWeb: runtimeStorage.removeWeb,
}

export const createRuntimeOptionResetManager = (): OptionResetManager =>
  createOptionResetManager({
    resetLocale: () => resetLocaleStorage(runtimeLocaleStorage),
    storage: runtimeStorage,
  })
