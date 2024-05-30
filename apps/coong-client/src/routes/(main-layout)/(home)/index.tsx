import Counter from 'src/components/Counter'

export default function Index() {
  return (
    <main>
      <h1 class="text-green">Hello world!</h1>
      <Counter />
      <div class="flex">
        <div class="flex flex-col">
          <span>foo</span>
          <span>foo</span>
        </div>
        <div>
          <span>bar</span>
        </div>
      </div>
      <p>
        Visit{' '}
        <a href="https://start.solidjs.com" target="_blank">
          start.solidjs.com
        </a>{' '}
        to learn how to build SolidStart apps.
      </p>
    </main>
  )
}
