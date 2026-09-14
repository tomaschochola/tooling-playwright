# tooling-playwright

Shared Playwright e2e harness: browser project matrices,
deterministic page sync, strict page assertions.

## Stack

- Language: JavaScript ESM
- Runtime: Node 24
- OS: GNU/Linux
- Libraries: playwright-core 1.x, axe-core 4.x
- Package manager: npm, lockfile present

## Toolchain

- Format: prettier 3.x
- Lint: eslint 10.x, trimmer
- Types: typescript 6.x, check only, no emit
- Test: node --test + Chromium, Firefox, WebKit

## Devcontainer

- Base: docker.io/library/node:24-trixie
- User: node
- Browsers install natively: chromium, firefox, webkit
- Sidecars: none
- Up: `make up`
- Execute: `devcontainer exec --workspace-folder . <command>`
- Down: `make down`

## Makefile

- `update` — refresh locks, only tool that may touch them
- `fix` — auto-fix, may dirty tree
- `check` — full gate: doctor + lint + analyze + test + audit
- `doctor` — tree and toolchain ok
- `lint` — eslint + prettier + trimmer checks
- `analyze` — npm + type checks
- `test` — unit + browser tests
- `audit` — dependency audit
- `postcreate` — first-time setup, runs automatically on create
- `stop` — stop container, keep it
- `down` — stop and remove container
- `clean` — drop generated files
- `distclean` — drop everything rebuildable
- `rebuild` — full rebuild, only when broken

## Layout

├── Makefile
├── .editorconfig
├── .devcontainer/
├── package.json
├── eslint.config.js
├── prettier.config.js
├── tsconfig.json
├── LICENSE
├── AUTHORS.md
├── src/
│   └── index.js
├── scaffolds/
└── tests/
