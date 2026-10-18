import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {expect, it} from 'vitest'
import {withUpdateLock} from '../with-update-lock'

it('should exclude another process and recover its lock after that process is killed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'viewer-update-process-'))
  const source = new URL('../with-update-lock.ts', import.meta.url).href
  const child = spawn(
    process.execPath,
    [
      '--import',
      import.meta.resolve('tsx'),
      '--input-type=module',
      '--eval',
      `import {withUpdateLock} from ${JSON.stringify(source)};
     await withUpdateLock(${JSON.stringify(root)}, () => new Promise(resolve => {
       process.once('message', resolve);
       process.send('locked');
     }));`,
    ],
    {stdio: ['ignore', 'ignore', 'pipe', 'ipc']},
  )
  const controller = new AbortController()
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)])
  const exited = once(child, 'close')
  let errorOutput = ''
  child.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
    errorOutput += chunk
  })
  try {
    const ready = await Promise.race([
      once(child, 'message', {signal}),
      exited.then(() => {
        throw new Error(`Lock process exited before readiness: ${errorOutput}`)
      }),
    ])
    expect(ready).toEqual(['locked', undefined])
    await expect(withUpdateLock(root, async () => {})).rejects.toMatchObject({
      code: 'update-in-progress',
    })
    child.kill('SIGKILL')
    await exited
    await expect(withUpdateLock(root, async () => {})).resolves.toBeUndefined()
  } finally {
    controller.abort()
    child.kill('SIGKILL')
    await exited
    await rm(root, {force: true, recursive: true})
  }
})
