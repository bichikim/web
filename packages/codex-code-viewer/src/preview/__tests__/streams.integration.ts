import {join} from 'node:path'
import {expect as browserExpect} from 'playwright/test'
import {expect, it} from 'vitest'
import {CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js'
import {streamEndpointSchema} from '../../shared/contracts'
import {withViewer} from './with-viewer'

it('should allow another viewer to read files while a tree consumer is paused and then closed', async () => {
  const FILE_COUNT = 600
  const files = Object.fromEntries(
    Array.from({length: FILE_COUNT}, (_, index) => [`file-${index}.txt`, `content-${index}`]),
  )
  await withViewer({files}, async (viewer) => {
    const initial = CallToolResultSchema.parse(
      await (await viewer.page.request.get(`${viewer.url}initial`)).json(),
    )
    const session = initial.structuredContent?.session
    expect(typeof session).toBe('string')
    const endpoint = streamEndpointSchema.parse(
      (
        await viewer.call('code.tree', {
          directories: [''],
          session,
          stream: true,
          transport: 'mcp',
        })
      ).structuredContent,
    )
    const batch = await viewer.call('code.stream.read', {url: endpoint.url})
    expect(batch.isError).not.toBe(true)
    expect(batch.structuredContent?.done).toBe(false)
    // Intentionally leave the cursor unread while a separate UI session performs real file work.
    await viewer.page.goto(viewer.url)
    await viewer.app
      .getByRole('combobox', {name: '파일 경로 또는 검색어'})
      .fill(join(viewer.workspace, 'file-599.txt'))
    await viewer.app.getByRole('button', {exact: true, name: '파일 열기'}).click()
    await browserExpect(viewer.app.getByText('content-599', {exact: true})).toBeVisible()
    expect((await viewer.call('code.stream.close', {url: endpoint.url})).isError).not.toBe(true)
    expect((await viewer.call('code.stream.read', {url: endpoint.url})).isError).toBe(true)
    expect((await viewer.call('code.close', {session})).isError).not.toBe(true)
    await viewer.app
      .getByRole('combobox', {name: '파일 경로 또는 검색어'})
      .fill(join(viewer.workspace, 'file-0.txt'))
    await viewer.app.getByRole('button', {exact: true, name: '파일 열기'}).click()
    await browserExpect(viewer.app.getByText('content-0', {exact: true})).toBeVisible()
    expect(viewer.errors).toEqual([])
  })
})
