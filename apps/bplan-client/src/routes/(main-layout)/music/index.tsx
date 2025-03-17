import {cx} from 'class-variance-authority'
import {client} from 'src/trpc/client'
import {createEffect, createResource} from 'solid-js'

const linkStyle = cx(
  'cursor-pointer text-6 flex items-center text-black mt-5 underline',
  'text-center',
)

const getHello = async () => {
  // 'use server'
  const hello = await client.user.getUser.query()

  console.log(hello)

  return hello
}

export default function MusicPage() {
  const [hello] = createResource(getHello)

  createEffect(() => {
    console.log(hello())
  })

  return (
    <main class="flex flex-col items-center justify-center h-full px-2">
      <h1 class="text-4xl font-bold leading-15 text-center">MIDI File Market Page</h1>
      <h3 class="text-2xl text-center">Working in progress...</h3>
      <a href="/" class={linkStyle}>
        Go back to piano <span class="h-6 w-6 inline-block bg-black i-tabler:piano" />
      </a>
    </main>
  )
}
