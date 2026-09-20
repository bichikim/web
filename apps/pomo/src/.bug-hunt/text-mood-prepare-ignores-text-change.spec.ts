/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {type TextMoodAnalyzer, type TextMoodController, useTextMood} from '../features/text-mood'
import {successResult} from 'src/features/result'

const createDeferred = <Value>() => {
  let resolve: (value: Value) => void = () => undefined
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise
  })
  return {promise, resolve}
}

describe('bug hunt: text mood prepare completes after input change', () => {
  it('should not report ready after the user edits text during model preparation', async () => {
    const preparation = createDeferred<Awaited<ReturnType<TextMoodAnalyzer['prepare']>>>()
    const analyzer: TextMoodAnalyzer = {
      analyze: vi.fn(),
      dispose: vi.fn(),
      prepare: vi.fn(() => preparation.promise),
    }
    const runtime = {
      createAnalyzer: vi.fn(() => analyzer),
    }

    let controller!: TextMoodController
    let dispose: () => void = () => undefined
    createRoot((disposeRoot) => {
      dispose = disposeRoot
      controller = useTextMood({initialText: '첫 문장', runtime})
    })

    const preparing = controller.prepare()
    controller.setText('바뀐 문장')

    preparation.resolve(
      successResult({repositoryId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'}),
    )
    await preparing

    expect(controller.text()).toBe('바뀐 문장')
    expect(controller.state()).toEqual({status: 'idle'})

    dispose()
  })
})
