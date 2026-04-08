# @traqula/chevrotain

Exports the [Chevrotain](https://chevrotain.io/docs/) package and bundles a CJS version.
This package uses a patched version of Chevrotain where the `lodash-es` dependency has been
removed, making CJS bundling possible without ESM-only dependencies.

Both ESM and CJS builds are provided:

- **ESM**: TypeScript-compiled re-export of the `chevrotain` package
- **CJS**: esbuild-bundled CommonJS version for use in non-ESM environments

## Usage

```ts
import { CstParser, createToken, Lexer } from "@traqula/chevrotain";
```

Or in CommonJS:

```js
const { CstParser, createToken, Lexer } = require("@traqula/chevrotain");
```

## License

Apache-2.0
