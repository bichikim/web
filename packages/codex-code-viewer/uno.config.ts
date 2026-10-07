import {icons as tablerIcons} from '@iconify-json/tabler'
import {defineConfig, presetIcons, presetWind3} from 'unocss'

const tablerCollection = {
  ...tablerIcons,
  icons: Object.fromEntries(
    Object.entries(tablerIcons.icons).map(([name, icon]) => [
      name,
      {...icon, body: icon.body.replaceAll('stroke-width="2"', 'stroke-width="1.6"')},
    ]),
  ),
}

export default defineConfig({
  preflights: [
    {
      getCSS: () => `
        *, ::before, ::after { box-sizing: border-box; border: 0 solid; }
        .pdf-text-layer ::selection { background: rgb(0 100 255 / 0.25); color: transparent; }
        button, input, select { font: inherit; color: inherit; background: transparent; }
        button, input { appearance: none; }
        button { cursor: pointer; }
        :root {
          color-scheme: light;
          --viewer-background: #ffffff;
          --viewer-surface: #f9f9f9;
          --viewer-foreground: #202020;
          --viewer-muted: #666666;
          --viewer-border: #e5e5e5;
          --viewer-hover-alpha: 8%;
          --viewer-pressed-alpha: 12%;
          --viewer-outline-alpha: 2%;
          --viewer-outline-pressed-alpha: 4%;
          --viewer-border-hover-alpha: 20%;
          --viewer-text: var(--color-text-primary, var(--viewer-foreground));
          --viewer-canvas: var(--color-background-primary, var(--viewer-background));
          --viewer-action: var(--color-background-inverse, var(--viewer-foreground));
          --viewer-hover: color-mix(in srgb, var(--viewer-text) var(--viewer-hover-alpha), transparent);
          --viewer-pressed: color-mix(in srgb, var(--viewer-text) var(--viewer-pressed-alpha), transparent);
          --viewer-border-hover: color-mix(in srgb, var(--viewer-text) var(--viewer-border-hover-alpha), transparent);
          --viewer-field-hover: color-mix(in srgb,
            var(--viewer-text) var(--viewer-outline-alpha), var(--viewer-canvas));
          --viewer-field-pressed: color-mix(in srgb,
            var(--viewer-text) var(--viewer-outline-pressed-alpha), var(--viewer-canvas));
          --viewer-action-hover: color-mix(in srgb, var(--viewer-action) 90%, var(--viewer-canvas));
          --viewer-action-pressed: color-mix(in srgb, var(--viewer-action) 82%, var(--viewer-canvas));
          --viewer-control-shadow: 0 1px 2px -1px rgb(0 0 0 / 0.08);
          --viewer-toolbar-shadow: 0 2px 4px rgb(0 0 0 / 0.02), 0 6px 16px -6px rgb(0 0 0 / 0.06);
          --viewer-tree-icon: #0169cc;
          --viewer-tree-background: color-mix(in srgb, var(--viewer-tree-icon) 10%, var(--viewer-canvas));
          --viewer-tree-hover: color-mix(in srgb, var(--viewer-tree-icon) 16%, var(--viewer-canvas));
          --viewer-panel-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.08);
          --viewer-selection: #ecf2ff;
          --viewer-search: #fff0b5;
          --viewer-accent: #0169cc;
          --viewer-comment: #596b60;
          --viewer-keyword: #7041a1;
          --viewer-number: #995109;
          --viewer-string: #17623b;
        }
        :root[data-theme="dark"] {
          color-scheme: dark;
          --viewer-background: #181818;
          --viewer-surface: #202020;
          --viewer-foreground: #ececec;
          --viewer-muted: #aaaaaa;
          --viewer-border: #383838;
          --viewer-hover-alpha: 12%;
          --viewer-pressed-alpha: 16%;
          --viewer-outline-alpha: 4%;
          --viewer-outline-pressed-alpha: 6%;
          --viewer-border-hover-alpha: 30%;
          --viewer-toolbar-shadow: 0 2px 4px rgb(0 0 0 / 0.12), 0 6px 16px -6px rgb(0 0 0 / 0.21);
          --viewer-tree-icon: #70b9ff;
          --viewer-tree-background: color-mix(in srgb, var(--viewer-tree-icon) 14%, var(--viewer-canvas));
          --viewer-tree-hover: color-mix(in srgb, var(--viewer-tree-icon) 20%, var(--viewer-canvas));
          --viewer-selection: #28364b;
          --viewer-search: #514411;
          --viewer-accent: #0285ff;
          --viewer-comment: #99b39f;
          --viewer-keyword: #d7acff;
          --viewer-number: #f3b77d;
          --viewer-string: #93d6ac;
        }
      `,
    },
  ],
  presets: [
    presetWind3(),
    presetIcons({
      collections: {tabler: () => tablerCollection},
      warn: true,
    }),
  ],
  safelist: ['border-0', 'h-screen', 'ui-tree-toggle', 'w-full'],
  shortcuts: {
    'tree-guides': [
      '[background-image:repeating-linear-gradient(to_right,',
      'transparent_0px,transparent_15px,var(--viewer-border)_15px,',
      'var(--viewer-border)_16px)]',
    ].join(''),
    'ui-button': [
      'ui-focus ui-transition inline-flex shrink-0 items-center justify-center gap-2 rounded-control',
      'border border-divider bg-canvas px-3 py-2 text-sm font-medium shadow-control',
      'enabled:hover:bg-control-hover enabled:hover:border-hover-border enabled:active:bg-control-pressed',
    ].join(' '),
    'ui-document-button': 'ui-button ui-document-control py-1',
    'ui-document-control': 'h-[calc(var(--font-text-sm-line-height,20px)_+_10px)]',
    'ui-field': [
      'ui-transition flex min-w-0 items-center gap-2 rounded-field border border-divider',
      'bg-canvas px-3 shadow-control',
      'hover:bg-control-hover hover:border-hover-border',
    ].join(' '),
    'ui-focus': [
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
      'disabled:cursor-default disabled:opacity-40 disabled:shadow-none',
    ].join(' '),
    'ui-icon-button': [
      'ui-focus ui-transition inline-flex h-[var(--icon-button-size,32px)] w-[var(--icon-button-size,32px)]',
      'shrink-0 items-center justify-center rounded-pill',
      'bg-transparent text-muted enabled:hover:bg-hover enabled:hover:text-foreground enabled:active:bg-pressed',
      'aria-[expanded=true]:bg-hover aria-[expanded=true]:text-foreground',
    ].join(' '),
    'ui-input': [
      'ui-transition min-w-0 rounded-control border border-divider bg-canvas px-3 py-2 text-sm outline-none',
      'disabled:cursor-default disabled:opacity-40 disabled:shadow-none',
      'shadow-control placeholder:text-muted',
      'enabled:hover:bg-control-hover enabled:hover:border-hover-border',
    ].join(' '),
    'ui-navigation-button': 'ui-icon-button [--icon-button-size:26px] text-foreground',
    'ui-primary': [
      'ui-focus ui-transition inline-flex shrink-0 items-center justify-center gap-2 rounded-pill bg-action',
      'px-4 py-2 text-sm font-medium text-action-text shadow-control',
      'enabled:hover:bg-action-hover enabled:active:bg-action-pressed',
    ].join(' '),
    'ui-row': 'ui-focus ui-transition enabled:hover:bg-hover enabled:active:bg-pressed',
    'ui-toolbar-icon-button':
      'ui-icon-button [--icon-button-size:var(--toolbar-control-height,33px)]',
    'ui-transition': [
      'transition-[background-color,border-color,color,box-shadow,opacity] duration-150 ease-[ease]',
      'motion-reduce:transition-none',
    ].join(' '),
    'ui-tree-toggle': [
      'ui-toolbar-icon-button border border-divider bg-canvas text-foreground shadow-toolbar',
      'aria-[expanded=true]:bg-tree-background aria-[expanded=true]:text-tree-icon',
      'aria-[expanded=true]:enabled:hover:bg-tree-hover aria-[expanded=true]:enabled:hover:text-tree-icon',
      'aria-[expanded=true]:enabled:active:bg-tree-hover',
    ].join(' '),
  },
  theme: {
    animation: {
      counts: {'toast-dismiss': '1', 'toast-expire': '1'},
      durations: {'toast-dismiss': '5s', 'toast-expire': '5s'},
      keyframes: {
        'toast-dismiss': '{0%, 97% {opacity: 1;} 100% {opacity: 0;}}',
        'toast-expire': '{0%, 100% {opacity: 1;}}',
      },
    },
    borderRadius: {
      control: 'var(--border-radius-md, 12px)',
      field: 'var(--border-radius-lg, 16px)',
      panel: 'var(--border-radius-xl, 20px)',
      pill: 'var(--border-radius-full, 9999px)',
      row: 'var(--border-radius-sm, 8px)',
    },
    boxShadow: {
      control: 'var(--shadow-sm, var(--viewer-control-shadow))',
      panel: 'var(--shadow-md, var(--viewer-panel-shadow))',
      toast: 'var(--shadow-lg, 0 8px 28px rgb(0 0 0 / 0.12))',
      toolbar: 'var(--viewer-toolbar-shadow)',
    },
    colors: {
      accent: 'var(--color-ring-primary, var(--viewer-accent))',
      action: 'var(--color-background-inverse, var(--viewer-foreground))',
      'action-hover': 'var(--viewer-action-hover)',
      'action-pressed': 'var(--viewer-action-pressed)',
      'action-text': 'var(--color-text-inverse, var(--viewer-background))',
      canvas: 'var(--color-background-primary, var(--viewer-background))',
      comment: 'var(--viewer-comment)',
      'control-hover': 'var(--viewer-field-hover)',
      'control-pressed': 'var(--viewer-field-pressed)',
      divider: 'var(--color-border-primary, var(--viewer-border))',
      foreground: 'var(--color-text-primary, var(--viewer-foreground))',
      hover: 'var(--viewer-hover)',
      'hover-border': 'var(--viewer-border-hover)',
      keyword: 'var(--viewer-keyword)',
      muted: 'var(--color-text-secondary, var(--viewer-muted))',
      number: 'var(--viewer-number)',
      pressed: 'var(--viewer-pressed)',
      search: 'var(--color-background-warning, var(--viewer-search))',
      selection: 'var(--color-background-info, var(--viewer-selection))',
      string: 'var(--viewer-string)',
      surface: 'var(--color-background-secondary, var(--viewer-surface))',
      'tree-background': 'var(--viewer-tree-background)',
      'tree-hover': 'var(--viewer-tree-hover)',
      'tree-icon': 'var(--viewer-tree-icon)',
    },
    fontFamily: {
      mono: 'var(--font-mono, ui-monospace, monospace)',
      sans: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
    },
    fontSize: {
      sm: ['var(--font-text-sm-size, 13px)', 'var(--font-text-sm-line-height, 20px)'],
      xs: ['var(--font-text-xs-size, 12px)', 'var(--font-text-xs-line-height, 18px)'],
    },
    fontWeight: {
      medium: 'var(--font-weight-medium, 500)',
      semibold: 'var(--font-weight-semibold, 600)',
    },
  },
})
