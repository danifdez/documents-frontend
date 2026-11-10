// Minimal declarations for dependencies that ship no types.
// Keep them narrow: only the surface this app actually uses.

declare module 'electron-squirrel-startup' {
    const started: boolean;
    export default started;
}

declare module 'tar' {
    import type { Transform } from 'stream';

    interface UnpackOptions {
        cwd?: string;
        strip?: number;
        preservePaths?: boolean;
        filter?: (entryPath: string, entry: { type?: string; linkpath?: string }) => boolean;
    }

    export class Unpack extends Transform {
        constructor(options?: UnpackOptions);
    }
}
