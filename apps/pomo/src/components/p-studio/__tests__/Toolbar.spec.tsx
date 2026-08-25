/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {
  type ModelDownloadController,
  type ModelDownloadRuntime,
  PModelDownloadProvider,
  useModelDownload,
} from '../../../features/model-download'
import {SceneToolbar} from '../Toolbar'

vi.mock('../../PSelect', () => ({PSelect: () => null}))
vi.mock('../SettingsPanel', () => ({SceneSettingsPanel: () => null}))

const createToolbarProps = () => ({
  activity: 'reading' as const,
  gaze: 'focused' as const,
  isSceneTransitioning: false,
  motionInput: 'drag' as const,
  motionMode: 'depth' as const,
  onActivityChange: vi.fn(),
  onGazeChange: vi.fn(),
  onMotionInputChange: vi.fn(),
  onMotionModeChange: vi.fn(),
  onSceneStyleChange: vi.fn(),
  onScreenSaverDelayChange: vi.fn(),
  onTimeModeChange: vi.fn(),
  onWeatherCityChange: vi.fn(),
  onWeatherEnabledChange: vi.fn(),
  sceneStyle: 'original' as const,
  screenSaverDelay: 'off' as const,
  time: 'day' as const,
  timeMode: 'auto' as const,
  weatherCitySlug: 'seoul' as const,
  weatherEnabled: true,
  weatherState: {citySlug: 'seoul' as const, status: 'loading' as const},
})

const renderToolbar = () => {
  let download: ModelDownloadController | undefined
  const dispose = vi.fn()
  const runtime: ModelDownloadRuntime = {
    createTextClient: vi.fn(() => ({dispose, prepare: vi.fn()})),
    createVoiceClient: vi.fn(() => {
      throw new Error('음성 client를 만들면 안 됩니다.')
    }),
  }
  const CaptureToolbar = () => {
    download = useModelDownload()
    return <SceneToolbar {...createToolbarProps()} />
  }
  render(() => (
    <PModelDownloadProvider runtime={runtime}>
      <CaptureToolbar />
    </PModelDownloadProvider>
  ))

  if (download === undefined) {
    throw new Error('모델 다운로드 controller가 준비되지 않았습니다.')
  }

  return {dispose, download}
}

it('should place download progress immediately after weather in the active scene toolbar', () => {
  const {download} = renderToolbar()
  download.startTextModel('gemma-4-e2b')

  const statuses = screen.getAllByRole('status')
  expect(statuses).toHaveLength(2)
  expect(statuses[0]?.textContent).toContain('서울')
  expect(statuses[1]?.textContent).toContain('Gemma 4 E2B 모델 받는 중')
})
