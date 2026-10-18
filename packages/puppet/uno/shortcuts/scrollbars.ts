const standardSupport = '[@supports_((scrollbar-width:thin)_and_(scrollbar-color:red_blue))]:'
const legacySupport = '[@supports_not_((scrollbar-width:thin)_and_(scrollbar-color:red_blue))]:'

export const scrollbarShortcuts = {
  'editor-scrollbar-compact': [
    `${standardSupport}[.puppet-editor_&]:[scrollbar-width:thin]`,
    `${legacySupport}[.puppet-editor_&::-webkit-scrollbar]:w-[0.375rem]`,
    `${legacySupport}[.puppet-editor_&::-webkit-scrollbar]:h-[0.375rem]`,
  ],
  'editor-scrollbars': [
    ...[
      '[:where(&,&_*)]:[scrollbar-width:thin]',
      '[:where(&,&_*)]:[scrollbar-color:#64786e_#101513]',
      '[@media(hover:hover)]:[:where(&,&_*):hover]:[scrollbar-width:auto]',
      '[@media(hover:hover)]:[:where(&,&_*):hover]:[scrollbar-color:#84918c_#101513]',
      '[:where(&,&_*):focus-within]:[scrollbar-width:auto]',
    ].map((rule) => `${standardSupport}${rule}`),
    ...[
      '[:where(&,&_*)::-webkit-scrollbar]:w-[0.375rem]',
      '[:where(&,&_*)::-webkit-scrollbar]:h-[0.375rem]',
      '[:where(&,&_*)::-webkit-scrollbar-track]:bg-[#101513]',
      '[:where(&,&_*)::-webkit-scrollbar-corner]:bg-[#101513]',
      '[:where(&,&_*)::-webkit-scrollbar-thumb]:bg-[#64786e]',
      '[:where(&,&_*)::-webkit-scrollbar-thumb]:rounded-full',
      '[@media(hover:hover)]:[:where(&,&_*):hover::-webkit-scrollbar]:w-[0.625rem]',
      '[@media(hover:hover)]:[:where(&,&_*):hover::-webkit-scrollbar]:h-[0.625rem]',
      '[@media(hover:hover)]:[:where(&,&_*):hover::-webkit-scrollbar-thumb]:bg-[#84918c]',
      '[:where(&,&_*):focus-within::-webkit-scrollbar]:w-[0.625rem]',
      '[:where(&,&_*):focus-within::-webkit-scrollbar]:h-[0.625rem]',
      '[@media(forced-colors:active)]:[:where(&,&_*)::-webkit-scrollbar-thumb]:[background:CanvasText]',
      '[@media(forced-colors:active)]:[:where(&,&_*)::-webkit-scrollbar-track]:[background:Canvas]',
      '[@media(forced-colors:active)]:[:where(&,&_*)::-webkit-scrollbar-corner]:[background:Canvas]',
    ].map((rule) => `${legacySupport}${rule}`),
    '[@media(forced-colors:active)]:[:where(&,&_*)]:[scrollbar-color:auto]',
  ],
}
