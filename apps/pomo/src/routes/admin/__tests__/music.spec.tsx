/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

const adminMocks = vi.hoisted(() => ({AdminMusic: vi.fn()}))

vi.mock('../../../features/admin-music', () => adminMocks)

import AdminMusicPage from '../music'

it('should render the admin music workspace', () => {
  adminMocks.AdminMusic.mockReturnValue(<div>Admin music workspace</div>)

  render(() => <AdminMusicPage />)

  expect(screen.getByText('Admin music workspace')).toBeInTheDocument()
})
