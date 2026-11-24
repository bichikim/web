// oxlint-disable no-await-in-loop -- Flush chained asynchronous pipeline checkpoints in order.
import {expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {createReadout} from '../readout'
import {spokenText} from '../text'

it('should preserve meaning boundaries across small speech chunks and report actual playback starts', async () => {
  const onPlayback = vi.fn()
  const starts: (() => void)[] = []
  const text =
    '실패해서 속상했어요. 자신감도 없었고요. 그래도 다시 도전했고 성공했어요. 정말 기뻐요!'
  const test = fixture()
  test.reader.dispose()
  test.port.play.mockImplementation(
    (_, __, signal, started?: () => void) =>
      new Promise<void>((done) => {
        starts.push(() => started?.())
        test.pending.push({done, signal})
      }),
  )
  const reader = createReadout({
    onError: test.onError,
    onPlayback,
    onStatus: test.onStatus,
    port: test.port,
  })
  reader.update({...message, text}, voice)
  await flush()
  expect(test.port.prepare.mock.calls.map(([chunk]) => chunk)).toEqual([
    '실패해서 속상했어요. 자신감도 없었고요.',
    '그래도 다시 도전했고 성공했어요. 정말 기뻐요!',
  ])
  expect(onPlayback).not.toHaveBeenCalledWith(expect.objectContaining({offset: expect.any(Number)}))
  starts[0]()
  expect(onPlayback).toHaveBeenLastCalledWith({message: {...message, text}, offset: 0})
  starts[1]()
  expect(onPlayback).toHaveBeenLastCalledWith({
    message: {...message, text},
    offset: text.indexOf('그래도'),
  })
  reader.dispose()
})

it('should split a long meaning segment into smaller speech chunks without crossing into its successor', async () => {
  const prose = '원인을 차근차근 살펴보고 설정을 하나씩 확인하면서 '.repeat(3).trim()
  const first = `${prose} 먼저 확인하고 있어요. ${prose} 다시 살펴보고 있어요.`
  const next = '해결했어요! 정말 기뻐요!'
  const test = fixture()
  test.reader.update({...message, text: `${first}\n\n${next}`}, voice)
  await flush()
  const chunks = test.port.prepare.mock.calls.map(([text]) => text)
  expect(chunks.length).toBeGreaterThan(2)
  expect(chunks.at(-1)).toBe(next)
  expect(chunks.slice(0, -1).every((chunk) => first.includes(chunk))).toBe(true)
  test.reader.dispose()
})

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
    (_, __, signal: AbortSignal, _started?: () => void) =>
      new Promise<void>((resolve) => {
        pending.push({done: resolve, signal})
      }),
  )
  const port = {
    dispose: vi.fn(),
    play,
    prepare,
    setPaused: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  }
  const onError = vi.fn()
  const onStatus = vi.fn()
  return {onError, onStatus, pending, port, reader: createReadout({onError, onStatus, port})}
}
it('should cancel the completed audio tail when the selected bubble is cleared', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  test.pending[0].done()
  await flush()
  test.port.stop.mockClear()
  test.reader.update(null, voice)
  expect(test.port.stop).toHaveBeenCalledOnce()
  test.reader.dispose()
})
it('should keep new audio paused and resume the same playback without generating it again', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  await test.reader.toggle()
  expect(test.port.setPaused).toHaveBeenLastCalledWith(true)
  expect(test.onStatus).toHaveBeenLastCalledWith('paused')
  test.reader.update({...message, text: `${message.text}\n새 문장입니다.`}, voice)
  await flush()
  expect(test.onStatus).toHaveBeenLastCalledWith('paused')
  expect(test.port.play).toHaveBeenCalledTimes(2)
  expect(test.pending[0].signal.aborted).toBe(false)
  await test.reader.toggle()
  expect(test.port.setPaused).toHaveBeenLastCalledWith(false)
  expect(test.onStatus).toHaveBeenLastCalledWith('playing')
  expect(test.port.prepare).toHaveBeenCalledTimes(2)
  expect(test.port.play).toHaveBeenCalledTimes(2)
  test.reader.dispose()
})
it('should pause during synthesis and discard the pause when switching chats', async () => {
  const test = fixture()
  const generated = Promise.withResolvers<{sampleRate: number; samples: Float32Array}>()
  test.port.prepare.mockReturnValueOnce(generated.promise)
  test.reader.update(message, voice)
  await test.reader.toggle()
  generated.resolve({sampleRate: 24000, samples: Float32Array.of(0.1)})
  await flush()
  expect(test.onStatus).toHaveBeenLastCalledWith('paused')
  const old = test.pending[0]
  test.reader.update({chat: 'other', id: '2', text: '다른 채팅'}, voice)
  await flush()
  expect(old.signal.aborted).toBe(true)
  expect(test.port.setPaused).toHaveBeenLastCalledWith(false)
  expect(test.onStatus).toHaveBeenLastCalledWith('playing')
  test.reader.dispose()
})
it('should replay only the current bubble after its narration has ended', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  test.pending[0].done()
  await flush()
  const latest = {...message, id: '2', text: '현재 말풍선'}
  test.reader.update(latest, voice)
  await flush()
  test.pending[1].done()
  await flush()
  expect(test.onStatus).toHaveBeenLastCalledWith('idle')
  await test.reader.toggle()
  await flush()
  expect(test.port.prepare.mock.calls.map(([text]) => text)).toEqual([
    message.text,
    latest.text,
    latest.text,
  ])
  test.reader.dispose()
})
it('should report a failed pause and retain the previous playback state', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  test.port.setPaused.mockRejectedValueOnce(new Error('pause failed'))
  await expect(test.reader.toggle()).rejects.toThrow('pause failed')
  expect(test.onStatus).toHaveBeenLastCalledWith('playing')
  expect(test.pending[0].signal.aborted).toBe(false)
  test.reader.dispose()
})
it('should ignore an obsolete pause failure after switching to another chat', async () => {
  const test = fixture()
  test.reader.update(message, voice)
  await flush()
  const suspended = Promise.withResolvers<void>()
  test.port.setPaused.mockReturnValueOnce(suspended.promise)
  const pausing = test.reader.toggle()
  test.reader.update({chat: 'other', id: '2', text: '새 채팅'}, voice)
  await flush()
  suspended.reject(new Error('old pause failed'))
  await pausing
  expect(test.onStatus).toHaveBeenLastCalledWith('playing')
  expect(test.onError).not.toHaveBeenCalled()
  test.reader.dispose()
})
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
  expect(test.port.prepare.mock.calls.length).toBeGreaterThan(1)
  const unread = test.port.prepare.mock.calls[1][0]
  test.pending[0].done()
  await flush()
  test.reader.update({chat: 'second', id: '2', text: '다른 채팅'}, voice)
  expect(test.pending[1].signal.aborted).toBe(true)
  await flush()
  const prepared = test.port.prepare.mock.calls.length
  test.reader.update({...message, text: '긴 문장입니다. '.repeat(30)}, voice)
  await flush()
  expect(test.port.prepare.mock.calls[prepared][0]).toBe(unread)
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
