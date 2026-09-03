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

export interface OptionResetManager {
  readonly reset: (groupId: OptionResetGroupId) => Promise<void>
  readonly resetAll: () => Promise<void>
}

export interface OptionResetStorage {
  readonly isNative: () => boolean
  readonly removeNative: (key: string) => Promise<void>
  readonly removeWeb: (key: string) => void
}

interface CreateOptionResetManagerOptions {
  readonly resetLocale: () => Promise<void>
  readonly storage: OptionResetStorage
}

const withResetError = async (operation: () => Promise<void>): Promise<void> => {
  try {
    await operation()
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

export const createOptionResetManager = (
  options: CreateOptionResetManagerOptions,
): OptionResetManager => {
  const removeKeys = async (keys: ReadonlyArray<string>): Promise<void> => {
    if (options.storage.isNative()) {
      await Promise.all(keys.map((key) => options.storage.removeNative(key)))
    }

    for (const key of keys) {
      options.storage.removeWeb(key)
    }
  }

  const resetKeys = (keys: ReadonlyArray<string>): Promise<void> =>
    withResetError(() => removeKeys(keys))

  const resetLocale = (): Promise<void> => withResetError(options.resetLocale)

  const resetGroup = async (group: OptionResetGroupDefinition): Promise<void> => {
    if (group.resetKind === 'locale') {
      await resetLocale()
      return
    }

    await resetKeys(group.storageKeys)
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
        await removeKeys(getAllKeys())
        await options.resetLocale()
      }),
  }
}

const runtimeStorage: OptionResetStorage = {
  isNative: () => 'ReactNativeWebView' in window,
  async removeNative(key) {
    const {Storage} = await import('@apps-in-toss/web-framework')
    await Storage.removeItem(key)
  },
  removeWeb: (key) => localStorage.removeItem(key),
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
