
[![Actions Status](https://github.com/innovirus/web/workflows/Build%20and%20Deploy/badge.svg)](https://github.com/innovirus/web/actions)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)

# web
Web project MVP


## Project setup
```
pnpm i
```

### Compile and hot-reload files for development

run all
``` shell
# @vue/cli
pnpm run dev:web

# snow-pack
pnpm run dev:web-snow

# quasar
pnpm run dev:web-quasar

# vite
pnpm run dev:web-vite

# server
pnpm run server

```

### Compile and minify files for production
```
pnpm run build:web[-name]
```

### Run your unit tests (WIP)
```
pnpm run test:unit
```

### Lints and fixes files (WIP)
```
pnpm run lint
```

### generate icons (WIP)
```
pnpm run icons
```

## URLS

service [url](https://web-prod-bc72c.firebaseapp.com/) 


## unknown issue

packages 안에 vue 버전이 다르면 @vue/runtime-dom @vue/runtime-core 타입을 *.vue 에서 못 추적 하는 경우가 생김

