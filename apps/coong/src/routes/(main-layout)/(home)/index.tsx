import {useAuth} from 'src/store/auth'
import {createEffect, createMemo} from 'solid-js'

export default function HomePage() {
  const {user, signOut} = useAuth()

  const email = createMemo(() => user()?.user_metadata.email ?? '')

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <main class="flex flex-col gap-2 p-4 justify-center items-center h-full">
      <h1 class="text-4xl font-bold">Welcome to Coong World</h1>
      <h3>{email()}</h3>
      <nav>
        <ul>
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
          <li class="">
            <a class="text-7 underline" href="/public/sign-in">
              <span class="text-7 i-tabler:login">icon</span>
              Sign In
            </a>
          </li>
          <li class="">
            <button class="text-7 underline" onClick={handleSignOut}>
              <span class="text-7 i-tabler:logout">icon</span>
              Sign Out
            </button>
          </li>
        </ul>
      </nav>
    </main>
  )
}
