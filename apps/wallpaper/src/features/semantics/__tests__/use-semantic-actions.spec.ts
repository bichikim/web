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
    setExpressionLayer: vi.fn<(group: string, id?: string) => boolean>(() => true),
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
    expect(player.setExpressionLayer).toHaveBeenLastCalledWith(expect.any(String), '노트 들기')
    const noteLayer = player.setExpressionLayer.mock.lastCall![0]
    await sendSemanticFrame({previewId: 'walk', scores: {note: 1}, widgetId: 'action-widget'})
    expect(player.setExpressionLayer).toHaveBeenLastCalledWith(noteLayer)
    expect(player.startMotion).toHaveBeenCalledWith('Walk:0', {loop: true})
    await sendSemanticFrame({previewId: 'walk', scores: {}, widgetId: 'action-widget'})
    expect(player.startMotion).toHaveBeenCalledOnce()
    await sendSemanticFrame({scores: {note: 1}, widgetId: 'action-widget'})
    expect(motion.stop).toHaveBeenCalledOnce()
    expect(player.setExpressionLayer).toHaveBeenLastCalledWith(noteLayer, '노트 들기')
    await sendSemanticFrame({scores: {}, widgetId: 'action-widget'})
    expect(player.setExpressionLayer).toHaveBeenLastCalledWith(noteLayer)
  } finally {
    dispose()
  }
})

it('should select one winner per group and retain other groups while an expression changes', async () => {
  const player = {
    resetMotionHistory: vi.fn(),
    setExpressionLayer: vi.fn<(group: string, id?: string) => boolean>(() => true),
    startMotion: vi.fn(() => ({stop: vi.fn()})),
  }
  const bindings = [
    {exclusiveGroup: '표정', id: 'happy'},
    {exclusiveGroup: '표정', id: 'sad'},
    {exclusiveGroup: '손', id: 'notes'},
    {id: 'default-one'},
    {exclusiveGroup: ' ', id: 'default-two'},
  ].map((item) => ({
    ...item,
    action: {id: item.id, kind: 'expression' as const},
    enabled: true,
    mode: 'toggle' as const,
    parameterId: null,
    text: item.id,
    threshold: 0.8,
  }))
  const dispose = createRoot((cleanup) => {
    useSemanticActions({
      actions: () => bindings.map((item) => ({action: item.action, label: item.id})),
      bindings: () => bindings,
      player: () => player,
      widgetId: () => 'groups',
    })
    return cleanup
  })
  try {
    await sendSemanticFrame({
      scores: {'default-one': 0.9, 'default-two': 0.85, happy: 0.9, notes: 0.95, sad: 0.85},
      widgetId: 'groups',
    })
    expect(player.setExpressionLayer).toHaveBeenCalledWith(expect.any(String), 'happy')
    expect(player.setExpressionLayer).toHaveBeenCalledWith(expect.any(String), 'notes')
    const noteLayer = player.setExpressionLayer.mock.calls.find(([, id]) => id === 'notes')![0]
    expect(player.setExpressionLayer).toHaveBeenCalledWith(expect.any(String), 'default-one')
    expect(player.setExpressionLayer).not.toHaveBeenCalledWith(expect.any(String), 'sad')
    player.setExpressionLayer.mockClear()
    await sendSemanticFrame({scores: {happy: 0.85, notes: 0.95, sad: 0.95}, widgetId: 'groups'})
    expect(player.setExpressionLayer).toHaveBeenCalledWith(expect.any(String), 'sad')
    expect(player.setExpressionLayer.mock.calls.some(([group]) => group === noteLayer)).toBe(false)
  } finally {
    dispose()
  }
})
