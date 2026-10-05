/** @vitest-environment node */

import {createComponent} from 'solid-js'
import {expect, it} from 'vitest'

// @ts-expect-error The server entry has no direct declaration, but exposes the public web server API.
import {renderToString, ssr} from 'solid-js/web/dist/server.js'

import type {PSceneMotionInput} from '../../../features/focus-room-animation'
import {
  PStudioMotionInputSessionProvider,
  usePStudioMotionInputSession,
} from '../PStudioMotionInputSessionProvider'

const MotionInputProbe = (props: {readonly initialMotionInput?: PSceneMotionInput}) => {
  const session = usePStudioMotionInputSession()

  if (props.initialMotionInput !== undefined) {
    session?.setMotionInput(props.initialMotionInput)
  }

  return ssr(['<span>', '</span>'], session?.motionInput() ?? 'unset')
}

const renderAppRequest = (initialMotionInput?: PSceneMotionInput) =>
  renderToString(() =>
    createComponent(PStudioMotionInputSessionProvider, {
      get children() {
        return createComponent(MotionInputProbe, {initialMotionInput})
      },
    }),
  )

it('does not share a selected motion input across server app renders', () => {
  expect(renderAppRequest('drag')).toContain('<span>drag</span>')
  expect(renderAppRequest()).toContain('<span>unset</span>')
})
