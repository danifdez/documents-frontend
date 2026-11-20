// Minimal declarations for dependencies that ship no types.
// Keep them narrow: only the surface this app actually uses.

declare module 'electron-squirrel-startup' {
    const started: boolean;
    export default started;
}
