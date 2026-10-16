/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {encodeWav} from '../../../player/audio/__tests__/support/encode-wav'

import {
  parseDocument,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  serializeDocument,
} from '../../../player'
import {getSelectedBezier, setMotionSettings, setSelectedBezier} from '../motion-settings'
import {MotionSettings} from '../MotionSettings'

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [
    {
      duration: 2,
      id: 'wave',
      tracks: [
        {
          keyframes: [
            {easing: 'bezier', time: 0, value: 0},
            {time: 2, value: 1},
          ],
          kind: 'parameter',
          parameterId: 'p',
        },
      ],
    },
  ],
  parameters: [{defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'P'}],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const selection = {parameterId: 'p', time: 0, times: [0]}

describe('motion settings', () => {
  test('should drop empty names and events and keep events ordered within the motion', () => {
    const document = setMotionSettings(createDocument(), 'wave', {
      events: [
        {time: 5, value: 'late'},
        {time: 0.5, value: 'early'},
      ],
      fadeInTime: 0.3,
      name: '  인사 ',
    })!
    expect(document.motions[0]).toMatchObject({
      events: [
        {time: 0.5, value: 'early'},
        {time: 2, value: 'late'},
      ],
      fadeInTime: 0.3,
      name: '인사',
    })
    const cleared = setMotionSettings(document, 'wave', {events: [], name: ''})!
    expect(cleared.motions[0]).not.toHaveProperty('events')
    expect(cleared.motions[0]).not.toHaveProperty('name')
    expect(parseDocument(serializeDocument(document)).ok).toBe(true)
  })

  test('should show default Bezier handles and store edited ones', () => {
    const document = createDocument()
    expect(getSelectedBezier(document.motions[0], selection)).toEqual([1 / 3, 0, 2 / 3, 1])
    const edited = setSelectedBezier(document, document.motions[0], selection, [1.4, 2, 0.5, -1])!
    expect(getSelectedBezier(edited.motions[0], selection)).toEqual([1, 2, 0.5, -1])
    expect(parseDocument(serializeDocument(edited)).ok).toBe(true)
    expect(getSelectedBezier(document.motions[0], {...selection, time: 2})).toBeUndefined()
  })

  test('should edit looping, fades and events from the popover', async () => {
    const [document, setDocument] = createSignal(createDocument())
    render(() => (
      <MotionSettings
        currentTime={1.25}
        document={document()}
        motion={document().motions[0]}
        selection={selection}
        onDocumentChange={setDocument}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: '모션 설정'}))
    fireEvent.click(await screen.findByRole('checkbox', {name: '반복 재생'}))
    fireEvent.input(screen.getByRole('spinbutton', {name: '모션 페이드 아웃(초)'}), {
      target: {value: '0.4'},
    })
    fireEvent.click(screen.getByRole('button', {name: /현재 시간에 이벤트 추가/}))

    expect(document().motions[0]).toMatchObject({
      events: [{time: 1.25, value: 'event'}],
      fadeOutTime: 0.4,
      loop: false,
    })
    expect(screen.getByRole('spinbutton', {name: '핸들 1 시간'})).toBeDefined()
  })

  test('should add, replace with a checked WAV and remove the motion sound', async () => {
    const [document, setDocument] = createSignal(createDocument())
    render(() => (
      <MotionSettings
        currentTime={0}
        document={document()}
        motion={document().motions[0]}
        selection={null}
        onDocumentChange={setDocument}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: '모션 설정'}))
    expect(await screen.findByText('없음')).toBeDefined()
    const input = screen.getByLabelText('모션 소리 WAV 파일')
    // jsdom's File has no arrayBuffer().
    const file = (bytes: Uint8Array, name: string) =>
      Object.assign(new File([bytes.slice()], name), {
        arrayBuffer: async () => bytes.slice().buffer,
      })
    const wav = encodeWav({channels: [new Float64Array(4000)], sampleRate: 8000})
    fireEvent.change(input, {target: {files: [file(wav, 'talk.wav')]}})
    expect(await screen.findByText('WAV 0.50초')).toBeDefined()
    expect(document().motions[0]?.sound?.src).toMatch(/^data:audio\/wav;base64,UklGR/u)
    expect(parseDocument(serializeDocument(document())).ok).toBe(true)

    fireEvent.change(input, {target: {files: [file(new Uint8Array(16), 'talk.mp3')]}})
    expect((await screen.findByRole('alert')).textContent).toBe('WAV 파일이 아닙니다.')
    expect(screen.getByText('WAV 0.50초')).toBeDefined()

    fireEvent.click(screen.getByRole('button', {name: '소리 빼기'}))
    expect(document().motions[0]).not.toHaveProperty('sound')
  })
})
