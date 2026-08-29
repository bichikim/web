# `@winter-love/vite-plugin-key-similarity`

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

这是一个 Vite 插件，它使用本地嵌入模型比较源代码中的静态字符串，以找出语义相似的 key。翻译文案、分析事件、权限名称等任何以字符串作为 key 的导入函数都可以使用此插件。

- 不使用网络连接或外部 API。
- 包内附带 q8 `Xenova/multilingual-e5-small` 模型。
- 通过 `keyDetector` 决定要检查哪个函数及其第几个参数。
- 在异步 Worker 中比较 Vite 实际加载的模块，减少对 transform 流程的影响。
- 只报告相似 key 及其源代码位置，不会自动修改代码。

## 1. 快速开始

将插件安装为开发依赖。

```bash
npm install --save-dev @winter-love/vite-plugin-key-similarity
```

在 Vite 配置中添加插件，并提供 `keyDetector`。以下示例配置会检查从 `./i18n` 导入的 `t()` 的第一个参数。

```ts
import {defineConfig} from 'vite'
import {keySimilarity} from '@winter-love/vite-plugin-key-similarity'

export default defineConfig({
  plugins: [
    keySimilarity({
      keyDetector: ({imported, source}) =>
        source === './i18n' && imported === 't' ? 0 : undefined,
    }),
  ],
})
```

然后像往常一样运行开发服务器或生产构建。

```bash
npm run dev
npm run build
```

默认行为如下：

- 开发服务器：以警告形式报告相似 key。
- 生产构建：发现相似 key 时使构建失败。
- 模型和 tokenizer：自动从包内的 `assets` 目录加载，无需设置环境变量或模型路径。

## 2. 选择 key

### `keyDetector` 返回值

`keyDetector` 接收 import 信息和调用参数，并判断是否检查该调用。

| 返回值                   | 含义                                                |
| ------------------------ | --------------------------------------------------- |
| `0`、`1` 等数字          | 选择该索引处的参数作为无分组 key。                  |
| `{argumentIndex, group}` | 选择该索引处的参数，并且只与同一分组中的 key 比较。 |
| `undefined`              | 忽略该调用。                                        |

支持直接 named import 和 alias import。

```ts
import {t, t as translate} from './i18n'

t('支付已完成。')
translate('支付处理已成功完成。')
```

两次调用的 `imported` 都是 `t`。第二次调用的 `localName` 是 `translate`。可以通过 `source` 条件排除同名的本地函数或从其他模块导入的函数。

### 检测上下文

| 属性        | 内容                                   |
| ----------- | -------------------------------------- |
| `arguments` | 每个参数的 `kind` 和静态字符串 `value` |
| `filePath`  | 调用所在文件的绝对路径                 |
| `imported`  | 原始 import 名称                       |
| `localName` | 当前文件中使用的名称                   |
| `position`  | 调用起始位置的行和列                   |
| `source`    | import module specifier                |

例如，以下检测器会检查 `emit(payload, key)` 的第二个参数，并将其放入 `analytics` 分组。

```ts
keySimilarity({
  keyDetector: ({arguments: args, filePath, imported, source}) => {
    if (filePath.endsWith('.story.tsx')) return undefined
    if (source !== '@/events' || imported !== 'emit') return undefined

    return args[1]?.kind !== 'dynamic' ? {argumentIndex: 1, group: 'analytics'} : undefined
  },
})
```

如果不需要分组，请返回 `1`，而不是 `{argumentIndex: 1, group: 'analytics'}`。

## 3. 支持的字符串

提取器支持以下静态值。

```ts
t('单引号字符串')
t('双引号字符串')
t(`静态 template literal`)
```

普通字符串中的 `${email}` 会保留为原样文本。

```ts
t('密码重置邮件已发送至 ${email}。')
```

Template expression 中的简单标识符和属性访问也会还原为相同的 placeholder 形式。

```ts
t(`密码重置邮件已发送至 ${email}。`)
t(`密码重置邮件已发送至 ${user.profile.email}。`)
```

必须执行才能确定值的表达式不会作为静态 key 参与比较。

```ts
t(message)
t(`你好，${getName()}`)
t(`你好，${name ?? fallback}`)
```

支持的源文件扩展名为 TS、TSX、JS、JSX、MTS 和 MJS。支持 named import 和 alias import。不支持对象方法、namespace import，也不支持 Vue 或 Svelte 的 compiler AST。

## 4. 为调用添加比较文本

当代码形式的 key 无法清楚表达其含义时，请在调用正上方添加 `@key-similarity-with`。注释中的文本和代码字面量会作为同一次调用的多个比较表示。

