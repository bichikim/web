import {createComponent, createRoot} from 'solid-js'
import {expect, test} from 'vitest'
import {createSkinSession, SkinSessionContext, useSkinSessionControls} from '../skin-session'
import {createSkinDocument} from '../../../deformation/__tests__/fixtures/skin'

test('should end the session when the editing controls are disposed', () => {
  const document = createSkinDocument()
  const session = createRoot((dispose) => ({dispose, value: createSkinSession()}))
  const disposeControls = createRoot((dispose) => {
    createComponent(SkinSessionContext.Provider, {
      get children() {
        useSkinSessionControls(
          () => document.parts[0]!.id,
          () => undefined,
        ).setEnabled(true)
        return null
      },
      value: session.value,
    })
    return dispose
  })
  expect(session.value.partId()).toBe(document.parts[0]!.id)
  disposeControls()
  expect(session.value.partId()).toBeNull()
  expect(session.value.pick(document, 'Shoulder')).toBe(false)
  session.dispose()
})

test('should preserve a session taken over by another part', () => {
  const session = createRoot((dispose) => ({dispose, value: createSkinSession()}))
  const disposeControls = createRoot((dispose) => {
    createComponent(SkinSessionContext.Provider, {
      get children() {
        useSkinSessionControls(
          () => 'old-part',
          () => undefined,
        ).setEnabled(true)
        return null
      },
      value: session.value,
    })
    return dispose
  })
  session.value.start('new-part')
  disposeControls()
  expect(session.value.partId()).toBe('new-part')
  session.dispose()
})

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
