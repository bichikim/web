import {A, useAction, useNavigate} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, Show} from 'solid-js'
import {updateUserMetadataAction} from 'src/requests/auth/update-user-metadata'
import {useAuth} from 'src/store/auth'
import {AccountMenu} from './AccountMenu'

const navItems = [
  {
    href: '/piano',
    label: 'Piano',
  },
  {
    href: '/musics',
    label: 'Musics',
  },
]

const authSignUpLinkClass = cx(
  ':uno: inline-flex h-9 items-center rounded-full bg-#111216 px-4 text-white',
  'no-underline shadow-[0_8px_20px_rgba(17,18,22,0.16)] transition-transform',
  'hover:-translate-y-0.25',
)

export const HomeHeader = () => {
  const {signOut, user} = useAuth()
  const navigate = useNavigate()
  const updateUserMetadata = useAction(updateUserMetadataAction)
  const [isUpdatingMetadata, setIsUpdatingMetadata] = createSignal(false)
  const email = createMemo(() => user()?.email ?? user()?.user_metadata?.email ?? '')

  const handleSignOut = async () => {
    await signOut()
    navigate('/', {replace: true})
  }

  /**
   * Temporary dev-only action for validating update-user-metadata.
   * Remove this menu item before release.
   */
  const handleUpdateUserMetadata = async () => {
    setIsUpdatingMetadata(true)

    try {
      await updateUserMetadata({
        metadata: {
          message: 'test message',
          updatedAt: new Date().toISOString(),
        },
      })
    } finally {
      setIsUpdatingMetadata(false)
    }
  }

  return (
    <header class=":uno: flex h-16 shrink-0 items-center justify-between px-6 md:px-8">
      <div class=":uno: flex h-full items-center gap-8">
        <A
          href="/"
          class=":uno: inline-flex h-9 items-center text-5 font-800 leading-none tracking-0 text-#101114 no-underline"
        >
          Coong
        </A>
        <nav class=":uno: hidden h-9 items-center gap-7 text-3.5 font-600 leading-none md:flex">
          <For each={navItems}>
            {(item) => (
              <A
                href={item.href}
                class=":uno: inline-flex h-9 items-center text-#101114 no-underline"
              >
                {item.label}
              </A>
            )}
          </For>
        </nav>
      </div>
      <Show
        when={email()}
        fallback={
          <div class=":uno: flex h-16 items-center gap-2 text-3.5 font-600">
            <A href="/auth/sign-in" class=":uno: hidden text-#101114 no-underline sm:inline">
              Log in
            </A>
            <A href="/auth/sign-up" class={authSignUpLinkClass}>
              Sign up
            </A>
          </div>
        }
      >
        {(signedInEmail) => (
          <AccountMenu
            isUpdatingMetadata={isUpdatingMetadata()}
            onSignOut={handleSignOut}
            onUpdateUserMetadata={handleUpdateUserMetadata}
            signedInEmail={signedInEmail}
          />
        )}
      </Show>
    </header>
  )
}
