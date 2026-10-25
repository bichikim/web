/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {expect, it} from 'vitest'
import {useChangeInspection} from '../use-change-inspection'
import {createLineChanges} from '../create-line-changes'

it('should toggle and navigate the selected hunk and clear stale content after a source update', () => {
  const fixture = createRoot((dispose) => {
    const [source, setSource] = createSignal('a\nB\nc\nD')
    const hunks = createLineChanges('a\nb\nc\nd', source())
    const inspection = useChangeInspection({
      base: () => 'HEAD',
      hunks: () => hunks,
      path: () => 'main.txt',
      source,
    })
    return {dispose, hunks, inspection, setSource}
  })
  try {
    fixture.inspection.open(fixture.hunks[0])
    expect(fixture.inspection.inspection()?.active).toBe(0)
    fixture.inspection.open(fixture.hunks[0])
    expect(fixture.inspection.inspection()).toBeNull()
    fixture.inspection.open(fixture.hunks[0])
    fixture.inspection.navigate(1)
    expect(fixture.inspection.inspection()?.active).toBe(1)
    fixture.setSource('different')
    expect(fixture.inspection.inspection()).toBeNull()
  } finally {
    fixture.dispose()
  }
})
