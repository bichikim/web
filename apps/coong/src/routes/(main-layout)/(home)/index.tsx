export default function HomePage() {
  return (
    <main class="flex flex-col gap-2 p-4 justify-center items-center h-full">
      <h1 class="text-4xl font-bold">Welcome to Coong World</h1>
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
        </ul>
      </nav>
    </main>
  )
}
