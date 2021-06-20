import {system} from '@winter-love/style-system'
import {Property} from 'csstype'
import {getResponsiveProp} from 'src/lib/get-responsive-prop'
import {Prop} from 'vue'

const flexSystemOptions = {
  alignContent: true,
  alignItems: true,
  alignSelf: true,
  direction: {
    property: 'flexDirection' as const,
  },
  flex: true,
  gap: (gap: Property.Gap, scale: any, props: any) => {
    const {theme} = props
    const _gap = theme?.space?.[gap] ?? gap
    return {
      // fix emotion bug -> '&' parsing is late then self style
      '&': {
        '--flex-gap': 'var(--flex-gap-container)',
        '--flex-gap-container': `calc(var(--flex-gap-parent, 0px) - ${_gap}) !important`,
        marginRight: 'var(--flex-gap)',
        marginTop: 'var(--flex-gap)',
      },

      '&>*': {
        '--flex-gap': 'var(--flex-gap-item) !important',
        '--flex-gap-item': `${_gap} !important`,
        '--flex-gap-parent': `${_gap} !important`,
        marginRight: 'var(--flex-gap)',
        marginTop: 'var(--flex-gap)',
      },
    }
  },
  grow: {
    property: 'flexGrow' as const,
  },
  justifyContent: true,
  justifyItems: true,
  justifySelf: true,
  shrink: {
    property: 'flexShrink' as const,
  },
  wrap: {
    property: 'flexWrap' as const,
  },
}

export type FlexPropsKeys = keyof typeof flexSystemOptions

export const flexSystems = system(flexSystemOptions)

export const flexProps: Record<FlexPropsKeys, Prop<any>> = {
  alignContent: getResponsiveProp(),
  alignItems: getResponsiveProp(),
  alignSelf: getResponsiveProp(),
  direction: getResponsiveProp(),
  flex: getResponsiveProp(),
  gap: getResponsiveProp(),
  grow: getResponsiveProp(),
  justifyContent: getResponsiveProp(),
  justifyItems: getResponsiveProp(),
  justifySelf: getResponsiveProp(),
  shrink: getResponsiveProp(),
  wrap: getResponsiveProp(),
}
