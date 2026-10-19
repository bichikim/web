// oxlint-disable no-await-in-loop -- Flush chained asynchronous pipeline checkpoints in order.
import {expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {createReadout} from '../readout'
import {spokenText} from '../text'

const voice = {...DEFAULT_POFFO_VOICE, enabled: true}
const message = {chat: 'first', id: '1', text: '첫 문장입니다.'}
const flush = async () => {
  for (let pass = 0; pass < 12; pass += 1) {
    await Promise.resolve()
  }
}
const fixture = () => {
  const pending: Array<{signal: AbortSignal; done: () => void}> = []
  const prepare = vi.fn().mockResolvedValue({sampleRate: 24_000, samples: Float32Array.of(0.1)})
  const play = vi.fn(
    (_, __, signal: AbortSignal) =>
      new Promise<void>((resolve) => {
        pending.push({done: resolve, signal})
      }),
  )
  const port = {dispose: vi.fn(), play, prepare}
  const onError = vi.fn()
  const onStatus = vi.fn()
  return {onError, onStatus, pending, port, reader: createReadout({onError, onStatus, port})}
}
it('should generate separate list items and append a new item without repeating completed items', async () => {
  const test = fixture()
  const text = spokenText('준비물\n- 사과 `3개`\n- 우유')
  test.reader.update({...message, text}, voice)
  await flush()
  expect(test.port.prepare.mock.calls.map(([chunk]) => chunk)).toEqual([
    '준비물',
    '사과 3개',
    '우유',
  ])
  test.pending[0].done()
  await flush()
  test.pending[1].done()
  await flush()
  test.pending[2].done()
  await flush()
  test.reader.update({...message, text: spokenText('준비물\n- 사과 `3개`\n- 우유\n- 빵')}, voice)
  await flush()
  expect(test.port.prepare.mock.calls.map(([chunk]) => chunk)).toEqual([
    '준비물',
    '사과 3개',
    '우유',
    '빵',
  ])
  test.pending[3].done()
  await flush()
  expect(test.onStatus).toHaveBeenLastCalledWith('idle')
  expect(test.onError).not.toHaveBeenCalled()
  test.reader.dispose()
})

it('should play streamed samples before synthesis completes and mark the text read only after playback', async () => {
  const test = fixture()
  const generated = Promise.withResolvers<{sampleRate: number; samples: Float32Array}>()
  const audio = {sampleRate: 48000, samples: Float32Array.of(0.1)}
  test.port.prepare.mockImplementationOnce((_, __, ___, observer) => {
    observer.audio(audio)
    observer.audio(audio)
    return generated.promise
  })
  test.reader.update(message, {...voice, provider: 'chatgpt'})
  await flush()
  expect(test.port.play).toHaveBeenCalledTimes(2)
  expect(test.onStatus).toHaveBeenLastCalledWith('playing')
  generated.resolve(audio)
  await flush()
  expect(test.port.play).toHaveBeenCalledTimes(2)
  test.pending[0].done()
  test.pending[1].done()
  await flush()
  test.reader.update(message, {...voice, provider: 'chatgpt'})
  await flush()
  expect(test.port.prepare).toHaveBeenCalledOnce()
  test.reader.dispose()
})
it('should retry unread prose after synthesis failure without replaying completed content', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  test.pending[0].done()
  await flush()
  test.port.prepare.mockRejectedValueOnce(new Error('silent'))
  test.reader.update({...message, id: '2', text: '실패한 문장입니다.'}, voice)
  await flush()
  test.reader.retry()
  await flush()
  expect(test.port.prepare.mock.calls.map(([text]) => text)).toEqual([
    '첫 문장입니다.',
    '실패한 문장입니다.',
    '실패한 문장입니다.',
  ])
  expect(test.pending).toHaveLength(2)
  test.reader.dispose()
})
it('should generate and queue new content while the previous message is still playing', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  test.reader.update({...message, id: '2', text: '새 응답입니다.'}, voice)
  await flush()
  expect(test.pending).toHaveLength(2)
  expect(test.pending[0].signal.aborted).toBe(false)
  expect(test.port.prepare.mock.calls.map(([text]) => text)).toEqual([
    '첫 문장입니다.',
    '새 응답입니다.',
  ])
  test.reader.update({...message, id: '3', text: '세 번째입니다.'}, voice)
  await flush()
  expect(test.port.prepare).toHaveBeenCalledTimes(3)
  expect(test.pending).toHaveLength(3)
  test.pending[0].done()
  await flush()
  expect(test.port.prepare.mock.calls[2][0]).toBe('세 번째입니다.')
  test.reader.dispose()
})
it('should prefetch the next chunk and only remember chunks after playback completes', async () => {
  const test = fixture()
  test.reader.update({...message, text: '긴 문장입니다. '.repeat(30)}, voice)
  await flush()
  expect(test.port.prepare).toHaveBeenCalledTimes(2)
  test.pending[0].done()
  await flush()
  test.reader.update({chat: 'second', id: '2', text: '다른 채팅'}, voice)
  expect(test.pending[1].signal.aborted).toBe(true)
  await flush()
  test.reader.update({...message, text: '긴 문장입니다. '.repeat(30)}, voice)
  await flush()
  expect(test.port.prepare.mock.calls.at(-1)![0]).toBe(test.port.prepare.mock.calls[1][0])
  test.reader.dispose()
})
it('should abort immediately and ignore a late completion from the previous bubble', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  test.reader.update({chat: 'second', id: '2', text: '다른 채팅입니다.'}, voice)
  expect(test.pending[0].signal.aborted).toBe(true)
  await flush()
  test.pending[0].done()
  await flush()
  expect(test.onStatus).toHaveBeenLastCalledWith('playing')
  test.pending[1].done()
  await flush()
  test.reader.update(message, voice)
  await flush()
  expect(test.port.prepare).toHaveBeenCalledTimes(3)
  test.reader.dispose()
  expect(test.pending[2].signal.aborted).toBe(true)
})
it('should remember completed content but read an identical new notification', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  test.pending[0].done()
  await flush()
  test.reader.update(null, voice)
  test.reader.update(message, voice)
  await flush()
  expect(test.port.prepare).toHaveBeenCalledOnce()
  test.reader.update({...message, id: 'next-turn'}, voice)
  await flush()
  expect(test.port.prepare).toHaveBeenCalledTimes(2)
  test.reader.dispose()
})
it('should prefetch appended prose without restarting the current chunk', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  test.reader.update({...message, text: `${message.text} 추가 내용입니다.`}, voice)
  await flush()
  expect(test.pending[0].signal.aborted).toBe(false)
  expect(test.port.prepare.mock.calls[1][0]).toBe('추가 내용입니다.')
  test.pending.forEach((item) => item.done())
  await flush()
  test.reader.update({...message, text: `${message.text} 추가 내용입니다.`}, voice)
  await flush()
  expect(test.port.prepare).toHaveBeenCalledTimes(2)
  test.reader.dispose()
})
it('should stop disabled speech and surface generation failure without waiting for ongoing playback', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  test.port.prepare.mockRejectedValueOnce(new Error('download failed'))
  test.reader.update({...message, id: '2', text: '새 내용'}, voice)
  await flush()
  expect(test.onError).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({message: 'download failed'}),
  )
  expect(test.pending[0].signal.aborted).toBe(true)
  test.reader.update(message, voice)
  await flush()
  test.reader.update(message, {...voice, enabled: false})
  expect(test.pending.at(-1)!.signal.aborted).toBe(true)
  test.reader.dispose()
})

it('should cancel generation and replay the unread chunk through the newly selected provider', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  const previous = test.pending[0]
  test.reader.update(message, {...voice, provider: 'chatgpt'})
  expect(previous.signal.aborted).toBe(true)
  await flush()
  expect(test.port.prepare).toHaveBeenLastCalledWith(
    message.text,
    expect.objectContaining({provider: 'chatgpt'}),
    expect.any(AbortSignal),
    expect.objectContaining({audio: expect.any(Function), status: expect.any(Function)}),
  )
  expect(test.pending[1].signal.aborted).toBe(false)
  test.reader.dispose()
})
