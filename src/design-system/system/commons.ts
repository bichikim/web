import {createSystemConfig, system} from '@winter-love/style-system'
import {Property} from 'csstype'
import {getResponsiveProp} from 'src/lib/get-responsive-prop'
import {Prop} from 'vue'

const colors = createSystemConfig({
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

const sizes = createSystemConfig({
  scale: 'sizes',
})

const fontSizes = createSystemConfig({
  scale: 'fontSizes',
})

const fontWeights = createSystemConfig({
  scale: 'fontWeights',
})

const fonts = createSystemConfig({
  scale: 'fonts',
})

const filters = createSystemConfig({
  scale: 'filters',
})

const cursors = createSystemConfig({
  scale: 'cursors',
})

const lineHeights = createSystemConfig({
  scale: 'lineHeights',
})

const opacities = createSystemConfig({
  scale: 'opacities',
})

const systemOptions = {
  backgroundColor: colors(),
  bg: colors({
    property: 'backgroundColor',
  }),
  border: border(),
  borderBottom: border({
    property: 'borderBottom',
  }),
  borderColor: colors({
    property: 'borderColor',
  }),
  borderLeft: border({
    property: 'borderLeft',
  }),
  borderLeftColor: colors({
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
  borderY: colors({
    properties: ['borderTop', 'borderBottom'],
  }),
  bottom: true,
  color: colors(),
  columnGap: true,
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
  cursor: cursors(),
  display: true,
  dp: {
    property: 'display' as const,
  },
  filter: filters(),
  font: fonts(),
  fontSize: fontSizes(),
  fontStyles: true,
  fontWeight: fontWeights(),
  grid: true,
  gridAutoColumns: true,
  gridAutoFlow: true,
  gridAutoRows: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnStart: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowStart: true,
  gridTemplate: true,
  gridTemplateAreas: true,
  gridTemplateColumns: true,
  gridTemplateRows: true,
  height: sizes(),
  left: true,
  letterSpacing: true,
  lineHeight: lineHeights(),
  m: space({
    property: 'margin',
  }),
  margin: space(),
  marginBottom: space(),
  marginLeft: space(),
  marginRight: space(),
  marginTop: space(),
  marginX: space({
    properties: ['marginLeft', 'marginRight'],
  }),
  marginY: space({
    properties: ['marginTop', 'marginBottom'],
  }),
  maxHeight: sizes({
    property: 'maxHeight',
  }),
  maxWidth: sizes({
    property: 'maxWidth',
  }),
  mb: space({
    property: 'marginBottom',
  }),
  minHeight: sizes({
    property: 'minHeight',
  }),
  minWidth: sizes({
    property: 'minWidth',
  }),
  ml: space({
    property: 'marginLeft',
  }),
  mr: space({
    property: 'marginRight',
  }),
  mt: space({
    property: 'marginTop',
  }),
  opacity: opacities(),
  overflow: true,
  overflowX: true,
  overflowY: true,
  p: space({
    property: 'padding',
  }),
  padding: space(),
  paddingBottom: space({
    property: 'paddingBottom',
  }),
  paddingLeft: space({
    property: 'paddingLeft',
  }),
  paddingRight: space({
    property: 'paddingRight',
  }),
  paddingTop: space({
    property: 'paddingTop',
  }),
  paddingX: space({
    properties: ['paddingLeft', 'paddingRight'],
  }),
  paddingY: space({
    properties: ['paddingTop', 'paddingBottom'],
  }),
  pb: space({
    property: 'paddingBottom',
  }),
  pl: space({
    property: 'paddingLeft',
  }),
  position: true,
  pr: space({
    property: 'paddingRight',
  }),
  pt: space({
    property: 'paddingTop',
  }),
  px: space({
    properties: ['paddingLeft', 'paddingRight'],
  }),
  py: space({
    properties: ['paddingTop', 'paddingBottom'],
  }),
  right: true,
  rowGap: true,
  size: sizes({
    properties: ['width', 'height'],
  }),
  textAlign: true,
  top: true,
  verticalAlign: true,
  whiteSpace: true,
  width: sizes(),
}

export const commons = system(systemOptions)

export type CommonsPropKeys = keyof typeof systemOptions

export const commonProps: Record<CommonsPropKeys, Prop<any>> = {
  backgroundColor: getResponsiveProp<Property.BackgroundColor>(),
  bg: getResponsiveProp<Property.BackgroundColor | string>(),
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
  bottom: getResponsiveProp<Property.Bottom>(),
  color: getResponsiveProp(),
  columnGap: getResponsiveProp<Property.ColumnGap>(),
  corner: getResponsiveProp(),
  cornerBL: getResponsiveProp(),
  cornerBR: getResponsiveProp(),
  cornerTL: getResponsiveProp(),
  cornerTR: getResponsiveProp(),
  cursor: getResponsiveProp<Property.Cursor>(),
  display: getResponsiveProp<Property.Display>(),
  dp: getResponsiveProp<Property.Display>(),
  filter: getResponsiveProp<Property.Filter>(),
  font: getResponsiveProp<Property.Font>(),
  fontSize: getResponsiveProp<Property.FontSize>(),
  fontStyles: getResponsiveProp(),
  fontWeight: getResponsiveProp<Property.FontWeight>(),
  grid: getResponsiveProp<Property.Grid>(),
  gridAutoColumns: getResponsiveProp<Property.GridAutoColumns>(),
  gridAutoFlow: getResponsiveProp<Property.GridAutoFlow>(),
  gridAutoRows: getResponsiveProp<Property.GridAutoRows>(),
  gridColumn: getResponsiveProp<Property.GridColumn>(),
  gridColumnEnd: getResponsiveProp<Property.GridColumnEnd>(),
  gridColumnStart: getResponsiveProp<Property.GridColumnStart>(),
  gridRow: getResponsiveProp<Property.GridRow>(),
  gridRowEnd: getResponsiveProp<Property.GridRowEnd>(),
  gridRowStart: getResponsiveProp<Property.GridRowStart>(),
  gridTemplate: getResponsiveProp<Property.GridTemplate>(),
  gridTemplateAreas: getResponsiveProp<Property.GridTemplateAreas>(),
  gridTemplateColumns: getResponsiveProp<Property.GridAutoColumns>(),
  gridTemplateRows: getResponsiveProp<Property.GridTemplateRows>(),
  height: getResponsiveProp(),
  left: getResponsiveProp<Property.Left>(),
  letterSpacing: getResponsiveProp(),
  lineHeight: getResponsiveProp<Property.LineHeight>(),
  m: getResponsiveProp<Property.Margin>(),
  margin: getResponsiveProp(),
  marginBottom: getResponsiveProp(),
  marginLeft: getResponsiveProp(),
  marginRight: getResponsiveProp(),
  marginTop: getResponsiveProp(),
  marginX: getResponsiveProp(),
  marginY: getResponsiveProp(),
  maxHeight: getResponsiveProp<Property.MaxHeight>(),
  maxWidth: getResponsiveProp<Property.MaxWidth>(),
  mb: getResponsiveProp(),
  minHeight: getResponsiveProp<Property.MinHeight>(),
  minWidth: getResponsiveProp<Property.MinWidth>(),
  ml: getResponsiveProp(),
  mr: getResponsiveProp(),
  mt: getResponsiveProp(),
  opacity: getResponsiveProp<Property.Opacity>(),
  overflow: getResponsiveProp<Property.Overflow>(),
  overflowX: getResponsiveProp<Property.OverflowX>(),
  overflowY: getResponsiveProp<Property.OverflowY>(),
  p: getResponsiveProp(),
  padding: getResponsiveProp(),
  paddingBottom: getResponsiveProp(),
  paddingLeft: getResponsiveProp(),
  paddingRight: getResponsiveProp(),
  paddingTop: getResponsiveProp(),
  paddingX: getResponsiveProp(),
  paddingY: getResponsiveProp(),
  pb: getResponsiveProp(),
  pl: getResponsiveProp(),
  position: getResponsiveProp<Property.Position>(),
  pr: getResponsiveProp(),
  pt: getResponsiveProp(),
  px: getResponsiveProp(),
  py: getResponsiveProp(),
  right: getResponsiveProp<Property.Right>(),
  rowGap: getResponsiveProp<Property.RowGap>(),
  size: getResponsiveProp<Property.Width>(),
  textAlign: getResponsiveProp(),
  top: getResponsiveProp<Property.Top>(),
  verticalAlign: getResponsiveProp<Property.VerticalAlign>(),
  whiteSpace: getResponsiveProp(),
  width: getResponsiveProp(),
}
