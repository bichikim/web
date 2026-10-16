import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocumentValue} from '../../../player'
import {
  addExpression,
  getParameterExpressions,
  removeExpression,
  removeExpressionParameter,
  renameExpression,
  setExpressionFade,
  setExpressionParameter,
} from '../expressions'
import {addPartHitArea, getPartHitArea, renameHitArea, setPartHitArea} from '../hit-areas'
import {addPartPoseGroup, getPartPose, setPartPose, updatePoseGroup} from '../pose-groups'

const valid = (document: unknown) => parseDocumentValue(document).ok

describe('expression editing', () => {
  test('should create, edit, rename and delete expressions', () => {
    const created = addExpression(createDemoDocument(), 'angle-x', 12)!
    expect(created.id).toBe('표정 1')
    expect(getParameterExpressions(created.document, 'angle-x')).toEqual([
      {
        entry: {blend: 'overwrite', parameterId: 'angle-x', value: 12},
        expression: created.document.expressions![0],
      },
    ])

    const added = setExpressionParameter(created.document, '표정 1', {
      blend: 'add',
      parameterId: 'angle-y',
      value: 3,
    })!
    const replaced = setExpressionParameter(added, '표정 1', {
      blend: 'multiply',
      parameterId: 'angle-y',
      value: 2,
    })!
    expect(replaced.expressions![0]!.parameters).toHaveLength(2)
    expect(
      setExpressionParameter(replaced, '표정 1', {blend: 'add', parameterId: 'nope', value: 1}),
    ).toBeUndefined()

    const faded = setExpressionFade(replaced, '표정 1', {fadeInTime: 0.2})!
    expect(faded.expressions![0]!.fadeInTime).toBe(0.2)
    expect(setExpressionFade(replaced, '표정 1', {fadeOutTime: -1})).toBeUndefined()

    const second = addExpression(faded, 'angle-x', 0)!
    expect(renameExpression(second.document, '표정 1', '표정 2')).toBeUndefined()
    expect(renameExpression(second.document, '표정 1', '  ')).toBeUndefined()
    const renamed = renameExpression(second.document, '표정 1', ' 웃음 ')!
    expect(renamed.expressions!.map((expression) => expression.id)).toEqual(['웃음', '표정 2'])

    const reduced = removeExpressionParameter(renamed, '웃음', 'angle-y')!
    expect(reduced.expressions![0]!.parameters.map((parameter) => parameter.parameterId)).toEqual([
      'angle-x',
    ])
    const removed = removeExpression(removeExpression(reduced, '웃음')!, '표정 2')!
    expect(removed.expressions).toBeUndefined()
    expect(valid(removed)).toBe(true)
  })
})

describe('hit area editing', () => {
  test('should move parts between areas and drop empty areas', () => {
    const created = addPartHitArea(createDemoDocument(), 'mesh-preview')!
    expect(created.id).toBe('영역 1')
    const joined = setPartHitArea(created.document, 'shape-circle', '영역 1')!
    expect(getPartHitArea(joined, 'shape-circle')?.partIds).toEqual([
      'mesh-preview',
      'shape-circle',
    ])

    const moved = setPartHitArea(joined, 'mesh-preview', '머리')!
    expect(moved.hitAreas!.map((area) => [area.id, area.partIds])).toEqual([
      ['영역 1', ['shape-circle']],
      ['머리', ['mesh-preview']],
    ])
    expect(renameHitArea(moved, '영역 1', '머리')).toBeUndefined()
    const renamed = renameHitArea(moved, '영역 1', '몸')!
    expect(getPartHitArea(renamed, 'shape-circle')?.id).toBe('몸')

    const cleared = setPartHitArea(
      setPartHitArea(renamed, 'shape-circle', undefined)!,
      'mesh-preview',
      undefined,
    )!
    expect(cleared.hitAreas).toBeUndefined()
    expect(valid(cleared)).toBe(true)
  })
})

describe('pose group editing', () => {
  test('should create groups, assign entries by value and update group settings', () => {
    const created = addPartPoseGroup(createDemoDocument(), 'shape-circle', 'angle-x')!
    expect(created.id).toBe('포즈 1')
    expect(getPartPose(created.document, 'shape-circle')?.entry).toEqual({
      partIds: ['shape-circle'],
      value: 0,
    })

    const second = setPartPose(created.document, 'shape-diamond', {groupId: '포즈 1', value: 30})!
    const shared = setPartPose(second, 'mesh-preview', {groupId: '포즈 1', value: 30})!
    expect(shared.poseGroups![0]!.entries).toEqual([
      {partIds: ['shape-circle'], value: 0},
      {partIds: ['shape-diamond', 'mesh-preview'], value: 30},
    ])

    const moved = setPartPose(shared, 'shape-circle', {groupId: '포즈 1', value: -30})!
    expect(moved.poseGroups![0]!.entries.map((entry) => entry.value)).toEqual([30, -30])

    const updated = updatePoseGroup(moved, '포즈 1', {
      fadeTime: 0.2,
      id: '팔',
      parameterId: 'angle-y',
    })!
    expect(updated.poseGroups![0]).toMatchObject({fadeTime: 0.2, id: '팔', parameterId: 'angle-y'})
    expect(updatePoseGroup(updated, '팔', {id: ''})).toBeUndefined()
    expect(updatePoseGroup(updated, '팔', {fadeTime: -1})).toBeUndefined()

    const released = ['shape-circle', 'shape-diamond', 'mesh-preview'].reduce(
      (document, partId) => setPartPose(document, partId, undefined)!,
      updated,
    )
    expect(released.poseGroups).toBeUndefined()
    expect(valid(released)).toBe(true)
  })
})
