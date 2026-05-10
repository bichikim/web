import {useAuth} from 'src/store/auth'
import {createMemo, Show} from 'solid-js'
import {A, RouteDefinition, useAction} from '@solidjs/router'
import {updateUserMetadataAction} from 'src/requests/auth/update-user-metadata'

export const route = {
  info: {
    public: true,
  },
} satisfies RouteDefinition

export default function HomePage() {
  const {user, signOut} = useAuth()

  const email = createMemo(() => user()?.user_metadata?.email ?? '')

  const isSignedIn = createMemo(() => user() !== null)

  const updateUserMetadata = useAction(updateUserMetadataAction)

  const handleUpdateUserMetadata = async () => {
    await updateUserMetadata({
      metadata: {
        message: 'test message',
      },
    })
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <main class="flex flex-col gap-2 p-4 justify-center items-center h-full">
      <h1 class="text-4xl font-bold">Welcome to Coong World</h1>
      <h3>{email()}</h3>
      <nav>
        <ul>
          <li>
            <button class="text-7 underline" onClick={handleUpdateUserMetadata}>
              <span class="text-7 i-tabler:user-plus">icon</span>
              Update User Metadata
            </button>
          </li>
          <li class="">
            <A href="/piano" class="text-7 underline">
              <span class="text-7 i-tabler:piano">icon</span>
              Piano
            </A>
          </li>
          <li class="">
            <A href="/musics" class="text-7 underline">
              <span class="text-7 i-tabler:music-plus">icon</span>
              Musics
            </A>
          </li>
          <li class="">
            <A href="/auth/sign-in" class="text-7 underline">
              <span class="text-7 i-tabler:music-plus">icon</span>
              Sign In Test
            </A>
          </li>
          <Show
            when={isSignedIn()}
            fallback={
              <>
                <li class="">
                  <A href="/auth/sign-in" class="text-7 underline">
                    <span class="text-7 i-tabler:login">icon</span>
                    Sign In
                  </A>
                </li>
                <li class="">
                  <A href="/auth/reset-password" class="text-7 underline">
                    <span class="text-7 i-tabler:mail">icon</span>
                    Reset Password
                  </A>
                </li>
              </>
            }
          >
            <li class="">
              <button class="text-7 underline" onClick={handleSignOut}>
                <span class="text-7 i-tabler:logout">icon</span>
                Sign Out
              </button>
            </li>
            <li class="">
              <A href="/auth/change-password" class="text-7 underline">
                <span class="text-7 i-tabler:lock">icon</span>
                Change Password
              </A>
            </li>
            <li class="">
              <A href="/auth/delete-account" class="text-7 underline text-red-600">
                <span class="text-7 i-tabler:user-off">icon</span>
                Delete Account
              </A>
            </li>
          </Show>
        </ul>
      </nav>
    </main>
  )
}
