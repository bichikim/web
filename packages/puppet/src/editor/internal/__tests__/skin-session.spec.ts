import {createRoot} from 'solid-js'
import {expect, test} from 'vitest'
import {createSkinSession} from '../skin-session'
import {createSkinDocument} from '../../../deformation/__tests__/fixtures/skin'

test('should keep the editing part pinned while selecting another joint', () =>
  createRoot((dispose) => {
    const document = createSkinDocument()
    const session = createSkinSession()
    const partId = document.parts[0]!.id
    session.start(partId)
    expect(session.pick(document, 'Elbow')).toBe(true)
    expect(session.partId()).toBe(partId)
    expect(session.jointId()).toBe('Elbow')
    expect(session.pick(document, partId)).toBe(true)
    expect(session.jointId()).toBe('Elbow')
    session.stop()
    expect(session.pick(document, 'Shoulder')).toBe(false)
    dispose()
  }))
