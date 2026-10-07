export const typographyTheme = {
  fontFamily: {
    editor:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'editor-mono': "'SFMono-Regular', Consolas, monospace",
  },
  fontSize: {
    'editor-body': '0.6875rem',
    'editor-caption': '0.625rem',
    'editor-document-title': '1rem',
    'editor-metadata': '0.5625rem',
    'editor-micro': '0.5rem',
    'editor-reading': '0.75rem',
    'editor-title': '0.875rem',
  },
}

export const typographyShortcuts = {
  'editor-type-body': 'text-editor-body leading-normal font-normal',
  'editor-type-caption': 'text-editor-caption leading-normal font-normal',
  'editor-type-control': 'text-editor-body leading-none font-medium',
  'editor-type-document-title': 'text-editor-document-title leading-tight font-semibold',
  'editor-type-metadata': 'text-editor-metadata leading-normal font-normal',
  'editor-type-micro': 'text-editor-micro leading-normal font-normal tabular-nums',
  'editor-type-numeric': 'text-editor-body leading-none font-normal tabular-nums',
  'editor-type-reading': 'text-editor-reading leading-relaxed font-normal',
  'editor-type-root': [
    'font-editor editor-type-body [font-synthesis:none] [text-rendering:optimizeLegibility]',
    '[:where(&)_:where(button,input,select,textarea,h1,h2,h3,h4,h5,h6,legend)]:[font:inherit]',
  ],
  'editor-type-section': 'text-editor-body leading-normal font-semibold',
  'editor-type-title': 'text-editor-title leading-tight font-semibold',
}
