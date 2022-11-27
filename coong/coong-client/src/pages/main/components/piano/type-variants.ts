import {css} from '@winter-love/uni'

export const typeVariants = css({
  defaultVariants: {
    type: 'flat',
  },
  variants: {
    type: {
      emptySharp: {
        width: '50px',
      },
      flat: {
        '&[data-down]': {
          boxShadow: '0 2px 2px rgb(0 0 0 / 40%)',
          transform: 'scale(1, 0.99)',
          transformOrigin: 'top',
        },
        '&[data-down]:after': {
          backgroundColor: '#000000',
          content: '',
          height: '100%',
          left: -2.5,
          opacity: 0.1,
          position: 'absolute',
          top: 0,
          transform: 'skew(0.5deg, 0)',
          width: 5,
        },
        '&[data-down]:before': {
          backgroundColor: '#000000',
          content: '',
          height: '100%',
          opacity: 0.1,
          position: 'absolute',
          right: -2.5,
          top: 0,
          transform: 'skew(-0.5deg, 0)',
          width: 5,
        },
        '.key-name': {
          color: 'gray',
        },
        width: '80px',
      },
      sharp: {
        '&[data-down]': {
          borderBottomWidth: '2px',
          boxShadow:
            'inset 0px -1px 1px rgb(255 255 255 / 40%), 0 1px 0px rgb(0 0 0 / 80%),' +
            ' 0 2px 2px rgb(0 0 0 / 40%), 0 -1px 0px #000',
        },
        '.key-name': {
          color: 'white',
        },
        background: 'linear-gradient(-20deg,#333,#000,#333)',
        backgroundColor: 'black',
        borderColor: '#666 #222 #111 #555',
        borderRadius: '0 0 2px 2px',
        borderStyle: 'solid',
        borderWidth: '1px 2px 10px',
        boxShadow: 'inset 0px -1px 2px rgb(255 255 255 / 40%), 0 2px 3px rgb(0 0 0 / 40%)',
        width: '50px',
      },
    },
  },
})
