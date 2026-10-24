/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {closeDesktopDialog} from '../../../features/desktop-mode/dialogs'
import {PVersionNotice} from '../../p-version-notice/PVersionNotice'
import {DesktopVersionNoticeDialog} from '../VersionNotice'

vi.mock('../../../features/desktop-mode/dialogs', () => ({closeDesktopDialog: vi.fn()}))
vi.mock('../../p-version-notice/PVersionNotice', () => ({PVersionNotice: vi.fn()}))

beforeEach(() => {
  vi.mocked(closeDesktopDialog).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should render the desktop version notice with native-window behavior', () => {
  render(() => <DesktopVersionNoticeDialog />)

  const props = vi.mocked(PVersionNotice).mock.calls[0]?.[0]
  if (props === undefined) {
    throw new Error('Missing version notice props')
  }

  expect(props).toMatchObject({desktopDialog: true, sceneStyle: 'original'})
  props.onRequestClose?.()

  expect(closeDesktopDialog).toHaveBeenCalledExactlyOnceWith('versionNotice')
})
