# Coong (@winter-love/web) / Winter Love packages

![project](media/packages.svg)

이 프로젝트는 높은 유닛테스트 커버리지를 유지하여 작동 보장을 하지만 아직 개선할 사항이 많습니다. (도움!)

이 프로젝트는 당장 사용 편리를 위해 Winter Love packages 프로젝트와 Coong 프로젝트를 합친 프로젝트 입니다. Winter Love packages 를 문서를 보기 위해서 아래 링크로 이동해 주세요
[Winter Love packages document](https://winter-love.github.io/web/)

## 문서
[Winter Love packages document](https://winter-love.github.io/web/) 에 storybook 으로 @winter-love/use 문서를 우선 작성 했습니다.
다른 문서는 작성 중이며 문서를 로컬에서 실행해 볼 수 있습니다. (vite-press) 필요한 문서가 있다면 이슈에 등록해 주시면 우선 작성 하겠습니다.

## Winter Love packages

### @winter-love/use
vue composition api hook 과 연관된 유틸리티 입니다.
[vueuse](https://vueuse.org/) 와 달리 SSR 안정성이 보장 됩니다. 

### @winter-love/utils
js 유틸리티 입니다.

### @winter-love/emotion
emotion JS react 버전과 비슷한 구조의 vue emotion js 입니다.

### @winter-love/styled-system
[styled-system](https://styled-system.com/) 메인테인이 되지않아 시작한 프로젝트 입니다.
@winter-love/styled-system-next 로 재구성 중입니다.

### @winter-love/styled-system-next
@winter-love/styled-system-next 로 재구성 패키지 입니.

### @winter-love/test-use 
[@testing-library/react-hooks](https://www.npmjs.com/package/@testing-library/react-hooks) 의 vue composition api 버전 입니다
아직 실험 단계 입니다.

## Coong

[Coong.io](https://coong.io)

Coong everywhere

Coong 은 모든 세상에 있는 것을 찍먹 해보자는 생각으로 만들었으나 아직 확실한 프로젝트 방향을 정하지 않았습니다.

server (/server) 와 client (/src) 가 함께 있씁니다. quasar 프레임워크 폴더 구조문제로 폴더 구조가 일관성이 없습니다.
2021 년도 후반기 quasar 업데이트에 따라 폴더구조가 리펙터링 되리라 예상 됩니다.

```bash
yarn docs:dev
```


### Install the dependencies (yarn 3.x)
```bash
yarn
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```

### Lint the files
```bash
yarn run lint
```

### Build the app (coong.io) for production
```bash
quasar build
```

### Customize the configuration app (coong.io)
See [Configuring quasar.conf.js](https://v2.quasar.dev/quasar-cli/quasar-conf-js).
