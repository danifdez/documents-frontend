// Lets `tsc` (the logic-layer typecheck) resolve imports of single-file
// components. `vue-tsc` still uses the real SFC types for template checking.
declare module '*.vue' {
    import type { DefineComponent } from 'vue';

    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
    export default component;
}
