/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {useDocumentChanges} from '../use-document-changes'
import {useChangeInspection} from '../use-change-inspection'
import type {FileBaseline} from '../../shared/change-contracts'

const disposals: Array<() => void> = []
afterEach(() => disposals.splice(0).forEach((dispose) => dispose()))

it('should retain an open comparison across an unchanged workspace refresh', async () => {
  let finish: (value: FileBaseline) => void = () => {}
  const baseline = {available: true, base: 'HEAD', source: 'before'}
  const readBaseline = vi
    .fn()
    .mockResolvedValueOnce(baseline)
    .mockImplementationOnce(
      () =>
        new Promise<FileBaseline>((resolve) => {
          finish = resolve
        }),
    )
  const fixture = createRoot((dispose) => {
    disposals.push(dispose)
    const [revision, update] = createSignal(0)
    const source = () => 'after'
    const changes = useDocumentChanges({
      onError: vi.fn(),
      port: {call: vi.fn(), context: vi.fn(), readBaseline, start: vi.fn()},
      revision,
      session: () => ({
        document: {
          lines: [],
          location: {column: 1, line: 1, path: 'main.txt'},
          revision: 'one',
          source: 'after',
        },
        session: 'one',
        workspace: '/project',
      }),
      source,
    })
    const inspection = useChangeInspection({
      base: changes.base,
      hunks: changes.hunks,
      path: () => 'main.txt',
      source,
    })
    return {changes, inspection, update}
  })
  await waitFor(() => expect(fixture.changes.hunks()).toHaveLength(1), {interval: 1})
  fixture.inspection.open(fixture.changes.hunks()[0])
  expect(fixture.inspection.inspection()).not.toBeNull()
  fixture.update(1)
  expect(fixture.inspection.inspection()).not.toBeNull()
  finish({...baseline, base: 'origin/main'})
  await waitFor(() => expect(fixture.changes.base()).toBe('origin/main'), {interval: 1})
  expect(fixture.inspection.inspection()).not.toBeNull()
  readBaseline.mockResolvedValueOnce({...baseline, source: 'different baseline'})
  fixture.update(2)
  await waitFor(
    () => expect(fixture.changes.hunks()[0]?.oldLines).toEqual(['different baseline']),
    {interval: 1},
  )
  expect(fixture.inspection.inspection()).toBeNull()
})
