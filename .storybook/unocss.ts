export const storybookBackground = {
  getCSS: () => `:root {
  --storybook-blur-background:
    repeating-linear-gradient(90deg, rgb(255 255 255 / 45%) 0 2px, transparent 2px 16px),
    repeating-linear-gradient(
      135deg,
      #38bdf8 0 64px,
      #4338ca 64px 128px,
      #f472b6 128px 192px,
      #fbbf24 192px 256px
    );
}
`,
}
