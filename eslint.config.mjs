import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

// Rules shared by `.ts` and the `<script>` block of `.vue` files.
const typeScriptRules = {
    ...tseslint.configs.recommended.rules,
    // TypeScript already resolves identifiers; `no-undef` only produces false
    // positives inside single-file components.
    'no-undef': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
        'error',
        {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrors: 'none',
        },
    ],
    // Legacy debt tracked by the refactor plan. Warnings keep `npm run lint`
    // green while still surfacing every new occurrence in the output.
    '@typescript-eslint/no-explicit-any': 'warn',
    // Empty catches are used deliberately around best-effort persistence.
    'no-empty': ['error', { allowEmptyCatch: true }],
};

export default [
    {
        ignores: [
            'dist/**',
            'out/**',
            '.vite/**',
            'node_modules/**',
            'coverage/**',
            'playwright-report/**',
            'test-results/**',
        ],
    },
    js.configs.recommended,
    ...vue.configs['flat/essential'],
    {
        // Build and release scripts run in Node, not in the renderer.
        files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
        languageOptions: {
            globals: { ...globals.node, ...globals.browser },
        },
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsparser,
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        plugins: { '@typescript-eslint': tseslint },
        rules: typeScriptRules,
    },
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: { parser: tsparser },
        },
        plugins: { '@typescript-eslint': tseslint },
        rules: {
            ...typeScriptRules,
            // Component names are domain words (Topbar, Doc, Canvas), not
            // multi-word Vue convention names.
            'vue/multi-word-component-names': 'off',
            // Rendering extracted document HTML is a product requirement; the
            // sanitization follow-up is tracked separately.
            'vue/no-v-html': 'off',
            // Mutating a nested object received as a prop is a real smell, but
            // fixing it changes the parent contract (tracked in the refactor plan).
            'vue/no-mutating-props': 'warn',
        },
    },
];
