#!/usr/bin/env python3
"""
Generate the tray icon PNGs for documents-frontend.

Uses only the Python standard library (zlib + struct) to avoid a runtime
dependency on Pillow or ImageMagick. The icon design is a simple
"document with folded corner" silhouette in solid white with a transparent
background.

Note: macOS Template convention expects BLACK pixels (macOS recolors them
to match the menu bar). We intentionally write white into
`tray-iconTemplate.png` too, per product request. On macOS this will look
the same as the regular `tray-icon.png` and bypass the auto-recolor.

To regenerate:
    python3 gen_tray_icons.py

Outputs:
    tray-icon.png         (16x16)
    tray-icon@2x.png      (32x32)
    tray-iconTemplate.png (16x16, macOS Template convention)
"""

import struct
import zlib
from pathlib import Path

OUT_DIR = Path(__file__).parent
TARGET_DIR = Path("/home/admin/documents-dev/frontend/src/assets/tray")
APP_ICON_DIR = Path("/home/admin/documents-dev/frontend/src/assets")


def png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def make_png(pixels: list[list[tuple[int, int, int, int]]]) -> bytes:
    height = len(pixels)
    width = len(pixels[0])
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter byte: None
        for (r, g, b, a) in row:
            raw += bytes((r, g, b, a))
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", idat)
        + png_chunk(b"IEND", b"")
    )


def render_icon(size: int) -> list[list[tuple[int, int, int, int]]]:
    """
    Draw a document silhouette inside `size x size`. Black with full alpha
    on document pixels, fully transparent elsewhere. Includes a folded
    top-right corner and three horizontal lines.
    """
    s = size
    pixels = [[(0, 0, 0, 0) for _ in range(s)] for _ in range(s)]

    # Document body bounds (in pixel coords)
    margin = max(1, s // 8)
    left = margin
    right = s - margin - 1
    top = margin
    bottom = s - margin - 1
    fold = max(2, s // 4)  # size of the top-right folded corner

    # Outline thickness
    thick = max(1, s // 16)

    def set_pixel(x: int, y: int):
        if 0 <= x < s and 0 <= y < s:
            pixels[y][x] = (255, 255, 255, 255)

    # Top edge: from left to (right - fold)
    for y in range(top, top + thick):
        for x in range(left, right - fold + 1):
            set_pixel(x, y)

    # Diagonal fold edge: from (right - fold, top) to (right, top + fold)
    for i in range(fold + 1):
        for t in range(thick):
            set_pixel(right - fold + i + t, top + i)
            set_pixel(right - fold + i, top + i + t)

    # Right edge: from (right, top + fold) to (right, bottom)
    for y in range(top + fold, bottom + 1):
        for x in range(right - thick + 1, right + 1):
            set_pixel(x, y)

    # Bottom edge
    for y in range(bottom - thick + 1, bottom + 1):
        for x in range(left, right + 1):
            set_pixel(x, y)

    # Left edge
    for x in range(left, left + thick):
        for y in range(top, bottom + 1):
            set_pixel(x, y)

    # Interior horizontal lines (text)
    line_left = left + max(1, s // 6)
    line_right = right - max(1, s // 6)
    spacing = max(2, s // 6)
    first_line_y = top + max(2, s // 3)
    for i in range(3):
        y = first_line_y + i * spacing
        if y >= bottom - thick:
            break
        for x in range(line_left, line_right + 1):
            set_pixel(x, y)

    return pixels


def main():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)

    # 16x16 standard
    img16 = make_png(render_icon(16))
    (TARGET_DIR / "tray-icon.png").write_bytes(img16)
    # 16x16 macOS Template (same content; filename is the convention).
    (TARGET_DIR / "tray-iconTemplate.png").write_bytes(img16)
    # 32x32 @2x HiDPI
    img32 = make_png(render_icon(32))
    (TARGET_DIR / "tray-icon@2x.png").write_bytes(img32)

    for name in ("tray-icon.png", "tray-iconTemplate.png", "tray-icon@2x.png"):
        size_bytes = (TARGET_DIR / name).stat().st_size
        print(f"wrote {name}: {size_bytes} bytes")

    # 256x256 app icon for Electron window/dock (Linux). Same white-document
    # silhouette, larger size. macOS (.icns) and Windows (.ico) still need
    # external tooling — see TODO in forge.config.ts.
    img256 = make_png(render_icon(256))
    app_icon_path = APP_ICON_DIR / "app-icon.png"
    app_icon_path.write_bytes(img256)
    print(f"wrote app-icon.png: {app_icon_path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
