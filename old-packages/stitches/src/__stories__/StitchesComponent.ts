import {createVueStitches} from '../create-stitches'

const stitches = createVueStitches({
  media: {
    bp1: '(min-width: 640px)',
    bp2: '(min-width: 768px)',
    bp3: '(min-width: 1024px)',
  },
  theme: {
    colors: {},
  },
  utils: {
    m: (value) => ({margin: value}),
  },
})

export const StitchesComponent = stitches.styled('div', {
  color: 'red',
  m: '10px',
})
