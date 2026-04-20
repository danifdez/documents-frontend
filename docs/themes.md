# Themes

The frontend ships with a single built-in theme (**Default**) but lets users install additional themes as local files. Themes override the app's design tokens (colors, typography) and can inject a small amount of custom CSS.

## Overview

A theme is a directory that contains a `theme.json` manifest and, optionally, a `custom.css` file and a `fonts/` folder with font files. Themes are installed from a file on disk — either a plain `.json` (for color-only themes) or a `.zip` (when the theme bundles fonts or custom CSS).

Installed themes live in the user data directory:

| Platform | Path |
|----------|------|
| Linux    | `~/.config/Documents/themes/<id>/` |
| macOS    | `~/Library/Application Support/Documents/themes/<id>/` |
| Windows  | `%APPDATA%\Documents\themes\<id>\` |

Open **Settings → General → Theme**, pick an **Active theme** from the dropdown, or click **Manage themes…** to install / uninstall themes and preview swatches.

Each theme defines **two variants** (`light` and `dark`). The existing **Appearance** toggle (Light / Dark / System) still decides which variant is applied on top of the active theme, so users keep a single mental model.

## Theme structure

```
<theme-id>/
├── theme.json        # manifest, required
├── custom.css        # optional, referenced from the manifest
└── fonts/            # optional, referenced from the manifest
    ├── MyFont-400.woff2
    └── MyFont-700.woff2
