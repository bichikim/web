import * as composition from '../'

describe('composition', () => {
  it('should have all functions', () => {
    expect(Object.keys(composition)).toMatchInlineSnapshot(`
      [
        "isComponent",
        "isComponentInstance",
        "isElement",
        "isInInstance",
        "isToRef",
        "isWritableToRef",
        "isWritableRef",
        "onAnimationRepeater",
        "onClickOutside",
        "onDomMounted",
        "onElementIntersection",
        "onElementMutation",
        "onElementResize",
        "onEvent",
        "onFocus",
        "useImmer",
        "useRequest",
        "onRouteHistory",
        "stopRouteHistory",
        "bunchRef",
        "defaultRef",
        "mutRef",
        "resolveRef",
        "setRef",
        "storageRef",
        "toDeepRef",
        "toggleRef",
        "getRef",
        "unref",
        "watchExtended",
        "createAsElement",
        "debug",
        "CONTEXT_KEY",
        "defineContext",
        "preferParentContext",
        "getComponentElement",
        "html",
      ]
    `)
  })
})
