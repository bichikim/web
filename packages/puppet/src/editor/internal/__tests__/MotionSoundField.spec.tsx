/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'

import {MotionSoundField} from '../MotionSoundField'
import {type MotionSoundFileResult, readMotionSoundFile} from '../motion-sound-file'

vi.mock('../motion-sound-file', () => ({
  getEmbeddedSoundDuration: vi.fn(),
  readMotionSoundFile: vi.fn(),
}))
afterEach(() => vi.resetAllMocks())

const pendingRead = () => {
  let finish: (result: MotionSoundFileResult) => void = () => undefined
  const completion = new Promise<MotionSoundFileResult>((resolve) => {
    finish = resolve
  })
  vi.mocked(readMotionSoundFile).mockReturnValue(completion)
  return {completion, finish}
}

const choose = () =>
  fireEvent.change(screen.getByLabelText('모션 소리 WAV 파일'), {
    target: {files: [new File(['wav'], 'sound.wav', {type: 'audio/wav'})]},
  })

test('should discard a pending sound after the user removes it', async () => {
  const pending = pendingRead()
  const onChange = vi.fn()
  render(() => <MotionSoundField disabled={false} sound={{src: 'old.wav'}} onChange={onChange} />)
  choose()
  fireEvent.click(screen.getByRole('button', {name: '소리 빼기'}))
  pending.finish({duration: 1, ok: true, src: 'late.wav'})
  await pending.completion
  expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined)
})

test('should discard a pending sound after its field is unmounted', async () => {
  const pending = pendingRead()
  const onChange = vi.fn()
  const view = render(() => <MotionSoundField disabled={false} onChange={onChange} />)
  choose()
  view.unmount()
  pending.finish({duration: 1, ok: true, src: 'late.wav'})
  await pending.completion
  expect(onChange).not.toHaveBeenCalled()
})

test('should not apply a pending sound to a different selected motion', async () => {
  const pending = pendingRead()
  const [motionId, setMotionId] = createSignal('first')
  const onChange = vi.fn()
  render(() => <MotionSoundField disabled={false} motionId={motionId()} onChange={onChange} />)
  choose()
  setMotionId('second')
  pending.finish({duration: 1, ok: true, src: 'first.wav'})
  await pending.completion
  expect(onChange).not.toHaveBeenCalled()
})

test('should apply the completed sound while its selected motion is still active', async () => {
  const pending = pendingRead()
  const onChange = vi.fn()
  render(() => <MotionSoundField disabled={false} motionId="first" onChange={onChange} />)
  choose()
  pending.finish({duration: 1, ok: true, src: 'first.wav'})
  await pending.completion
  expect(onChange).toHaveBeenCalledExactlyOnceWith({src: 'first.wav'})
})