```ts
/* @key-similarity-with 密码重置邮件已发送。 */
t('password.reset.email.sent')
```

诊断结果仍然只显示一次调用位置。

```text
src/password.ts:4:1  password.reset.email.sent  [compared as: password.reset.email.sent | 密码重置邮件已发送。]
```

### 添加多个表示

多次使用 `@key-similarity-with`，可以把多个表示附加到同一次调用。

```ts
/* @key-similarity-with 密码重置邮件已发送。 */
/* @key-similarity-with 密码修改说明已通过邮件发送。 */
t('password.reset.email.sent')
```

比较两次调用时，插件会评估所有表示组合，并在通过阈值的组合中只保留分数最高的一项。同一次调用中的表示不会互相比较。

### 排除代码字面量

将 `@key-similarity-ignore-literal` 与 `with` 一起使用，可以排除代码字面量，只比较注释中的文本。

```ts
/* @key-similarity-with 支付已完成。 */
/* @key-similarity-ignore-literal */
t('legacy.payment.completed')
```

如果只使用 `@key-similarity-ignore-literal` 而没有 `with`，则不会留下任何比较表示，因此整个调用都会从检查中排除。

```ts
/* @key-similarity-ignore-literal */
t('不参与相似度检查的 key')
```

注释必须作为连续的注释块，紧贴在调用或包含该调用的 statement 上方。注释与代码之间存在空行时，注释不会绑定到该调用。

## 5. 调整相似度阈值

`semanticThreshold` 的默认值为 `0.9`。只有分数大于或等于阈值的 key pair 才会被报告。

```ts
keySimilarity({
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  semanticThreshold: 0.92,
})
```

如果需要根据 key 长度或格式使用不同阈值，可以传入函数。代码字面量和每个注释表示都会分别调用该 resolver。

```ts
keySimilarity({
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  semanticThreshold: (key) => (key.length < 10 ? 0.95 : 0.9),
})
```

两个表示的阈值不同时，会使用较高的阈值。提高阈值会减少诊断，降低阈值会增加诊断。建议同时准备实际项目中应该匹配的文本和必须保持独立的文本，再据此校准阈值。

## 6. 阅读诊断结果

诊断结果使用以下格式。

```text
Similar key groups:
Group 1 (3 keys):
src/main.ts:6:3  支付已完成。
src/paraphrase.ts:3:35  支付处理已成功完成。
src/secondary.ts:3:33  支付成功完成。
group=ungrouped, semantic=0.9560–0.9843/0.9000
```

- `Group 1 (3 keys)`：三个调用之间的每一种组合都相似。
- `src/main.ts:6:3`：相对于最终 Vite `root` 的文件、行和列。
- `group=ungrouped`：`keyDetector` 返回了数字，没有指定分组。
- `semantic=0.9560–0.9843/0.9000`：分组内 pair 的分数范围，以及应用的阈值。

像 `A≈B`、`B≈C`、`A≉C` 这样的传递链不会合并为一个分组。诊断会将其拆分为所有 pair 都实际相似的完整分组，从而保留原始关系。

插件不会决定应该保留或删除哪个 key。请检查报告的位置，并根据上下文决定是否合并这些 key，或继续将它们作为不同文本保留。

## 7. 诊断模式

| 选项        | 默认值  | 可用值                 | 行为                 |
| ----------- | ------- | ---------------------- | -------------------- |
| `serveMode` | `warn`  | `off`, `warn`          | 开发服务器的诊断模式 |
| `buildMode` | `error` | `off`, `warn`, `error` | 生产构建的诊断模式   |

选择 `off` 时也不会初始化 Worker 和模型。异步比较会在触发入队的 transform 之后完成，因此开发模式不提供 `error`。

如果项目中已经存在很多相似 key，可以先使用 `buildMode: 'warn'` 整理初始结果，清理完成后再切换到 `error`。

## 8. 选项参考

| 选项                | 默认值                               | 说明                                        |
| ------------------- | ------------------------------------ | ------------------------------------------- |
| `keyDetector`       | 必填                                 | 选择要检查的 import 调用及包含 key 的参数。 |
| `semanticThreshold` | `0.9`                                | 固定数字或 `(key) => number` 阈值 resolver  |
| `serveMode`         | `warn`                               | 开发服务器诊断模式                          |
| `buildMode`         | `error`                              | 生产构建诊断模式                            |
| `exclude`           | 排除测试、generated 和 node_modules  | Vite 与 CLI 检查中排除的 glob 模式          |
| `scanInclude`       | `src/**/*.{ts,tsx,js,jsx,mts,mjs}`   | 仅用于 CLI 全项目扫描的文件 glob            |
| `cacheDir`          | `node_modules/.cache/key-similarity` | 模型缓存和 `vectors` 缓存的基础目录         |
| `modelPath`         | 内置模型                             | 其他本地 Transformers.js 模型的路径         |
| `modelIdentifier`   | 内置模型 ID 或 `modelPath`           | 用于区分向量缓存的模型标识符                |
| `modelRevision`     | 内置 revision 或 `local`             | 用于区分向量缓存的模型 revision             |
| `wasmPath`          | 自动选择                             | ONNX WASM 文件的显式路径                    |

