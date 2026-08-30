/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {
  type ModelDownloadController,
  type ModelDownloadRuntime,
  PModelDownloadProvider,
  useModelDownload,
} from '../../../features/model-download'
import type {WeatherLocation} from '../../../features/weather'
import {SceneToolbar} from '../Toolbar'

vi.mock('../../PSelect', () => ({PSelect: () => null}))
vi.mock('../LearningPanel', () => ({LearningPanel: () => null}))
vi.mock('../SettingsPanel', () => ({SceneSettingsPanel: () => null}))

const seoulLocation = {
  country: '대한민국',
  id: 'openweather:legacy:seoul',
  legacyCitySlug: 'seoul',
  name: '서울',
  region: '서울특별시',
} as const satisfies WeatherLocation

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
  onWeatherEnabledChange: vi.fn(),
  onWeatherLocationChange: vi.fn(),
  onWeatherSceneModeChange: vi.fn(),
  sceneStyle: 'original' as const,
  screenSaverDelay: 'off' as const,
  timeMode: 'auto' as const,
  weatherEnabled: true,
  weatherLocation: seoulLocation,
  weatherSceneMode: 'auto' as const,
  weatherState: {location: seoulLocation, status: 'loading' as const},
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

  return download
}

it('should place download progress immediately after weather in the active scene toolbar', () => {
  const download = renderToolbar()
  download.startTextModel('gemma-4-e2b')

  const statuses = screen.getAllByRole('status')
  expect(statuses).toHaveLength(2)
  expect(statuses[0]?.textContent).toContain('서울')
  expect(statuses[1]?.textContent).toContain('Gemma 4 E2B 모델 받는 중')
})
