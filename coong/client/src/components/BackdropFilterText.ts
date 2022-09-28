import {css} from 'boot/hyper-components'
import {defineComponent, getCurrentInstance, h} from 'vue'

const rootClass = css({
  $$activeColor: 'rgba(255, 255, 255, 0.2)',
  $$filter: 'blur(5px)',
  $$urlId: 'url(#lockup-headline-mask-pat)',
  '& .headline': {
    display: 'none',
    fontSize: '1em',
    fontWeight: 'inherit',
    height: '150px',
    width: '100%',
  },
  '@supports (backdrop-filter: blur(5px))': {
    '&': {
      backdropFilter: '$$filter',
      background: '$$activeColor',
      clipPath: '$$urlId',
      color: 'transparent',
    },
    '& .headline': {
      display: 'block',
    },
    '& .visually-hidden': {
      left: '-9999px',
      position: 'absolute',
      top: '-9999px',
    },
  },
  position: 'relative',
})

export const BackdropFilterText = defineComponent({
  name: 'BackdropFilterText',
  props: {
    dy: {default: '0.35em', type: String},
  },
  setup: (props, {slots}) => {
    const instance = getCurrentInstance()
    const id = `clip-path-${instance?.uid ?? 'any'}`
    return () =>
      h(
        'div',
        {
          class: rootClass({
            css: {
              $$urlId: `url(#${id})`,
            },
          }).className,
        },
        [
          h('span', slots.default?.()),
          // svg
          h(
            'svg',
            {
              'aria-hidden': 'true',
              class: 'headline lockup-headline-mask visually-hidden',
            },
            [
              h('clipPath', {id}, [
                h(
                  'text',
                  {
                    'dominant-baseline': 'hanging',
                    dy: props.dy,
                    'text-anchor': 'middle',
                    x: '50%',
                    y: '0em',
                  },
                  [slots.default?.()],
                ),
              ]),
            ],
          ),
        ],
      )
  },
})
