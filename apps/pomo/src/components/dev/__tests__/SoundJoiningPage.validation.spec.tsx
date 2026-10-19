/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {A} from '@solidjs/router'
import {Title} from '@solidjs/meta'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {SoundJoiningPage} from '../SoundJoiningPage'
import {ModelTerms} from '../sound-generation/ModelTerms'
import {createSoundWorker} from 'src/features/sound-generation/create-sound-worker'

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('../sound-generation/ModelTerms', () => ({ModelTerms: vi.fn()}))
vi.mock('src/features/sound-generation/create-sound-worker', () => ({createSoundWorker: vi.fn()}))

const SAMPLE_RATE = 44_100
const audioContextConstructor = vi.fn()
const closeAudioContext = vi.fn(async () => {})
const decodeAudioData = vi.fn(async () => createAudioBuffer())

class TestAudioContext {
  constructor() {
    audioContextConstructor()
  }

  close = closeAudioContext
  decodeAudioData = decodeAudioData
}

const createAudioBuffer = (): AudioBuffer => {
  const channel = new Float32Array(6 * SAMPLE_RATE)
  return {
    duration: 6,
    getChannelData: vi.fn(() => channel),
    numberOfChannels: 2,
  } as unknown as AudioBuffer
}

const createFile = (name: string) => {
  const file = new File(['audio'], name, {type: 'audio/wav'})
  Object.defineProperty(file, 'arrayBuffer', {value: vi.fn(async () => new ArrayBuffer(1))})
  return file
}

const selectFiles = () => {
  const first = createFile('first.wav')
  const second = createFile('second.wav')
  fireEvent.change(screen.getByLabelText('첫 번째 오디오'), {target: {files: [first]}})
  fireEvent.change(screen.getByLabelText('두 번째 오디오'), {target: {files: [second]}})
}

beforeEach(() => {
  vi.mocked(A).mockImplementation((props) => props.children)
  vi.mocked(Title).mockImplementation(() => null)
  vi.mocked(ModelTerms).mockImplementation(() => null)
  vi.mocked(createSoundWorker).mockReset()
  audioContextConstructor.mockReset()
  closeAudioContext.mockReset()
  decodeAudioData.mockReset()
  decodeAudioData.mockImplementation(async () => createAudioBuffer())
  vi.stubGlobal('AudioContext', TestAudioContext)
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:source'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it.each([
  {
    fieldName: '첫 번째 끝에서 자르기 (초)',
    otherFieldName: '두 번째 시작에서 자르기 (초)',
  },
  {
    fieldName: '두 번째 시작에서 자르기 (초)',
    otherFieldName: '첫 번째 끝에서 자르기 (초)',
  },
])(
  'should block an empty $fieldName field and recover on the same mount',
  ({fieldName, otherFieldName}) => {
    render(() => <SoundJoiningPage />)
    selectFiles()

    const field = screen.getByRole('spinbutton', {name: fieldName})
    const button = screen.getByRole('button', {name: 'AI로 연결하기'})
    fireEvent.input(field, {target: {value: ''}})

    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(audioContextConstructor).not.toHaveBeenCalled()
    expect(decodeAudioData).not.toHaveBeenCalled()
    expect(createSoundWorker).not.toHaveBeenCalled()

    fireEvent.input(field, {target: {value: '0'}})
    expect(field).toHaveValue(0)
    const otherField = screen.getByRole('spinbutton', {name: otherFieldName})
    fireEvent.input(otherField, {target: {value: '0'}})
    expect(otherField).toHaveValue(0)
    expect(button).toBeEnabled()
  },
)
