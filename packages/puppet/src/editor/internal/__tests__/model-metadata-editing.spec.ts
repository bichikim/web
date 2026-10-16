import {describe, expect, test} from 'vitest'

import {
  getEffectRows,
  getGroupOpacityRowId,
  getModelTrackRowId,
  parseDocumentValue,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player'
import {mergeDocument} from '../merge-document'
import {deleteParameterKeyframe, setParameterKeyframe} from '../motion-keyframes'
import {addParameterGroup, setParameterGroup, setParameterRole} from '../parameter-roles'
import {setPartUserData} from '../part-user-data'
import {removeParameterNodeTargets} from '../remove-node-targets'
import {addTimelineParameterRow} from '../timeline-parameter-rows'
import {sampleTimelineRowValues} from '../timeline-row-values'

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [{duration: 1, id: 'm', tracks: []}],
  parameters: [{defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'}],
  parts: [
    {
      id: 'face',
      mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
      texture: {height: 1, src: 'face.png', width: 1},
    },
  ],
  physics: {
    chains: [
      {
        id: 'hair',
        inputs: [{axis: 'x', parameterId: 'mouth', weight: 1}],
        normalization: {
          angle: {center: 0, maximum: 10, minimum: -10},
          position: {center: 0, maximum: 10, minimum: -10},
        },
        outputs: [],
        pendulums: [{acceleration: 1, length: 10, mobility: 0.9, reaction: 1}],
      },
    ],
    pendulums: [],
  },
  scene: {
    roots: [
      {
        children: [{id: 'face', kind: 'part', locked: false, name: 'Face', visible: true}],
        id: 'head',
        kind: 'group',
        locked: false,
        name: 'Head',
        visible: true,
      },
    ],
  },
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const key = (document: PuppetDocument, rowId: string, value: number) =>
  setParameterKeyframe({document, motionId: 'm', parameterId: rowId, time: 0.5, value})!

describe('model metadata editing', () => {
  test('should key model and group opacity rows as their own tracks', () => {
    const opacityRow = getModelTrackRowId('opacity')
    const groupRow = getGroupOpacityRowId('head')
    expect(getEffectRows(createDocument()).map((row) => row.id)).toEqual([
      'model:opacity',
      'model:eye-blink',
      'model:lip-sync',
      'group-opacity:head',
    ])
    const rowed = addTimelineParameterRow(createDocument(), 'm', groupRow)!
    const keyed = key(key(rowed, opacityRow, 0.4), groupRow, 2)
    expect(keyed.motions[0]?.tracks).toEqual([
      {keyframes: [{time: 0.5, value: 0.4}], kind: 'model', target: 'opacity'},
      // Values stay within the row's 0..1 range.
      {groupId: 'head', keyframes: [{time: 0.5, value: 1}], kind: 'group-opacity'},
    ])
    expect(parseDocumentValue(keyed).ok).toBe(true)
    const values = sampleTimelineRowValues({document: keyed, motion: keyed.motions[0], time: 0.5})
    expect(values[opacityRow]).toBeCloseTo(0.4)
    expect(values[getModelTrackRowId('lip-sync')]).toBe(0)
    const deleted = deleteParameterKeyframe({
      document: keyed,
      motionId: 'm',
      parameterId: opacityRow,
      time: 0.5,
    })
    expect(deleted?.motions[0]?.tracks.map((track) => track.kind)).toEqual(['group-opacity'])
  })

  test('should drop a removed group’s opacity tracks and rows', () => {
    const groupRow = getGroupOpacityRowId('head')
    const keyed = key(addTimelineParameterRow(createDocument(), 'm', groupRow)!, groupRow, 0.5)
    const removed = removeParameterNodeTargets(keyed, new Set(['head']))
    expect(removed.motions[0]?.tracks).toEqual([])
    expect(removed.motions[0]?.timelineParameterIds).toEqual([])
  })

  test('should edit roles, display groups and user data', () => {
    const roled = setParameterRole(createDocument(), 'mouth', 'lipSync', true)
    expect(roled.parameterRoles).toEqual({lipSync: ['mouth']})
    expect(setParameterRole(roled, 'mouth', 'lipSync', false).parameterRoles).toBeUndefined()
    const added = addParameterGroup(roled, ' Face ')!
    const grouped = setParameterGroup(added.document, 'mouth', added.id)
    expect(grouped.parameterGroups).toEqual([{id: 'group-1', name: 'Face'}])
    expect(grouped.parameters?.[0]?.groupId).toBe('group-1')
    expect(parseDocumentValue(grouped).ok).toBe(true)
    expect(setPartUserData(grouped, 'face', 'poke').parts[0]?.userData).toBe('poke')
    expect(setPartUserData(grouped, 'face', '').parts[0]?.userData).toBeUndefined()
  })

  test('should keep chains, roles and groups when merging a model', () => {
    const base = setParameterRole(createDocument(), 'mouth', 'lipSync', true)
    const merged = mergeDocument(base, base)
    if (!merged.ok) {
      throw new Error(merged.error.code)
    }
    expect(merged.document.physics?.chains).toHaveLength(2)
    expect(merged.document.parameterRoles?.lipSync).toEqual(['mouth', 'import-1:mouth'])
  })
})
