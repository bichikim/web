import {createVariant} from '../variant'
import {system} from '../system'

const theme = {
  breakpoints: ['500px', '750px', '1200px'],
  space: {
    lg: '15px',
    md: '10px',
    sm: '5px',
  },
}

const themeVariants = {
  ...theme,
  variants: {
    lg: {
      margin: 'lg',
      padding: 'md',
    },
    md: {
      margin: 'lg',
      padding: 'sm',
    },
    sm: {
      margin: 'sm',
      padding: 'sm',
    },
  },
}

const systems = system({
  margin: {
    scale: 'space',
  },
  padding: {
    scale: 'space',
  },
})

const setup = () => {
  return createVariant(systems)
}

describe('variant', () => {
  it('should return styles', () => {
    const variant = setup()

    const variantParse = variant({
      prop: 'variant',
      scale: 'variants',
      variants: {
        lg: {
          margin: 'lg',
          padding: 'lg',
        },
      },
    })

    {
      const result = variantParse({
        theme: themeVariants,
        variant: 'lg',
      })

      expect(result).toEqual({
        margin: '15px',
        padding: '10px',
      })
    }
    {
      const result = variantParse({
        theme: themeVariants,
        variant: 'md',
      })

      expect(result).toEqual({
        margin: '15px',
        padding: '5px',
      })
    }
    {
      const result = variantParse({
        theme: themeVariants,
        variant: 'sm',
      })

      expect(result).toEqual({
        margin: '5px',
        padding: '5px',
      })
    }
    {
      const result = variantParse({
        theme: themeVariants,
        variant: 'foo',
      })

      expect(result).toEqual({})
    }
    {
      const result = variantParse({
        theme,
        variant: 'lg',
      })

      expect(result).toEqual({
        margin: '15px',
        padding: '15px',
      })
    }
  })
  it('should not return styles', () => {
    const variant = setup()

    const variantParse = variant({
      prop: 'variant',
      scale: 'variants',
    })

    {
      const result = variantParse({
        theme,
        variant: 'lg',
      })

      expect(result).toEqual({})
    }
  })
})
