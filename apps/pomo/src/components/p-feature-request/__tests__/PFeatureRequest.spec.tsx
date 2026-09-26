/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import {openDesktopDialog} from '../../../features/desktop-mode/dialogs'
import {PButton} from '../../p-button/PButton'
import {DesktopDialogFrame} from '../../desktop-dialog/Frame'
import {FeatureRequestContent} from '../../feature-requests/FeatureRequestContent'
import {PModal, type PModalProps} from '../../p-modal/PModal'
import {PScribbleCircleControl} from '../../scribble/CircleControl'
import {PFeatureRequest} from '../PFeatureRequest'

vi.mock('../../../features/desktop-mode/dialogs', () => ({openDesktopDialog: vi.fn()}))
vi.mock('../../p-button/PButton', () => ({PButton: vi.fn()}))
vi.mock('../../desktop-dialog/Frame', () => ({DesktopDialogFrame: vi.fn()}))
vi.mock('../../feature-requests/FeatureRequestContent', () => ({FeatureRequestContent: vi.fn()}))
vi.mock('../../p-modal/PModal', () => ({PModal: vi.fn()}))
vi.mock('../../scribble/CircleControl', () => ({PScribbleCircleControl: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(openDesktopDialog).mockResolvedValue(undefined)
  vi.mocked(PButton).mockImplementation((props) => (
    <button
      aria-label={props.accessibleLabel}
      onClick={(event) => props.onPress?.(event.currentTarget)}
      type="button"
    >
      {props.accessibleLabel}
    </button>
  ))
  vi.mocked(PScribbleCircleControl).mockImplementation((props) => <>{props.children}</>)
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div hidden={!props.isOpen} role="dialog">
      {props.children}
      <button
        onClick={() => {
          props.onOpenChange(false)
          props.onCloseAutoFocus?.()
        }}
        type="button"
      >
        {m.common_close()}
      </button>
    </div>
  ))
  vi.mocked(DesktopDialogFrame).mockImplementation(
    (props: {readonly children: JSX.Element; readonly onClose: () => void}) => (
      <main>
        {props.children}
        <button onClick={props.onClose} type="button">
          {m.common_close()}
        </button>
      </main>
    ),
  )
  vi.mocked(FeatureRequestContent).mockImplementation(() => <div>기능 요청 내용</div>)
})

it('should use the pill-shaped trigger shared by the settings controls', () => {
  render(() => <PFeatureRequest />)

  expect(PButton).toHaveBeenCalledWith(expect.objectContaining({pill: true}))
})

it('should open the inline feature request modal from its trigger', () => {
  render(() => <PFeatureRequest sceneStyle="scribble" />)

  fireEvent.click(screen.getByRole('button', {name: m.feature_request_open()}))

  expect(screen.getByRole('dialog')).not.toHaveAttribute('hidden')
  expect(screen.getByText('기능 요청 내용')).toBeInTheDocument()
})

it('should open the desktop dialog when rendered on the desktop surface', () => {
  render(() => <PFeatureRequest desktopSurface />)

  fireEvent.click(screen.getByRole('button', {name: m.feature_request_open()}))

  expect(openDesktopDialog).toHaveBeenCalledWith('featureRequests')
})

it('should render the desktop dialog and forward its close request', () => {
  const onRequestClose = vi.fn()
  render(() => <PFeatureRequest desktopDialog onRequestClose={onRequestClose} />)

  expect(screen.getByText('기능 요청 내용')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: m.common_close()}))

  expect(onRequestClose).toHaveBeenCalledOnce()
})
