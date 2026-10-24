/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import type {KoreanTextSegment} from '../../korean-text-postprocessor'
import {
  generateRequest,
  koreanMocks,
  loadWorker,
  runtimeMocks,
  waitForResponse,
} from './fixtures/worker'

describe('chat worker Korean refinement', () => {
  it('should leave an answer unchanged when no segment needs refinement', async () => {
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'refining'})
    expect(runtimeMocks.generate).toHaveBeenCalledOnce()
  })

  it('should not refine or hide Korean punctuation with the real segmenter', async () => {
    const answer = '국어·영어·수학을 공부해요.'
    const {createKoreanTextSegments} = await vi.importActual<
      typeof import('../../korean-text-postprocessor')
    >('../../korean-text-postprocessor')
    koreanMocks.createKoreanTextSegments.mockImplementation(createKoreanTextSegments)
    runtimeMocks.generate.mockResolvedValueOnce(answer)
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(koreanMocks.createKoreanTextSegments).toHaveBeenCalledWith(answer)
    expect(worker.postMessage).not.toHaveBeenCalledWith({type: 'refining'})
    expect(runtimeMocks.generate).toHaveBeenCalledOnce()
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({message: expect.objectContaining({content: answer})}),
    )
  })

  it('should preserve text segments and replace foreign CJK in refined segments', async () => {
    koreanMocks.createKoreanTextSegments.mockReturnValue([
      {kind: 'text', text: '앞 문장. '},
      {kind: 'refining', text: '나쁜 人生'},
    ])
    koreanMocks.containsForeignCjk.mockReturnValue(true)
    runtimeMocks.generate.mockResolvedValueOnce('나쁜 人生').mockResolvedValueOnce('여전히 人生')
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenCalledWith({type: 'refining'})
    expect(koreanMocks.replaceUnrefinedSentences).toHaveBeenCalledWith('나쁜 人生')
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({message: expect.objectContaining({content: '앞 문장. 대체 문장'})}),
    )
  })

  it('should preserve leading whitespace when a refined segment becomes Korean', async () => {
    koreanMocks.createKoreanTextSegments.mockReturnValue([{kind: 'refining', text: '  나쁜 人生'}])
    runtimeMocks.generate.mockResolvedValueOnce('나쁜 人生').mockResolvedValueOnce('좋은 하루')
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({message: expect.objectContaining({content: '  좋은 하루'})}),
    )
    expect(runtimeMocks.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({suppressedTokenIds: [17, 23]}),
    )
  })

  it('should cache suppressed token ids across refined answers', async () => {
    koreanMocks.createKoreanTextSegments.mockReturnValue([{kind: 'refining', text: '나쁜 人生'}])
    runtimeMocks.generate
      .mockResolvedValueOnce('나쁜 人生')
      .mockResolvedValueOnce('첫 답변')
      .mockResolvedValueOnce('또 나쁜 人生')
      .mockResolvedValueOnce('둘째 답변')
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')
    await worker.dispatchAndWaitForResponse(
      generateRequest({refineAnswer: true, replyId: 'reply-2'}),
      'complete',
    )
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({message: expect.objectContaining({id: 'reply-2'})}),
    )

    expect(koreanMocks.createForeignCjkTokenIds).toHaveBeenCalledOnce()
  })

  it('should handle a segment whose whitespace matcher returns no result', async () => {
    const unusualText = {
      match: vi.fn().mockReturnValue(null),
      toString: () => '나쁜 人生',
      trim: () => '나쁜 人生',
    } as unknown as string
    koreanMocks.createKoreanTextSegments.mockReturnValue([{kind: 'refining', text: unusualText}])
    runtimeMocks.generate.mockResolvedValueOnce('나쁜 人生').mockResolvedValueOnce('좋은 하루')
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({message: expect.objectContaining({content: '좋은 하루'})}),
    )
  })

  it('should execute the exhaustive segment guard for malformed runtime data', async () => {
    koreanMocks.createKoreanTextSegments.mockReturnValue([
      {kind: 'refining', text: '나쁜 人生'},
      {kind: 'unknown', text: '무시'} as unknown as KoreanTextSegment,
    ])
    runtimeMocks.generate.mockResolvedValueOnce('나쁜 人生').mockResolvedValueOnce('좋은 하루')
    const worker = await loadWorker()

    worker.dispatch(generateRequest({refineAnswer: true}))
    await waitForResponse(worker, 'complete')

    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({message: expect.objectContaining({content: '좋은 하루'})}),
    )
  })
})
