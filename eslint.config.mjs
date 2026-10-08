import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import reactHooks from 'eslint-plugin-react-hooks'

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    // Keep existing untyped data and React Compiler migration diagnostics
    // visible as warnings. TypeScript strict mode and Rules of Hooks remain
    // blocking checks; this project does not enable the React Compiler.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      ...Object.fromEntries(Object.keys(reactHooks.configs.recommended.rules)
        .filter((rule) => rule !== 'react-hooks/rules-of-hooks' && rule !== 'react-hooks/exhaustive-deps')
        .map((rule) => [rule, 'warn'])),
    },
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    // package.json uses CommonJS for .js; the existing Node tests do too.
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['tests/**'],
    // The TS test harness intentionally constructs Node Module instances.
    rules: { '@next/next/no-assign-module-variable': 'off' },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'tmp/**', 'public/**', '.codex/**', 'next-env.d.ts']),
])
