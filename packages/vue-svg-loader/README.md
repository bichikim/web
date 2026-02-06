# @winter-love/vue-svg-loader

Vue SVG loader that optimizes SVG files using SVGO and converts them to Vue templates.

## Installation

```bash
pnpm add @winter-love/vue-svg-loader
```

## Usage

Configure in your webpack config:

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@winter-love/vue-svg-loader',
            options: {
              svgo: {
                // SVGO options
              }
            }
          }
        ]
      }
    ]
  }
}
```

## Options

- `svgo`: SVGO configuration object. Set to `false` to disable optimization.
