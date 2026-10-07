# tsconfig

Shared TypeScript configs. Workspace packages depend on it as `"tsconfig": "workspace:*"`
(devDependency) and extend one of:

- `tsconfig/node.json`: Node/ESM packages and the server (`nodenext`, explicit `.ts` imports,
  `erasableSyntaxOnly` because Node runs this code directly with type stripping).
- `tsconfig/react.json`: the bundled React app (`bundler` resolution, DOM libs, JSX).

Both extend `base.json`, which holds the strictness flags. Put package-specific
settings (paths, include) in the package's own `tsconfig.json`.
