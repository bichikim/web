document.body.className = 'm-0 bg-white'
document.body.innerHTML = `<style>@unocss-placeholder</style>
<main class="flex gap-4">
  <section>
    <h1 class="m-0 text-base">Cubism SDK for Web</h1>
    <div class="w-[600px] h-[842px]"><canvas id="cubism" width="600" height="842"></canvas></div>
  </section>
  <section>
    <h1 class="m-0 text-base">Poffo</h1>
    <div id="poffo-host" class="w-[600px] h-[842px]">
      <canvas id="poffo" width="600" height="842"></canvas>
    </div>
  </section>
</main>`
