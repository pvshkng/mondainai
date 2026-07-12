import { nativeImage, type NativeImage } from 'electron'

// Accent-coloured rounded square with a cream mountain glyph, matching the
// in-app logo. Embedded as base64 PNGs so the tray icon works in the packaged
// app without shipping a separate asset file. 16px and 32px representations.
const ICON_16 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAASUlEQVR42mNggIKb5eH/icUM6IAUzRiGkKMZxRCaGvD6xUMwHhgDYJrxGUI7A9A14zKENgbg0ozNEOobQEgzuiHUyQtUyY2UAAAfCGjH4AAgAgAAAABJRU5ErkJggg=='
const ICON_32 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAh0lEQVR42u3XPQqAMAyG4dzSo3hWRzfBQygIDlZq/myTDw1k7fuMDVEx0zhsrZa4aRlnET3iVUTP+A0REb8gfoDngXWZj/0m4Ix7ELiAMm5FYAJqcQsCD8DFtQgsgDSuQeAAtHEpAgNgjUsQ+QHeOIfIDXgr/oTI8ScMvwtSXEYpbsMU13HE7N55WfWG09f1AAAAAElFTkSuQmCC'

/** Build the system-tray icon as a multi-resolution NativeImage. */
export function createTrayIcon(): NativeImage {
  const image = nativeImage.createFromDataURL(`data:image/png;base64,${ICON_32}`)
  image.addRepresentation({
    scaleFactor: 1,
    dataURL: `data:image/png;base64,${ICON_16}`
  })
  return image
}
