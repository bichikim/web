/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  ChangePassword: vi.fn(),
  DeleteAccount: vi.fn(),
  LegalPlaceholderArticle: vi.fn(),
  ResetPassword: vi.fn(),
  SignUp: vi.fn(),
}))

vi.mock('../(main-layout)/_components/LegalPlaceholderArticle', () => ({
  LegalPlaceholderArticle: mocks.LegalPlaceholderArticle,
}))
vi.mock('../(main-layout)/auth/change-password/_components/ChangePassword', () => ({
  ChangePassword: mocks.ChangePassword,
}))
vi.mock('../(main-layout)/auth/delete-account/_components/DeleteAccount', () => ({
  DeleteAccount: mocks.DeleteAccount,
}))
vi.mock('../(main-layout)/auth/reset-password/_components/ResetPassword', () => ({
  ResetPassword: mocks.ResetPassword,
}))
vi.mock('../(main-layout)/auth/sign-up/_components/SignUp', () => ({SignUp: mocks.SignUp}))

import NotFound from '../[...404]'
import FooPage from '../(main-layout)/(music-layout)/foo'
import CleanUpTest from '../(main-layout)/clean-up-test'
import ChangePasswordPage, {
  route as changePasswordRoute,
} from '../(main-layout)/auth/change-password'
import DeleteAccountPage, {route as deleteAccountRoute} from '../(main-layout)/auth/delete-account'
import ResetPasswordPage, {route as resetPasswordRoute} from '../(main-layout)/auth/reset-password'
import SignupPage, {route as signUpRoute} from '../(main-layout)/auth/sign-up'
import ContactPage, {route as contactRoute} from '../(main-layout)/contact'
import PrivacyPage, {route as privacyRoute} from '../(main-layout)/privacy'
import TermsPage, {route as termsRoute} from '../(main-layout)/terms'

afterEach(() => {
  vi.useRealTimers()
})

describe('simple routes', () => {
  it('should render the not-found boundary', () => {
    const {getByText} = render(() => <NotFound />)

    expect(getByText('404')).toBeInTheDocument()
  })

  it('should render shipped diagnostic routes', async () => {
    vi.useFakeTimers()
    const foo = render(() => <FooPage />)
    const cleanup = render(() => <CleanUpTest />)

    expect(foo.getByText('Foo Page')).toBeInTheDocument()
    expect(cleanup.getByText('CleanUpTest')).toBeInTheDocument()
    await vi.runAllTimersAsync()
  })

  it.each([
    [ChangePasswordPage, mocks.ChangePassword, changePasswordRoute, true],
    [DeleteAccountPage, mocks.DeleteAccount, deleteAccountRoute, false],
    [ResetPasswordPage, mocks.ResetPassword, resetPasswordRoute, true],
    [SignupPage, mocks.SignUp, signUpRoute, 'only-unauthorized'],
  ] as const)(
    'should render an auth page with its route access policy',
    (Page, child, route, access) => {
      render(() => <Page />)

      expect(child).toHaveBeenCalled()
      expect(route.info.public).toBe(access)
    },
  )

  it.each([
    [ContactPage, contactRoute, 'Contact'],
    [PrivacyPage, privacyRoute, 'Privacy Policy'],
    [TermsPage, termsRoute, 'Terms of Service'],
  ] as const)('should render legal placeholder metadata', (Page, route, title) => {
    render(() => <Page />)

    expect(mocks.LegalPlaceholderArticle).toHaveBeenCalledWith(expect.objectContaining({title}))
    expect(route.info.meta.title).toBe(title)
  })
})
