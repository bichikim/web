import {css, styled} from 'src/style'

export const glowCss = css({
  variants: {
    glow: {
      true: {
        '&:before': {
          background: 'inherit',
          backgroundColor: 'inherit',
          backgroundSize: 'inherit',
          borderRadius: 'inherit',
          bottom: '-5px',
          content: '',
          filter: 'blur(10px)',
          left: '-5px',
          opacity: 0.6,
          position: 'absolute',
          right: '-5px',
          top: '-5px',
          transition: '0.5s !important',
          zIndex: -1,
        },
        '&:hover:before': {
          animation: 'animate 8s linear infinite',
          bottom: '-5px',
          filter: 'blur(13px)',
          left: '-5px',
          opacity: '1',
          right: '-5px',
          top: '-5px',
        },
        position: 'relative',
        zIndex: 0,
      },
    },
  },
})

export const UGlow = styled('div', glowCss)
