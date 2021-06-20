import {createSystemConfig, system, SystemOptions} from '@winter-love/style-system'
import {ExtractPropTypes, Prop} from 'vue'
import {PropsObject} from '@winter-love/use'
import {getResponsiveProp} from 'src/lib/get-responsive-prop'
import {Property} from 'csstype'

const color = createSystemConfig({
  scale: 'colors',
})

const radii = createSystemConfig({
  scale: 'radii',
})

const border = createSystemConfig({
  scale: 'borders',
})

const space = createSystemConfig({
  scale: 'space',
})

const systemOptions = {
  backgroundColor: color(),
  bg: color({
    property: 'backgroundColor',
  }),
  border: border(),
  borderBottom: border({
    property: 'borderBottom',
  }),
  borderColor: color({
    property: 'borderColor',
  }),
  borderLeft: border({
    property: 'borderLeft',
  }),
  borderLeftColor: color({
    property: 'borderLeftColor',
  }),
  borderRadius: radii({
    property: 'borderRadius',
  }),
  borderRight: border({
    property: 'borderRight',
  }),
  borderStyle: border({
    property: 'borderStyle',
  }),
  borderTop: border({
    property: 'borderTop',
  }),
  borderWidth: space(),
  borderX: border({
    properties: ['borderLeft', 'borderRight'],
  }),
  borderY: color({
    properties: ['borderTop', 'borderBottom'],
  }),
  color: color(),
  corner: radii({
    property: 'borderRadius',
  }),
  cornerBL: radii({
    properties: ['borderBottomLeftRadius'],
  }),
  cornerBR: radii({
    properties: ['borderBottomRightRadius'],
  }),
  cornerTL: radii({
    properties: ['borderTopLeftRadius'],
  }),
  cornerTR: radii({
    properties: ['borderTopRightRadius'],
  }),
  m: space({
    property: 'margin',
  }),
  margin: space(),
  p: space({
    property: 'padding',
  }),
  padding: space(),
}

export const commons = system(systemOptions)

export type PropsKeys = keyof typeof systemOptions

export const commonProps: PropsObject<PropsKeys> = {
  backgroundColor: getResponsiveProp<Property.BackgroundColor>(),
  bg: getResponsiveProp<Property.BackgroundColor>(),
  border: getResponsiveProp<Property.Border>(),
  borderBottom: getResponsiveProp<Property.BorderBottom>(),
  borderColor: getResponsiveProp<Property.BorderColor>(),
  borderLeft: getResponsiveProp<Property.BorderLeft>(),
  borderLeftColor: getResponsiveProp<Property.BorderLeftColor>(),
  borderRadius: getResponsiveProp<Property.BorderRadius>(),
  borderRight: getResponsiveProp(),
  borderStyle: getResponsiveProp(),
  borderTop: getResponsiveProp(),
  borderWidth: getResponsiveProp(),
  borderX: getResponsiveProp(),
  borderY: getResponsiveProp(),
  color: getResponsiveProp(),
  corner: getResponsiveProp(),
  cornerBL: getResponsiveProp(),
  cornerBR: getResponsiveProp(),
  cornerTL: getResponsiveProp(),
  cornerTR: getResponsiveProp(),
  m: getResponsiveProp<Property.Margin>(),
  margin: getResponsiveProp(),
  p: getResponsiveProp(),
  padding: getResponsiveProp(),
}
