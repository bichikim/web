import {$$$CSS_COMPONENT_PROPS, getComposersProps} from '../'

describe('getComposersProps', () => {
  const composers = [
    {
      variants: {
        size: {
          sm: {
            width: '100px',
          },
        },
        space: {
          sm: {
            padding: '10px',
          },
        },
      },
    },
    {
      variants: {
        color: {
          red: {
            color: 'red',
          },
        },
      },
    },
  ]
  it('should return props', () => {
    const props = getComposersProps(composers)

    expect(props).toEqual(['size', 'space', 'color'])
  })
  it('should return props with null composer', () => {
    const props = getComposersProps([null])

    expect(props).toEqual([])
  })
  it('should return props with css', () => {
    const css = Object.assign(() => null, {
      [$$$CSS_COMPONENT_PROPS]: ['foo'],
    })
    const props = getComposersProps([...composers, css])
    expect(props).toEqual(['size', 'space', 'color', 'foo'])
  })
  it('should return props with css (no component props)', () => {
    const css = Object.assign(() => null, {})
    const props = getComposersProps([...composers, css])
    expect(props).toEqual(['size', 'space', 'color'])
  })
})
