import {AlphaFilter, Container} from 'pixi.js'
import {describe, expect, it, vi} from 'vitest'

import {createSceneTransitions, SceneCompositeTransitions} from '../scene-composite-transition'

const getAlphaFilter = (container: Container, index: number) => {
  const filter = container.filters?.[index]

  if (!(filter instanceof AlphaFilter)) {
    throw new Error(`Missing transition alpha filter at index ${index}`)
  }

  return filter
}

describe('SceneCompositeTransitions', () => {
  it('should fade the incoming scene as one live composited layer', () => {
    const transitions = createSceneTransitions()
    const incomingScene = new Container()

    transitions.capture(new Container())
    transitions.start(incomingScene)

    const alphaFilter = getAlphaFilter(incomingScene, 0)

    expect(alphaFilter).toBeInstanceOf(AlphaFilter)
    expect(alphaFilter.alpha).toBe(0)

    transitions.setProgress(0.4)
    expect(alphaFilter.alpha).toBe(0.4)
    transitions.setProgress(-1)
    expect(alphaFilter.alpha).toBe(0)
    transitions.setProgress(2)
    expect(alphaFilter.alpha).toBe(1)
  })

  it('should preserve existing filters and reuse the transition filter', () => {
    const transitions = new SceneCompositeTransitions()
    const incomingScene = new Container()
    const existingFilter = new AlphaFilter({alpha: 0.8})

    incomingScene.filters = [existingFilter]
    transitions.start(incomingScene)
    const transitionFilter = getAlphaFilter(incomingScene, 1)
    const destroy = vi.spyOn(transitionFilter, 'destroy')

    transitions.restore()
    transitions.start(incomingScene)

    expect(incomingScene.filters).toEqual([existingFilter, transitionFilter])
    expect(destroy).not.toHaveBeenCalled()

    transitions.destroy()
    transitions.destroy()
    expect(incomingScene.filters).toEqual([existingFilter])
    expect(destroy).toHaveBeenCalledOnce()
  })

  it('should replace an unfinished transition when capturing the next scene', () => {
    const transitions = new SceneCompositeTransitions()
    const incomingScene = new Container()

    transitions.start(incomingScene)
    const alphaFilter = getAlphaFilter(incomingScene, 0)
    const destroy = vi.spyOn(alphaFilter, 'destroy')

    transitions.capture(null)
    transitions.setProgress(0.5)

    expect(incomingScene.filters).toEqual([])
    expect(destroy).not.toHaveBeenCalled()

    transitions.destroy()
    expect(destroy).toHaveBeenCalledOnce()
  })
})
