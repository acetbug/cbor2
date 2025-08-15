import { SYMS } from './constants';
import { Tag } from './tag';

export interface OriginalEncoding {
  [SYMS.ENCODED]?: Uint8Array;
  [SYMS.LENGTH]?: Uint8Array;
}

export interface ValueOf<T> extends OriginalEncoding {
  valueOf(): T;
}

/**
 * Get the encoded version of the object, if it has been stored on the object.
 *
 * @param obj Object to check.
 * @returns Encoded version as bytes, if available.
 */
export function getEncoded(obj: unknown): Uint8Array | undefined {
  if ((obj != null) && (typeof obj === 'object')) {
    return (obj as OriginalEncoding)[SYMS.ENCODED];
  }
  return undefined;
}

/**
 * Get the encoded version of the length of the object or array, if it has
 * been stored.
 *
 * @param obj Object to check.
 * @returns Encoded length as bytes, if available.
 */
export function getEncodedLength(obj: unknown): Uint8Array | undefined {
  if ((obj != null) && (typeof obj === 'object')) {
    return (obj as OriginalEncoding)[SYMS.LENGTH];
  }
  return undefined;
}

/**
 * Save the original encoding of the given object on the oject as a property
 * with a Symbol name, so it can be later extracted for round-tripping or
 * crypto.
 *
 * @param obj Object to tag.
 * @param orig Originally-encoded version of the object.
 */
export function saveEncoded(obj: OriginalEncoding, orig: Uint8Array): void {
  Object.defineProperty(obj, SYMS.ENCODED, {
    configurable: true,
    enumerable: false,
    value: orig,
  });
}

/**
 * Save the original encoding for the length of an object or array, so that
 * it can be later extracted.  Include the major type in the original bytes.
 *
 * @param obj Object to store a length on.
 * @param orig Originally-encoded version of the length, including major type.
 */
export function saveEncodedLength(
  obj: OriginalEncoding,
  orig: Uint8Array
): void {
  Object.defineProperty(obj, SYMS.LENGTH, {
    configurable: true,
    enumerable: false,
    value: orig,
  });
}

export function box(value: bigint, orig: Uint8Array): BigInt;

export function box(value: string, orig: Uint8Array): String;

export function box(value: number, orig: Uint8Array): Number;

export function box(
  value: bigint | number, orig: Uint8Array
): BigInt | Number;

export function box(
  value: bigint | number | string, orig: Uint8Array
): BigInt | Number | String;

/**
 * Put an object wrapper around a primitive value, such as a number, boolean,
 * or bigint, storing the original CBOR encoding of the value for later
 * reconstitution.
 *
 * @param value Primitive value.
 * @param orig Original encoding.
 * @returns Object wrapper with original encoding attached.
 */
export function box<T>(value: T, orig: Uint8Array): ValueOf<T> {
  const o = Object(value);
  saveEncoded(o, orig);
  return o;
}

/**
 * Remove all boxed types from an object.
 *
 * @param obj Object ot unbox.
 * @returns Unboxed copy.
 */
export function unbox(obj: unknown): unknown {
  if (!obj || (typeof obj !== 'object')) {
    return obj;
  }

  switch (obj.constructor) {
    case BigInt:
    case Boolean:
    case Number:
    case String:
    case Symbol:
      return obj.valueOf();
    case Array:
      return (obj as object[]).map(x => unbox(x));
    case Map: {
      const entries = unbox([...(obj as Map<object, object>).entries()]) as
      [[unknown, unknown]];
      return (entries.every(([k]) => typeof k === 'string')) ?
      Object.fromEntries(entries) :
        new Map(entries);
    }
    case Tag:
      return new Tag(
        unbox((obj as Tag).tag) as number,
        unbox((obj as Tag).contents)
      );
    case Object: {
      // This shouldn't actually occur in most paths, but it's here for
      // completeness.
      const ret: {
        [key: string]: unknown;
      } = {};
      for (const [k, v] of Object.entries(obj)) {
        ret[k] = unbox(v);
      }
      return ret;
    }
  }

  // Leave it alone.  We'll do more harm than good.
  return obj;
}
