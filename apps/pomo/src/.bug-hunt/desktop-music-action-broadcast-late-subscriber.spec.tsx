/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useDesktopMode, useDesktopSceneSettingsListener} from '../features/desktop-mode'
import {usePSceneStyle} from '../features/focus-room-animation'
import {usePDisplayPreferences} from '../features/focus-room-display-preferences'
import {createDesktopMusicActionChannel} from '../features/desktop-mode/desktop-music-actions'
import {DesktopPlayer} from '../components/desktop-surface/Player'

const playerActions = vi.hoisted(() => ({pause: vi.fn(), play: vi.fn()}))

vi.mock('../features/focus-room-display-preferences', () => ({
  usePDisplayPreferences: vi.fn(),
}))

vi.mock('@solidjs/meta', () => ({Title: (props: {readonly children?: unknown}) => props.children}))
vi.mock('../features/focus-room-animation', () => ({
  supportsPSceneGyroscope: vi.fn(),
  usePSceneStyle: vi.fn(),
}))
vi.mock('../features/desktop-mode', () => ({
  useDesktopMode: vi.fn(),
  useDesktopSceneSettingsListener: vi.fn(),
  useDesktopSceneSettingsPublisher: vi.fn(),
  useDesktopSurfaceSize: vi.fn(),
}))
vi.mock('../components/p-music-player/PMusicPlayer', () => ({
  PMusicPlayer: vi.fn((props) => {
    props.onPlaybackActionsReady?.(playerActions)
    return <div>플레이어</div>
  }),
}))

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = []
  readonly close = vi.fn()
  readonly listeners: Array<(event: MessageEvent) => void> = []

  constructor(readonly name: string) {
    TestBroadcastChannel.instances.push(this)
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener)
  }

  removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
    const index = this.listeners.indexOf(listener)
    if (index >= 0) {
      this.listeners.splice(index, 1)
    }
  }

  postMessage(data: unknown) {
    for (const channel of TestBroadcastChannel.instances) {
      if (channel.name !== this.name) {
        continue
      }

      for (const listener of channel.listeners) {
        listener(new MessageEvent('message', {data}))
      }
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  TestBroadcastChannel.instances = []
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
  vi.mocked(useDesktopMode).mockReturnValue({
    error: () => null,
    isChanging: () => false,
    mode: () => 'desktop',
    onModeChange: vi.fn().mockResolvedValue(undefined),
  })
  vi.mocked(usePSceneStyle).mockReturnValue({
    isReady: () => true,
    onSceneStyleChange: vi.fn(),
    sceneStyle: () => 'original' as const,
  })
  vi.mocked(usePDisplayPreferences).mockReturnValue({
    dialogueComposerVisible: () => false,
    featureRequestVisible: () => true,
    isReady: () => true,
    memoryAssistVisible: () => true,
    onDialogueComposerVisibleChange: vi.fn(),
    onFeatureRequestVisibleChange: vi.fn(),
    onMemoryAssistVisibleChange: vi.fn(),
    onPlayerVisibleChange: vi.fn(),
    onPomodoroVisibleChange: vi.fn(),
    onToolsButtonVisibleChange: vi.fn(),
    onTourButtonVisibleChange: vi.fn(),
    playerVisible: () => true,
    pomodoroVisible: () => true,
    toolsButtonVisible: () => true,
    tourButtonVisible: () => true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should apply a wallpaper music action sent before the desktop player subscribes', async () => {
  const sender = createDesktopMusicActionChannel()
  if (sender === null) {
    throw new Error('BroadcastChannel is required for this repro.')
  }

  sender.postMessage({actionId: 'music-stop'})

  render(() => <DesktopPlayer />)

  await waitFor(() => expect(playerActions.pause).toHaveBeenCalledTimes(1))
})
