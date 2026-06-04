Project: SIGMUN

Backend:
  test_runner: Jest
  test_command: pnpm --dir backend test
  coverage_command: pnpm --dir backend test:cov
  e2e_command: pnpm --dir backend test:e2e
  test_layers:
    - unit: `backend/src/**/*.spec.ts`
    - e2e: `backend/test/**/*.spec.ts`
  strict_tdd: true

Frontend:
  test_runner: none detected
  test_command: none configured
  strict_tdd: false

Tooling:
  package_manager: pnpm
  formatter: Prettier
  linter: ESLint
  type_checker: TypeScript
