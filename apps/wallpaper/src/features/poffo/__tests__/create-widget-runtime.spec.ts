import {expect, it, vi} from 'vitest'
import {createWidgetRuntime} from '../create-widget-runtime'

it('should configure speech after opening and update it without reopening the character', async () => {
  const order: string[] = []
  const open = vi.fn(async () => {
    order.push('open')
  })
  const configure = vi.fn(async () => {
    order.push('configure')
  })
  const runtime = createWidgetRuntime({close: vi.fn(async () => undefined), configure, open})
  const widget = {
    assetId: 'asset',
    id: 'first',
    speech: {enabled: true, x: 0.9, y: 0.05},
    x: null,
    y: null,
  }
  await runtime.synchronize([widget])
  expect(order).toEqual(['open', 'configure'])
  await runtime.synchronize([{...widget, x: 20}])
  expect(configure).toHaveBeenCalledOnce()
  const changed = {...widget, speech: {enabled: false, x: -0.4, y: 0.8}}
  await runtime.synchronize([changed])
  expect(configure).toHaveBeenLastCalledWith(changed)
  expect(open).toHaveBeenCalledOnce()
  await runtime.dispose()
})

it('should restore separate widgets once and close only the widget removed from the library', async () => {
  const open = vi.fn(async () => undefined)
  const close = vi.fn(async () => undefined)
  const runtime = createWidgetRuntime({close, open})
  const first = {assetId: 'asset', id: 'first', x: 10, y: 20}
  const second = {assetId: 'asset', id: 'second', x: null, y: null}
  await runtime.synchronize([first, second])
  await runtime.synchronize([{...first, x: 100}, second])
  expect(open).toHaveBeenCalledTimes(2)
  expect(open).toHaveBeenCalledWith(first)
  await runtime.synchronize([second])
  expect(close).toHaveBeenCalledExactlyOnceWith('first')
  await runtime.dispose()
  expect(close).toHaveBeenLastCalledWith('second')
})

it('should allow an opening failure to be retried without duplicating other widgets', async () => {
  const open = vi.fn(async () => undefined).mockRejectedValueOnce(new Error('window'))
  const runtime = createWidgetRuntime({close: vi.fn(async () => undefined), open})
  const widget = {assetId: 'asset', id: 'first', x: null, y: null}
  await expect(runtime.synchronize([widget])).rejects.toThrow('window')
  await runtime.synchronize([widget])
  expect(open).toHaveBeenCalledTimes(2)
  await runtime.dispose()
})
