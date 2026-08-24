### type & value import

- Do not duplicate the import source when importing type and value from the same module

```ts
// ok
import {type Foo, runFoo} from './foo'

// nope
import type {Bar} from './bar'
import {runBar} from './bar'
```
