import {useAuth} from 'src/store/auth'
import {createMemo, Show} from 'solid-js'
import {RouteDefinition, useAction} from '@solidjs/router'
import {updateUserMetadataAction} from 'src/requests/update-user-metadata'
import {HAnchor} from 'src/components/anchor/HAnchor'

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
    const result = await updateUserMetadata({
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
            <HAnchor hrefName="piano" class="text-7 underline">
              <span class="text-7 i-tabler:piano">icon</span>
              Piano
            </HAnchor>
          </li>
          <li class="">
            <HAnchor hrefName="musics" class="text-7 underline">
              <span class="text-7 i-tabler:music-plus">icon</span>
              Musics
            </HAnchor>
          </li>
          <li class="">
            <HAnchor hrefName="sign-in" class="text-7 underline">
              <span class="text-7 i-tabler:music-plus">icon</span>
              Sign In Test
            </HAnchor>
          </li>
          <Show
            when={isSignedIn()}
            fallback={
              <>
                <li class="">
                  <HAnchor hrefName="sign-in" class="text-7 underline">
                    <span class="text-7 i-tabler:login">icon</span>
                    Sign In
                  </HAnchor>
                </li>
                <li class="">
                  <HAnchor hrefName="reset-password" class="text-7 underline">
                    <span class="text-7 i-tabler:mail">icon</span>
                    Reset Password
                  </HAnchor>
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
              <HAnchor hrefName="change-password" class="text-7 underline">
                <span class="text-7 i-tabler:lock">icon</span>
                Change Password
              </HAnchor>
            </li>
          </Show>
        </ul>
      </nav>
    </main>
  )
}
