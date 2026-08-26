# Themes

Documents includes a built-in **Default** theme and can install additional themes from local `.json` or `.zip` files. A theme can change colors and typography; packaged themes may also include fonts or additional visual styling.

## Choose a theme

Open **Settings → General → Theme** and select an **Active theme**. The separate **Appearance** setting controls whether the light, dark, or system-matched version of the theme is shown.

Every compatible theme includes both a light and a dark appearance, so switching appearance does not require installing another theme.

## Install a theme

1. Open **Settings → General → Theme → Manage themes…**.
2. Select **Install from file…**.
3. Choose a `.json` or `.zip` theme file.
4. Review its name, description, author, version, and color preview.
5. Select it as the active theme when ready.

Use `.json` themes for color and basic typography changes. A `.zip` theme may also contain local fonts or additional styling. Remote fonts and remote style imports are not accepted.

## Included examples

The repository includes three themes that can be installed directly:

| Theme | Appearance |
|---|---|
| [Solarized](./example-themes/solarized.json) | A classic warm and teal palette. |
| [Nord](./example-themes/nord.json) | A cool arctic palette with blue accents. |
| [Sepia Serif](./example-themes/sepia-serif.json) | A paper-like palette with serif typography. |

## Remove or replace a theme

Open **Manage themes…** and choose **Uninstall** on a user-installed theme. The built-in Default theme is protected and cannot be removed or overwritten.

Installing a newer file for an existing theme uses the theme's own identity rather than the downloaded filename. Its displayed version can help confirm whether the expected file is installed.

## Safety and compatibility

Theme files are checked before installation. Documents rejects invalid identifiers, unsafe file paths, oversized custom styles, and remote style imports. Unsupported color settings are ignored rather than applied unpredictably.

Themes that rely on additional styling may need an update after a future application release. Themes that only use supported colors and typography are less likely to be affected.

## Troubleshooting

- **The theme will not install**: confirm that it is a valid Documents `.json` or `.zip` theme.
- **A packaged theme is incomplete**: download the original archive again; fonts and styling must remain inside it.
- **Some colors do not change**: the theme may contain settings that Documents does not support.
- **Custom styling does not appear**: the style may exceed the 64 KB limit or contain a blocked remote import.
- **Uninstall is unavailable**: the Default theme is the only protected theme.

To return to the original appearance, choose **Default** as the active theme.
