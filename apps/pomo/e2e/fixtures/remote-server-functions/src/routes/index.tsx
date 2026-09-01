import {createSignal} from 'solid-js'

import {readServerProbe} from '../server/probe'

export default function Home() {
  const [result, setResult] = createSignal('waiting')

  const handleCall = async () => {
    setResult(await readServerProbe())
  }

  return (
    <main>
      <button type="button" onClick={handleCall}>
        Call remote server function
      </button>
      <output aria-live="polite">{result()}</output>
    </main>
  )
}
