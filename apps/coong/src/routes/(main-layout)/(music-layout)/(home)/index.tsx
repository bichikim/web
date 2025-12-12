import {useAuth} from 'src/store/auth'
import {createEffect, createMemo, Show} from 'solid-js'
import {useAction} from '@solidjs/router'
import {updateUserMetadataAction} from 'src/requests/update-user-metadata'

export default function HomePage() {
  const {user, signOut} = useAuth()

  const email = createMemo(() => user()?.user_metadata.email ?? '')

  const isSignedIn = createMemo(() => user() !== null)

  const updateUserMetadata = useAction(updateUserMetadataAction)

  const handleUpdateUserMetadata = async () => {
    const result = await updateUserMetadata({
      metadata: {
        message: 'test message',
      },
    })

    console.log('result', result)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  createEffect(() => {
    console.log('user', user())
  })

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
            <a class="text-7 underline" href="/piano">
              <span class="text-7 i-tabler:piano">icon</span>
              Piano
            </a>
          </li>
          <li class="">
            <a class="text-7 underline" href="/musics">
              <span class="text-7 i-tabler:music-plus">icon</span>
              Musics
            </a>
          </li>
          <Show
            when={isSignedIn()}
            fallback={
              <>
                <li class="">
                  <a class="text-7 underline" href="/public/sign-in">
                    <span class="text-7 i-tabler:login">icon</span>
                    Sign In
                  </a>
                </li>
                <li class="">
                  <a class="text-7 underline" href="/public/reset-password">
                    <span class="text-7 i-tabler:mail">icon</span>
                    Reset Password
                  </a>
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
              <a class="text-7 underline" href="/change-password">
                <span class="text-7 i-tabler:lock">icon</span>
                Change Password
              </a>
            </li>
          </Show>
        </ul>
      </nav>
    </main>
  )
}
