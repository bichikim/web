/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {closeDesktopDialog} from '../../../features/desktop-mode/dialogs'
import {PFeatureRequest} from '../../p-feature-request/PFeatureRequest'
import {DesktopFeatureRequestsDialog} from '../FeatureRequests'

vi.mock('../../../features/desktop-mode/dialogs', () => ({closeDesktopDialog: vi.fn()}))
vi.mock('../../p-feature-request/PFeatureRequest', () => ({PFeatureRequest: vi.fn()}))

it('should close the desktop feature request dialog when its child requests closing', () => {
  vi.mocked(closeDesktopDialog).mockResolvedValue(undefined)
  vi.mocked(PFeatureRequest).mockImplementation((props) => (
    <button onClick={() => props.onRequestClose?.()} type="button">
      기능 요청
    </button>
  ))

  render(() => <DesktopFeatureRequestsDialog />)
  fireEvent.click(screen.getByRole('button', {name: '기능 요청'}))

  expect(PFeatureRequest).toHaveBeenCalledWith(
    expect.objectContaining({desktopDialog: true, sceneStyle: 'original'}),
  )
  expect(closeDesktopDialog).toHaveBeenCalledWith('featureRequests')
})
