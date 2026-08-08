import {Title} from '@solidjs/meta'

export default function HomePage() {
  return (
    <main class="relative grid min-h-dvh place-items-center overflow-hidden bg-#17131f p-6 text-#f8edf1">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,#594560_0%,#2a2135_40%,#17131f_75%)]" />

      <section class="relative max-w-xl text-center">
        <Title>Pomo — For more focus</Title>
        <p class="text-sm tracking-[0.32em] text-#f2a7b8 uppercase">Pomo</p>
        <h1 class="mt-4 text-4xl font-700 leading-tight sm:text-6xl">For more focus.</h1>
        <p class="mx-auto mt-5 max-w-md text-base leading-7 text-#d8ccd8">
          3D 집중 공간을 만들기 위한 SolidStart 기반이 준비되었어요.
        </p>
      </section>
    </main>
  )
}
