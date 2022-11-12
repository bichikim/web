import {styled, css} from 'src/style'

export const glowCss = css({
  '&:before': {
    background: 'inherit',
    borderRadius: 'inherit',
    inset: '-5px',
    filter: 'blur(10px)',
    content: '',
    opacity: 0.6,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
    transition: 'all 0.5s ease 0s !important'
  },
  '&:hover:before': {

  }
})

export const UGlow =
