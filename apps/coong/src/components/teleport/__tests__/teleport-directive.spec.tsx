/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {describe, expect, it} from 'vitest'

import {teleport} from '../teleport-directive'

describe('teleport', () => {
  it('should move an element to the resolved target and remove it on cleanup', () => {
    const target = document.createElement('section')
    const element = document.createElement('div')
    document.body.append(target)

    const dispose = createRoot((disposeRoot) => {
      teleport(element, () => target)
      return disposeRoot
    })

    expect(target).toContainElement(element)
    dispose()
    expect(target).not.toContainElement(element)
  })
})
