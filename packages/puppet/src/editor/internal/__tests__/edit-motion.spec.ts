import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {editMotion} from '../edit-motion'

describe('editMotion', () => {
  test('should add a uniquely named one-second motion', () => {
    const document = createDemoDocument()
    const result = editMotion({document, edit: {type: 'add'}})

    expect(result?.selectedMotionId).toBe('motion')
    expect(result?.document.motions.at(-1)).toEqual({duration: 1, id: 'motion', tracks: []})
  })

  test('should duplicate a motion after its source with independent track data', () => {
    const document = createDemoDocument()
    const result = editMotion({document, edit: {motionId: 'blink', type: 'duplicate'}})
    const source = result?.document.motions[1]
    const duplicate = result?.document.motions[2]

    expect(result?.selectedMotionId).toBe('blink-copy')
    expect(duplicate).toEqual({...document.motions[1], id: 'blink-copy'})
    expect(duplicate).not.toBe(source)
    expect(duplicate?.tracks[0]).not.toBe(source?.tracks[0])
    expect(duplicate?.tracks[0]?.keyframes).not.toBe(source?.tracks[0]?.keyframes)
  })

  test('should trim and rename a motion without changing its order', () => {
    const document = createDemoDocument()
    const result = editMotion({
      document,
      edit: {motionId: 'blink', name: ' blink-fast ', type: 'rename'},
    })

    expect(result?.selectedMotionId).toBe('blink-fast')
    expect(result?.document.motions.map((motion) => motion.id)).toEqual([
      'idle-deform',
      'blink-fast',
      'nod',
    ])
  })

  test('should reject blank and duplicate names', () => {
    const document = createDemoDocument()

    expect(
      editMotion({document, edit: {motionId: 'blink', name: '   ', type: 'rename'}}),
    ).toBeUndefined()
    expect(
      editMotion({document, edit: {motionId: 'blink', name: 'nod', type: 'rename'}}),
    ).toBeUndefined()
  })

  test('should select the next, previous, or no motion after deletion', () => {
    const document = createDemoDocument()
    const middle = editMotion({document, edit: {motionId: 'blink', type: 'delete'}})
    const last = editMotion({document, edit: {motionId: 'nod', type: 'delete'}})
    const onlyDocument = {...document, motions: [document.motions[0]!]}
    const only = editMotion({
      document: onlyDocument,
      edit: {motionId: 'idle-deform', type: 'delete'},
    })

    expect(middle?.selectedMotionId).toBe('nod')
    expect(last?.selectedMotionId).toBe('blink')
    expect(only?.selectedMotionId).toBeNull()
  })
})
