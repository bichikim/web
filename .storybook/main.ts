import type { StorybookConfig } from "storybook-solidjs-vite";

const config: StorybookConfig = {
  stories: [
    "../coong/solid-client/src/**/*.mdx",
    "../coong/solid-client/src/**/*.story.@(js|jsx|mjs|ts|tsx)",
    "../packages/solid/src/**/*.mdx",
    "../packages/solid/src/**/*.story.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "storybook-solidjs-vite",
    options: {
      builder: {
        viteConfigPath: './.storybook/vite.config.mts',
      }
    },
  },
  docs: {
    autodocs: "tag",
  },
};
export default config;