```

## Manifest reference

```json
{
  "id": "solarized",
  "name": "Solarized",
  "author": "Jane Doe",
  "version": "1.0.0",
  "description": "Low-contrast Solarized palette",
  "variants": {
    "light": { "--color-surface": "#fdf6e3", "...": "..." },
    "dark":  { "--color-surface": "#002b36", "...": "..." }
  },
  "typography": {
    "fontFamily": "'JetBrains Mono', monospace",
    "fontFaces": [
      { "family": "JetBrains Mono", "src": "fonts/JetBrainsMono-400.woff2", "weight": 400 }
    ]
  },
  "customCss": "custom.css"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier. Must match `/^[a-z0-9][a-z0-9-_]{0,63}$/`. Used as the directory name. `default` is reserved. |
| `name` | string | yes | Human-readable name shown in Settings. |
| `author` | string | no | Shown in the theme card. |
| `version` | string | no | Free-form (e.g. `1.0.0`). Used to detect updates. |
| `description` | string | no | One-line description shown in the theme card. |
| `variants.light` | object | yes | CSS variable map applied when Appearance = Light (or System on a light OS). |
| `variants.dark` | object | yes | CSS variable map applied when Appearance = Dark (or System on a dark OS). |
| `typography.fontFamily` | string | no | Replaces the `--font-sans` design token for the entire app. |
| `typography.fontFaces` | array | no | List of `@font-face` definitions whose `src` points to files inside the theme's `fonts/` folder. Requires a `.zip` package. |
| `customCss` | string | no | Either the filename of a CSS file inside the theme (recommended, e.g. `"custom.css"`) or an inline CSS string. |

Unknown fields are ignored. Unknown CSS variables in `variants.light` / `variants.dark` are ignored with a console warning.

## Supported CSS variables

| Variable | Affects |
|----------|---------|
| `--color-surface` | Page background. |
| `--color-surface-elevated` | Cards, modals, and other raised containers. |
| `--color-surface-hover` | Hover state of list items and buttons. |
| `--color-accent` | Primary accent color (buttons, links, focus rings). |
| `--color-accent-light` | Light tint of the accent (gradients, highlights). |
| `--color-accent-dark` | Dark tint of the accent (pressed state, emphasized text). |
| `--color-accent-subtle` | Subtle accent background (chips, active tabs). |
| `--color-border` | Default border color for cards and inputs. |
| `--color-border-light` | Softer border color for dividers. |
| `--color-text-primary` | Main body text. |
| `--color-text-secondary` | Labels, secondary captions. |
| `--color-text-muted` | Placeholder text, disabled elements. |
| `--color-sidebar-from` | Start of the sidebar gradient. |
| `--color-sidebar-to` | End of the sidebar gradient. |

Values may be any valid CSS color (`#rrggbb`, `rgb()`, `rgba()`, `hsl()`, named colors). Each value must be shorter than 200 characters.

## Typography

Set `typography.fontFamily` to change the app-wide sans-serif stack. The value should be a valid CSS `font-family` list.

To ship a font with the theme, use a `.zip` package and reference the files under `fonts/`:

```json
"typography": {
  "fontFamily": "'Inter Tight', sans-serif",
  "fontFaces": [
    { "family": "Inter Tight", "src": "fonts/InterTight-400.woff2", "weight": 400 },
    { "family": "Inter Tight", "src": "fonts/InterTight-700.woff2", "weight": 700, "style": "normal" }
  ]
}
```

Supported formats: `.woff2`, `.woff`, `.ttf`, `.otf`. Font paths must be relative and inside the theme directory — absolute, remote, or `..` paths are rejected. Files are read once and inlined as `data:` URLs when the theme is activated.

## Custom CSS

`customCss` lets you inject extra rules — useful for small tweaks that don't fit the design-token model.

Rules and limits:

- **Size**: the CSS must be ≤ 64 KB.
- **No remote `@import`**: `@import url('http…')` is rejected. Bundle everything inside the theme.
- **Scope your selectors**: prefer scoping to specific elements. Avoid universal selectors (`*`) and global tag overrides unless absolutely necessary.
- **Forward compatibility**: the app's internal class names may change between versions. A theme that relies on them may need an update when the app is upgraded. Prefer targeting the supported CSS variables above when possible.
- Inline CSS (a CSS string directly inside `customCss`) is supported too, but file-based CSS is recommended.

## Packaging

Use a plain `.json` when your theme only changes colors:

```
solarized.json   ← a single manifest file
```

Use a `.zip` when you bundle fonts, a `custom.css` file, or both. The archive must have `theme.json` at its **root**:

```
solarized.zip
├── theme.json
├── custom.css
└── fonts/
    └── InterTight-400.woff2
```

The manifest's `id` determines the installation directory; the zip's own filename is irrelevant.

## Ready-to-install examples

The repository ships three sample themes in [`example-themes/`](example-themes/) that you can install as-is to explore the feature:

| File | Highlights |
|------|------------|
| [`solarized.json`](example-themes/solarized.json) | Classic warm/teal palette. Colors only. |
| [`nord.json`](example-themes/nord.json) | Cool arctic palette with frost blues. Colors only. |
| [`sepia-serif.json`](example-themes/sepia-serif.json) | Paper-like palette that also overrides `fontFamily` and uses an inline `customCss`. Covers all `.json`-compatible options. |

Install any of them from **Settings → Theme → Manage themes… → Install from file…**.

## Example — Solarized Light/Dark

The Solarized file above is also reproduced inline below for reference. Copy into a file called `solarized.json` if you'd rather not clone the repo.

```json
{
  "id": "solarized",
  "name": "Solarized",
  "author": "Ethan Schoonover",
  "version": "1.0.0",
  "description": "Classic Solarized palette.",
  "variants": {
    "light": {
      "--color-surface": "#fdf6e3",
      "--color-surface-elevated": "#eee8d5",
      "--color-surface-hover": "#e7dfc3",
      "--color-accent": "#268bd2",
      "--color-accent-light": "#6ea9d1",
      "--color-accent-dark": "#1e6fa8",
      "--color-accent-subtle": "rgba(38, 139, 210, 0.12)",
      "--color-border": "#d5ccb3",
      "--color-border-light": "#ebe4c9",
      "--color-text-primary": "#073642",
      "--color-text-secondary": "#586e75",
      "--color-text-muted": "#93a1a1",
      "--color-sidebar-from": "#fdf6e3",
      "--color-sidebar-to": "#eee8d5"
    },
    "dark": {
      "--color-surface": "#002b36",
      "--color-surface-elevated": "#073642",
      "--color-surface-hover": "#0b4250",
      "--color-accent": "#2aa198",
      "--color-accent-light": "#4fbdb4",
      "--color-accent-dark": "#1f7b74",
      "--color-accent-subtle": "rgba(42, 161, 152, 0.18)",
      "--color-border": "#0b4250",
      "--color-border-light": "#073642",
      "--color-text-primary": "#eee8d5",
      "--color-text-secondary": "#93a1a1",
      "--color-text-muted": "#586e75",
      "--color-sidebar-from": "#073642",
      "--color-sidebar-to": "#002b36"
    }
  }
}
```

After installing, pick **Solarized** from the dropdown in **Settings → Theme** and toggle **Appearance** between Light and Dark to verify both variants.

## Troubleshooting

- **"Install failed: Field 'id' must match …"** — the `id` has invalid characters or is longer than 64 chars. Use only `a-z`, `0-9`, `-`, `_`.
- **"Cannot overwrite the built-in 'default' theme"** — `default` is reserved. Change your manifest's `id`.
- **"Themes with custom fonts must be packaged as .zip"** — `fontFaces` requires a zip because the font files need to travel with the manifest.
- **Some colors don't seem to apply** — the key is probably misspelled or unsupported. Open DevTools (F12) and look for `[useTheme]` / `Unknown CSS variable` warnings in the console.
- **Custom CSS doesn't load** — check that `customCss` in the manifest matches the filename inside the zip, and that the file is ≤ 64 KB and contains no remote `@import`.
- **Uninstall is disabled** — only the `default` theme is protected; all user-installed themes can be uninstalled from the theme card.

To reset, delete the corresponding directory inside the user data path listed at the top of this document.
