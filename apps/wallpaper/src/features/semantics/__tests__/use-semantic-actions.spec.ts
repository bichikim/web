/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {sendSemanticFrame} from '../channel'
import {useSemanticActions} from '../use-semantic-actions'

it('should execute character presets, keep manual actions during analysis and release at speech end', async () => {
  let expression: string | undefined
  const motion = {stop: vi.fn()}
  const player = {
    getExpression: () => expression,
    resetMotionHistory: vi.fn(),
    setExpression: vi.fn((id?: string) => {
      expression = id
      return true
    }),
    startMotion: vi.fn(() => motion),
  }
  const dispose = createRoot((cleanup) => {
    useSemanticActions({
      actions: () => [
        {action: {id: '노트 들기', kind: 'expression'}, label: '노트 들기'},
        {action: {id: 'Walk:0', kind: 'motion'}, label: '정면 걷기'},
      ],
      bindings: () => [
        {
          action: {id: '노트 들기', kind: 'expression'},
          enabled: true,
          id: 'note',
          mode: 'toggle',
          parameterId: null,
          text: '작성했어요',
          threshold: 0.8,
        },
        {
          action: {id: 'Walk:0', kind: 'motion'},
          enabled: true,
          id: 'walk',
          mode: 'toggle',
          parameterId: null,
          text: '다음으로',
          threshold: 0.8,
        },
      ],
      player: () => player,
      widgetId: () => 'action-widget',
    })
    return cleanup
  })
  try {
    await sendSemanticFrame({scores: {note: 0.9}, widgetId: 'action-widget'})
    expect(player.setExpression).toHaveBeenLastCalledWith('노트 들기')
    await sendSemanticFrame({previewId: 'walk', scores: {note: 1}, widgetId: 'action-widget'})
    expect(player.setExpression).toHaveBeenLastCalledWith(undefined)
    expect(player.startMotion).toHaveBeenCalledWith('Walk:0', {loop: true})
    await sendSemanticFrame({previewId: 'walk', scores: {}, widgetId: 'action-widget'})
    expect(player.startMotion).toHaveBeenCalledOnce()
    await sendSemanticFrame({scores: {note: 1}, widgetId: 'action-widget'})
    expect(motion.stop).toHaveBeenCalledOnce()
    expect(player.setExpression).toHaveBeenLastCalledWith('노트 들기')
    await sendSemanticFrame({scores: {}, widgetId: 'action-widget'})
    expect(player.setExpression).toHaveBeenLastCalledWith(undefined)
  } finally {
    dispose()
  }
})
