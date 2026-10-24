import {describe, expect, test} from 'vitest'

import {createDeformerControlSelection} from '../deformer-control-selection'

const selectionModifiers = {ctrlKey: false, metaKey: false}

describe('createDeformerControlSelection', () => {
  test('should keep point and exclusive control selection in one state', () => {
    const selection = createDeformerControlSelection()

    selection.select(selectionModifiers, 'deformer', {kind: 'controlPoint', pointIndex: 0})
    selection.select({...selectionModifiers, ctrlKey: true}, 'deformer', {
      kind: 'controlPoint',
      pointIndex: 1,
    })

    expect(selection.selectedPointIndices()).toEqual([0, 1])
    expect(selection.isSelected('deformer', {kind: 'controlPoint', pointIndex: 0})).toBe(true)

    selection.select(selectionModifiers, 'deformer', {kind: 'rotation'})

    expect(selection.selectedPointIndices()).toEqual([])
    expect(selection.isSelected('deformer', {kind: 'rotation'})).toBe(true)
    expect(selection.isSelected('deformer', {kind: 'controlPoint', pointIndex: 0})).toBe(false)
  })

  test('should clear the shared selection when the active topology changes', () => {
    const selection = createDeformerControlSelection()
    selection.syncTopology({columns: 1, nodeId: 'deformer', rows: 1})
    selection.select(selectionModifiers, 'deformer', {kind: 'controlPoint', pointIndex: 0})

    selection.syncTopology({columns: 2, nodeId: 'deformer', rows: 1})

    expect(selection.selectedPointIndices()).toEqual([])
    expect(selection.isSelected('deformer', {kind: 'controlPoint', pointIndex: 0})).toBe(false)
  })

  test('should toggle an additive point and preserve the selection while dragging its curve', () => {
    const selection = createDeformerControlSelection()
    const additiveModifiers = {...selectionModifiers, metaKey: true}

    selection.select(selectionModifiers, 'deformer', {kind: 'controlPoint', pointIndex: 0})
    selection.select(additiveModifiers, 'deformer', {
      axis: 'horizontal',
      kind: 'curveHandle',
      pointIndex: 0,
    })
    expect(selection.selectedPointIndices()).toEqual([0])

    selection.select(additiveModifiers, 'deformer', {kind: 'controlPoint', pointIndex: 0})
    expect(selection.selectedPointIndices()).toEqual([])
  })

  test('should clear stale or translated selection and support the rotation origin', () => {
    const selection = createDeformerControlSelection()
    selection.select(selectionModifiers, 'deformer', {kind: 'rotationOrigin'})

    expect(selection.isSelected('deformer', {kind: 'rotationOrigin'})).toBe(true)
    expect(selection.isSelected('other-deformer', {kind: 'rotationOrigin'})).toBe(false)

    selection.select(selectionModifiers, 'other-deformer', {
      axis: 'vertical',
      kind: 'curveHandle',
      pointIndex: 0,
    })
    expect(selection.isSelected('deformer', {kind: 'rotationOrigin'})).toBe(false)

    selection.select(selectionModifiers, 'deformer', {kind: 'controlPoint', pointIndex: 0})
    selection.select(selectionModifiers, 'deformer', {
      kind: 'translation',
      previousPoint: {x: 0, y: 0},
    })
    expect(selection.selectedPointIndices()).toEqual([])

    selection.select(selectionModifiers, 'deformer', {kind: 'controlPoint', pointIndex: 0})
    selection.clear()
    expect(selection.selectedPointIndices()).toEqual([])
  })
})