Vite 没有共用的 `include` 选项。Vite 会检查其模块图中的 JavaScript 和 TypeScript 文件，并只应用 `exclude`。只有在需要全项目扫描时，才使用 CLI 专用的 `scanInclude`。

## 9. 使用 CLI 扫描整个项目

如需独立于 Vite 构建扫描整个项目，请在项目根目录创建 `key-similarity.config.mjs`。

```js
export default {
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  scanInclude: ['src/**/*.{ts,tsx}'],
}
```

```bash
npx key-similarity check
npx key-similarity check --json
npx key-similarity benchmark
```

- `check`：输出扫描的文件数、唯一 key 数和诊断数。存在诊断时返回退出码 `1`。
- `check --json`：以 JSON 输出位置、比较表示、分数和执行时间。
- `benchmark`：使用同一个模型实例运行 initial/warm 分析，并以 JSON 输出嵌入时间、缓存大小和 RSS memory。
- `--config path`：加载默认 `key-similarity.config.mjs` 以外的配置文件。

CLI 使用当前工作目录作为根目录。

## 10. 模型与缓存

默认模型和 tokenizer 位于 `assets/multilingual-e5-small`。Transformers.js 的远程模型访问已禁用，因此运行时不会下载模型。

标准化字符串的向量默认存储在 `node_modules/.cache/key-similarity/vectors`。模型 ID、revision、标准化版本和标准化字符串都相同时，会复用已有向量。切换到其他本地模型时，请同时设置 `modelIdentifier` 和 `modelRevision`，以免与之前的模型缓存混用。

## 11. 执行流程

Vite 模式按以下顺序处理文件。

1. Vite 加载文件并将其传给 `transform`。
2. 主线程立即从 AST 中提取 key 和位置，并将其加入队列。
3. 独立的 Node Worker 按顺序消费队列，执行嵌入和比较。
4. 文件变更或删除时，会移除所有包含该文件的旧 pair。
5. 在 `buildEnd` 阶段，构建会等待队列清空，然后一次性报告累计结果。

Vite 模式不会在构建前使用 glob 扫描整个源代码目录。它只检查当前构建或开发服务器模块图中包含的文件。

## 12. 故障排除

### 相似文本没有被报告

请按以下顺序检查。

1. 确认文件已 import 到当前 Vite 模块图中。
2. 确认 `source` 和 `imported` 与 `keyDetector` 条件完全一致。
3. 确认两个调用没有被分配到不同的 `group`。
4. 确认所选参数是受支持的静态字符串。
5. 略微降低 `semanticThreshold`，查看实际分数。

如果代码形式的 key 无法表达足够的语义，请使用 `@key-similarity-with` 添加便于阅读的文本。

### 报告了太多无关文本

提高 `semanticThreshold`。如果一个值不适合所有 key，请提供 `(key) => number` resolver。对于绝不能互相比较的 key 类别，请使用 `keyDetector` 分组进行隔离。

### 开发服务器只警告，但生产构建失败

默认值是 `serveMode: 'warn'` 和 `buildMode: 'error'`。如果生产构建也只需要警告，请设置 `buildMode: 'warn'`。

### 检查了范围外的文件

将对应 glob 添加到 `exclude`。由于 Vite 没有插件级 `include` 选项，请通过 `keyDetector` 中的 `filePath`、`source` 和 `imported` 条件限制调用范围。

## 13. 内置示例

在包根目录运行以下命令。所有示例都使用内置本地模型。

```bash
npm run example:duplicate
npm run example:clean
npm run example:sentence-duplicate
npm run example:sentence-clean
```

- `example:duplicate`：报告 `checkout.complete` 和 `checkout.completed`。
- `example:clean`：使用无关的事件 key，不产生诊断。
- `example:sentence-duplicate`：报告支付文本、密码重置文本、placeholder，以及通过注释关联的代码形式 key。还包含一个使用 `@key-similarity-ignore-literal` 从检查中排除的相似文本。
- `example:sentence-clean`：使用无关的翻译文本，不产生诊断。
