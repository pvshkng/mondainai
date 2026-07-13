/** Decode a base64 string into raw bytes. */
export function base64ToBytes(dataBase64: string): Uint8Array {
  return Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0));
}

/** Decode a base64 string into an ArrayBuffer (for binary parsers). */
export function base64ToArrayBuffer(dataBase64: string): ArrayBuffer {
  const bytes = base64ToBytes(dataBase64);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/** Decode a base64 string into UTF-8 text. */
export function decodeBase64Text(dataBase64: string): string {
  return new TextDecoder().decode(base64ToBytes(dataBase64));
}
