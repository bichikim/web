import {createComponent, createRoot, flush} from 'solid-js'
import {renderHook} from '@solidjs/testing-library'
import {expect, test} from 'vitest'
import {createSkinSession, SkinSessionContext, useSkinSessionControls} from '../skin-session'
import {createSkinDocument} from '../../../deformation/__tests__/fixtures/skin'

const mountControls = (session: ReturnType<typeof createSkinSession>, partId: string) =>
  renderHook(
    () =>
      useSkinSessionControls(
        () => partId,
        () => undefined,
      ),
    {
      wrapper: (props) =>
        createComponent(SkinSessionContext, {
          get children() {
            return props.children
          },
          value: session,
        }),
    },
  )

test('should end the session when the editing controls are disposed', () => {
  const document = createSkinDocument()
  const session = createRoot((dispose) => ({dispose, value: createSkinSession()}))
  const {result, cleanup} = mountControls(session.value, document.parts[0]!.id)
  flush(() => result.setEnabled(true))
  expect(session.value.partId()).toBe(document.parts[0]!.id)
  flush(cleanup)
  expect(session.value.partId()).toBeNull()
  expect(session.value.pick(document, 'Shoulder')).toBe(false)
  session.dispose()
})

test('should preserve a session taken over by another part', () => {
  const session = createRoot((dispose) => ({dispose, value: createSkinSession()}))
  const {result, cleanup} = mountControls(session.value, 'old-part')
  flush(() => result.setEnabled(true))
  flush(() => session.value.start('new-part'))
  cleanup()
  expect(session.value.partId()).toBe('new-part')
  session.dispose()
})

test('should keep the editing part pinned while selecting another joint', () => {
  const document = createSkinDocument()
  const {dispose, session} = createRoot((dispose) => ({dispose, session: createSkinSession()}))
  const partId = document.parts[0]!.id
  flush(() => session.start(partId))
  expect(flush(() => session.pick(document, 'Elbow'))).toBe(true)
  expect(session.partId()).toBe(partId)
  expect(session.jointId()).toBe('Elbow')
  expect(flush(() => session.pick(document, partId))).toBe(true)
  expect(session.jointId()).toBe('Elbow')
  flush(session.stop)
  expect(session.pick(document, 'Shoulder')).toBe(false)
  dispose()
})
