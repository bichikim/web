# Web Project 
(In fact, App, Web, Server and Libraries)

[![Actions Status](https://github.com/innovirus/web/workflows/Build%20and%20Deploy/badge.svg)](https://github.com/innovirus/web/actions)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)

## Project setup
```
pnpm i
```

### Compile and hot-reload files for development

run all
``` shell
# app (web(spa), ios, android, pwa, ssr)
pnpm run dev:spa
pnpm run dev:pwa
pnpm run dev:ios
pnpm run dev:android
pnpm run dev:ssr

# server
pnpm run dev:server

```

### Compile and minify files for production (WIP)
```
pnpm run build:web
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

WIP

## Do Not

### root packages.json 에 version 을 적지 마세요.
실수로 버전에 관련된 스크립트가 돌 수 있는 것을 방지 하기 위해 지웠습니다.


## unknown issue
 - packages 안에 vue 버전이 다르면 @vue/runtime-dom @vue/runtime-core 타입추적을 *.vue 에서 못하는 경우가 생깁니다.
 - pnpm 디펜던시 관리과 quasar 디펜던시 찾기가 상이 한 점이 있어 android ios app dev 모드에서 hot reload 가 되지 않습니다.

