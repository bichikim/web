/**
 * @vitest-environment jsdom
 */
import {render, screen, waitFor} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {JSX} from 'solid-js'
import HomePage, {route} from '../index'
import {useAction, useNavigate} from '@solidjs/router'
import {useAuth} from 'src/store/auth'

vi.mock('@solidjs/router', () => ({
  A: (props: {children: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
  useAction: vi.fn(),
  useNavigate: vi.fn(),
}))
vi.mock('src/store/auth', () => ({useAuth: vi.fn()}))
vi.mock('src/requests/auth/update-user-metadata', () => ({
  updateUserMetadataAction: vi.fn(),
}))

const navigate = vi.fn()
const signOut = vi.fn()
const updateUserMetadata = vi.fn()

describe('home page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useAction).mockReturnValue(updateUserMetadata)
    vi.mocked(useAuth).mockReturnValue({signOut, user: () => null} as never)
  })

  it('should render the public landing content and navigation', () => {
    const {container} = render(() => <HomePage />)

    expect(screen.getByRole('heading', {name: /Play beautiful/})).toBeInTheDocument()
    expect(screen.getByRole('heading', {name: 'What you can do on Coong'})).toBeInTheDocument()
    expect(container.querySelectorAll('a[href="/piano"]')).toHaveLength(3)
    expect(screen.getByRole('link', {name: 'Explore Piano'})).toHaveAttribute('href', '/piano')
    expect(screen.getByRole('link', {name: 'Privacy Policy'})).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', {name: 'Log in'})).toHaveAttribute('href', '/auth/sign-in')
    expect(route.info.meta.title).toBe('Coong')
  })

  it('should expose the signed-in metadata action', async () => {
    signOut.mockResolvedValueOnce(undefined)
    updateUserMetadata.mockResolvedValueOnce(undefined)
    vi.mocked(useAuth).mockReturnValue({
      signOut,
      user: () => ({email: 'member@example.com'}),
    } as never)
    render(() => <HomePage />)

    await userEvent.click(screen.getByRole('button', {name: /member@example.com/}))
    await userEvent.click(await screen.findByRole('menuitem', {name: 'Update user metadata'}))

    await waitFor(() => expect(updateUserMetadata).toHaveBeenCalledOnce())
  })

  it('should sign out from the account menu and return home', async () => {
    signOut.mockResolvedValueOnce(undefined)
    vi.mocked(useAuth).mockReturnValue({
      signOut,
      user: () => ({email: 'member@example.com'}),
    } as never)
    render(() => <HomePage />)

    await userEvent.click(screen.getByRole('button', {name: /member@example.com/}))
    await userEvent.click(await screen.findByRole('menuitem', {name: 'Sign out'}))

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce())
    expect(navigate).toHaveBeenCalledWith('/', {replace: true})
  })
})
