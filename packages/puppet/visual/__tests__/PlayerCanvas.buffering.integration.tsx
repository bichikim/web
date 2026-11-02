import {render} from 'solid-js/web'
import {afterEach, expect, test, vi} from 'vitest'
import {PlayerCanvas} from '../../src/editor/PlayerCanvas'
import {createEmptyDocument} from '../../src/player'

let dispose: (() => void) | undefined
let host: HTMLDivElement | undefined
afterEach(() => {
  dispose?.()
  host?.remove()
  vi.restoreAllMocks()
})

test('should release a late Worker initialization without notifying an unmounted canvas owner', async () => {
  let releaseResponse: (release: () => void) => void = () => {}
  const received = new Promise<() => void>((resolve) => {
    releaseResponse = resolve
  })
  let completeDisposal = () => {}
  const disposed = new Promise<void>((resolve) => {
    completeDisposal = resolve
  })
  const setter = Object.getOwnPropertyDescriptor(Worker.prototype, 'onmessage')!.set!
  const terminate = Worker.prototype.terminate
  const obsolete = new Set<Worker>()
  let held = false
  vi.spyOn(Worker.prototype, 'onmessage', 'set').mockImplementation(
    function gate(this: Worker, listener) {
      if (obsolete.size === 0) {
        obsolete.add(this)
      }
      setter.call(this, (event: MessageEvent) => {
        if (obsolete.has(this) && !held) {
          held = true
          releaseResponse(() => listener?.call(this, event))
        } else {
          listener?.call(this, event)
        }
      })
    },
  )
  vi.spyOn(Worker.prototype, 'terminate').mockImplementation(function end(this: Worker) {
    terminate.call(this)
    if (obsolete.has(this)) {
      completeDisposal()
    }
  })
  const onFrame = vi.fn()
  const onBufferingChange = vi.fn()
  host = document.createElement('div')
  document.body.append(host)
  dispose = render(
    () => (
      <PlayerCanvas
        document={createEmptyDocument()}
        buffering
        onFrame={onFrame}
        onBufferingChange={onBufferingChange}
      />
    ),
    host,
  )
  const release = await received
  dispose()
  dispose = undefined
  onFrame.mockClear()
  onBufferingChange.mockClear()
  release()
  await disposed
  expect(onFrame).not.toHaveBeenCalled()
  expect(onBufferingChange).not.toHaveBeenCalled()
})
