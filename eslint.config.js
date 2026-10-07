import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // <motion.div> 같은 JSX 멤버 표현식 태그를 "사용"으로 인식시킴
      // (없으면 motion처럼 .속성으로만 쓰는 import가 전부 미사용 오탐 처리됨)
      'react/jsx-uses-vars': 'error',
    },
  },
  {
    files: ['deploy.js', 'functions/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    files: ['public/firebase-messaging-sw.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.serviceworker, ...globals.browser },
    },
  },
])
