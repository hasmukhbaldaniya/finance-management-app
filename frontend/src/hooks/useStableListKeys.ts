import { useRef } from "react";

// For rendering a list whose items have no stable id of their own (plain
// strings, or objects rebuilt via `{...spread}` on every edit) but do
// support removing an arbitrary item — plain array-index keys break
// identity the moment an earlier item is removed, since every later item
// then shifts into a key it didn't own before.
//
// Usage: call `keys(list.length)` during render to get a same-length array
// of stable keys aligned 1:1 with `list` by position. Call `removeAt(index)`
// synchronously inside the same handler that removes the underlying item
// (before the state update that triggers the next render) so the key at
// that position is dropped, not just truncated from the end.
export function useStableListKeys() {
  const keysRef = useRef<string[]>([]);

  function keys(length: number): string[] {
    while (keysRef.current.length < length) {
      keysRef.current = [...keysRef.current, crypto.randomUUID()];
    }
    if (keysRef.current.length > length) {
      keysRef.current = keysRef.current.slice(0, length);
    }
    return keysRef.current;
  }

  function removeAt(index: number): void {
    keysRef.current = keysRef.current.filter((_, i) => i !== index);
  }

  return { keys, removeAt };
}
