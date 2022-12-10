export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

export const globalTypes ={
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'light-theme', title: 'Light', icon: 'circlehollow' },
        { value: 'dark-theme', title: 'Dark', icon: 'circle' },
      ],
      showName: true,
      dynamicTitle: true,
    }
  }
}

const withTheme = (Story, context) => ({
  components: { Story },
  template: '<div :class="theme"><story /></div>',
  setup: () => {
    return {
      theme: context.globals.theme
    }
  }
})

export const decorators = [
  withTheme,
]