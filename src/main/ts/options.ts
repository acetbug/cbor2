import type { KeySorter, KeyValueEncoded } from './sorts';
import type { Simple } from './simple';
import type { TypeEncoderMap } from './typeEncoderMap';

export type TagNumber = bigint | number | Number;

export interface ITag {
  readonly tag: TagNumber;
  readonly contents: unknown;
}

/**
 * Apply this to a TagDecoder function to get commenting support.
 */
export interface ICommenter {

  /**
   * If true, do not output text for child nodes.  The comment function
   * will handle that.  If true, ensure that the text returned by the comment
   * function ends in a newline.
   * @default false
   */
  noChildren?: boolean;

  /**
   * When commenting on this tag, if this function returns a string, it will
   * be appended after the tag number and a colon.
   *
   * @param tag The tag to comment on.
   * @param opts Options.
   * @param depth How deep are we in indentation clicks so far?
   */
  comment?(
    tag: ITag,
    opts: RequiredCommentOptions,
    depth: number
  ): string;
}

export type BaseDecoder = (tag: ITag, opts: RequiredDecodeOptions) => unknown;

export type TagDecoder = BaseDecoder & ICommenter;

export type TagDecoderMap = Map<TagNumber, TagDecoder>;

/**
 * Options for decoding.
 */
export interface DecodeStreamOptions {
  /**
   * Maximum allowed depth to parse into CBOR structures.  This limit is
   * security-relevant for untrusted inputs.  May be set to Infinity for
   * trusted inputs, but be careful!
   * @default 1024
   */
  maxDepth?: number;

  /**
   * If the input is a string, how should it be decoded into a byte stream?
   * Ignored if the input is a Uint8Array.
   * @default null
   */
  encoding?: 'base64' | 'hex' | null;

  /**
   * Reject integers and lengths that could have been encoded in a smaller
   * encoding.
   *
   * @default false
   */
  requirePreferred?: boolean;
}

/**
 * These less-complex types are decoded as tokens at this level.
 */
export type DecodeValue = Simple | Symbol | Uint8Array | bigint | boolean |
number | string | null | undefined;

export interface Sliceable {
  toHere(begin?: number): Uint8Array;
}

/**
 * Information about a decoded CBOR data item.  3-element tuple, containing:
 * - Major type.
 * - Additional Information (int if < 23, else length as 24-27, 31 as stream).
 * - Decoded token value.
 * - Offset into the input where this item started.
 */
export type MtAiValue = [
  mt: number,
  ai: number,
  val: DecodeValue,
  offset: number,
  len: bigint | number,
];

// Circular
export interface ParentConstructor {
  // eslint-disable-next-line @typescript-eslint/prefer-function-type
  new(
    mav: MtAiValue,
    left: number,
    parent: Parent | undefined,
    opts: RequiredDecodeOptions,
  ): Parent;
}

export interface Decodeable {
  decode(options: RequiredDecodeOptions): unknown;
}

export interface Parent {
  parent: Parent | undefined;
  children: Decodeable | unknown[];
  left: number;
  offset: number;
  depth: number;

  get done(): boolean;

  get isStreaming(): boolean;

  push(child: unknown, stream: Sliceable, offset: number): number;

  replaceLast(child: unknown, item: Parent, stream: Sliceable): unknown;

  convert(stream: Sliceable): unknown;
}

/**
 * See String.prototype.normalize.
 */
export type StringNormalization = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';

/**
 * Different styles of diagnose output for "spec" sizes.  "Spec" sizes
 * are _i for 0-23 encoded in the AI byte, _0 for one extra byte, _1
 * for two extra bytes, _2 for four extra bytes, _3 for eight extra bytes,
 * and a plain _ for indefinite encoding.
 */
export enum DiagnosticSizes {
  /** Never use spec sizes, except for as required for indefinite encoding. */
  NEVER = -1,

  /** Only use spec sizes when non-preferred encoding was used. */
  PREFERRED = 0,

  /** Always use spec sizes. */
  ALWAYS = 1,
}

export type ObjectCreator =
  (kve: KeyValueEncoded[], opts: RequiredDecodeOptions) => unknown;

/**
 * Decoding options.
 */
export interface DecodeOptions extends DecodeStreamOptions {
  /**
   * What type to create when a container is needed? This is used internally
   * by comment and diagnose to add separate functionality.  Internal use only.
   * @default CBORContainer
   * @private
   */
  ParentType?: ParentConstructor;

  /**
   * Should numbers and strings be created as boxed instances, which retain
   * their original encoding for round-tripping?  If this is true,
   * saveOriginal is also set to true.  Think of this as "saveOriginal +
   * extras".  The thought is that most use cases for saveOriginal will want
   * the original encoding of an object or array, and won't care about the
   * original encoding of strings and numbers.  Turning this on also has the
   * side-effect of making all CBOR maps decode as JS Map objects, rather than
   * plain Objects.
   * @default false
   */
  boxed?: boolean;

  /**
   * Turn on options for draft-ietf-cbor-cde-05.
   */
  cde?: boolean;

  /**
   * In dCBOR, JS numbers between 2^53 and 2^64 get encoded as CBOR integers.
   * When decoding, present them as JS numbers instead of BigInt, losing
   * accuracy.
   */
  convertUnsafeIntsToFloat?: boolean;

  /**
   * Turn on options for draft-mcnally-deterministic-cbor-11.
   */
  dcbor?: boolean;

  /**
   * Should the size of an element always be appended to that element using
   * an underscore when calling diagnose?
   * @default DiagnosticSizes.PREFERRED
   */
  diagnosticSizes?: DiagnosticSizes;

  /**
   * Create an object from an array of key-value pairs.  The default
   * implementation creates a plain JS object if all of the keys are strings,
   * otherwise creates a Map (unless preferMap or boxed is set, in which case
   * a Map is always created).
   */
  createObject?: ObjectCreator;

  /**
   * Always generate Map instances when decoding, instead of trying to
   * generate object instances when all of the keys are strings.  If you
   * have the boxed option on, this option has no effect, and Maps are always
   * produced.
   */
  preferMap?: boolean;

  /**
   * Pretty-print diagnostic format.
   * @default false
   */
  pretty?: boolean;

  /**
   * Reject negative integers in the range [CBOR_NEGATIVE_INT_MAX ...
   * STANDARD_NEGATIVE_INT_MAX - 1].
   * @default false
   */
  rejectLargeNegatives?: boolean;

  /**
   * If there are bigint (tag 2/3) in the incoming data, exit with an error.
   * @default false
   */
  rejectBigInts?: boolean;

  /**
   * If there are duplicate keys in a map, should we throw an exception? Note:
   * this is more compute-intensive than expected at the moment, but that will
   * be fixed eventually.
   * @default false
   */
  rejectDuplicateKeys?: boolean;

  /**
   * Reject any floating point numbers.  This might be used in profiles that
   * are not expecting floats to prevent one from being coerced to an
   * integer-looking number without the receiver knowing.
   * @default false
   */
  rejectFloats?: boolean;

  /**
   * Reject any mt 0/1 numbers.  This might be used in profiles that expect
   * all numbers to be encoded as floating point.
   * @default false
   */
  rejectInts?: boolean;

  /**
   * Reject floating point numbers that should have been encoded in shorter
   * form, including having been encoded as an integer.
   */
  rejectLongFloats?: boolean;

  /**
   * Reject NaNs that are not encoded as 0x7e00.
   * @default false
   */
  rejectLongNaN?: boolean;

  /**
   * If negative zero (-0) is received, throw an error.
   * @default false
   */
  rejectNegativeZero?: boolean;

  /**
   * Reject simple values other than true, false, undefined, and null.
   * @default false
   */
  rejectSimple?: boolean;

  /**
   * Reject any attempt to decode streaming CBOR.
   * @default false
   */
  rejectStreaming?: boolean;

  /**
   * Reject subnormal floating point numbers.
   * @default false
   */
  rejectSubnormal?: boolean;

  /**
   * Reject strings that are not normalized with the given normalization form.
   * Don't use this without Unicode expertise.
   */
  rejectStringsNotNormalizedAs?: StringNormalization | null;

  /**
   * For dCBOR, reject "integers" between 2^53 and 2^64 that were encoded
   * as floats.
   */
  rejectUnsafeFloatInts?: boolean;

  /**
   * Reject the `undefined` simple value.  Usually used with rejectSimple.
   * @default false
   */
  rejectUndefined?: boolean;

  /**
   * Save the original bytes associated with every object as a property of
   * that object.  Use `getEncoded(obj)` to retrieve the associated bytes.
   * If you need the original encoded form of primitive items such as numbers
   * and strings, set `boxed: true` as well.
   */
  saveOriginal?: boolean;

  /**
   * If non-null, keys being decoded MUST be in this order.  Note that this is a
   * superset of rejectDuplicateKeys, and is slightly more efficient.
   * @default null
   */
  sortKeys?: KeySorter | null;

  /**
   * If non-null, prefer any tags in the map to ones have have been registered
   * with Tag.registerDecoder.
   */
  tags?: TagDecoderMap | null;
}

export type RequiredDecodeOptions = Required<DecodeOptions>;

/**
 * Comment options on top of the decode options.
 */
export interface CommentOptions extends DecodeOptions {
  /**
   * For the root object, how many levels of nesting is it already?
   * Happens with tag 24.
   * @default 0
   */
  initialDepth?: number;

  /**
   * If true, don't add the initial 0xHEX line to comment output.
   * @default false
   */
  noPrefixHex?: boolean;

  /**
   * The '--' separating bytes from description must be in at least this
   * column.
   * @default 0
   */
  minCol: number;
}

export type RequiredCommentOptions = Required<CommentOptions>;

export interface WriterOptions {
  chunkSize?: number;
}

export type RequiredWriterOptions = Required<WriterOptions>;

export interface EncodeOptions extends WriterOptions {
  /**
   * Encode all integers as floating point numbers of the correct size.
   * @default false
   */
  avoidInts?: boolean;

  /**
   * Turn on options for draft-ietf-cbor-cde-05.
   */
  cde?: boolean;

  /**
   * Should bigints that can fit into normal integers be collapsed into
   * normal integers?
   * @default true
   */
  collapseBigInts?: boolean;

  /**
   * Turn on options for draft-mcnally-deterministic-cbor-11.
   */
  dcbor?: boolean;

  /**
   * When writing floats, always use the 64-bit version.  Often combined with
   * `avoidInts`.
   * @default false
   */
  float64?: boolean;

  /**
   * When writing floats, first flush any subnormal numbers to zero before
   * decoding on encoding.
   */
  flushToZero?: boolean;

  /**
   * How to write TypedArrays?
   * Null to use the current platform's endian-ness.
   * True to always use little-endian.
   * False to always use big-endian.
   * @default null
   */
  forceEndian?: boolean | null;

  /**
   * Ignore sizes on boxed numbers; they might be overly-large.
   * @default false
   */
  ignoreOriginalEncoding?: boolean;

  /**
   * Do not encode numbers in the range  [CBOR_NEGATIVE_INT_MAX ...
   * STANDARD_NEGATIVE_INT_MAX - 1] as MT 1.
   * @default false
   */
  largeNegativeAsBigInt?: boolean;

  /**
   * Per dcbor:
   *
   * "MUST check whether floating point values to be encoded have the
   * numerically equal value in DCBOR_INT = [-2^63, 2^64-1].  If that is the
   * case, it MUST be converted to that numerically equal integer value
   * before encoding it.  (Preferred encoding will then ensure the shortest
   * length encoding is used.)  If a floating point value has a non-zero
   * fractional part, or an exponent that takes it out of DCBOR_INT, the
   * original floating point value is used for encoding.  (Specifically,
   * conversion to a CBOR bignum is never considered.)"
   *
   * This should only apply to "integers" that are outside the JS safe range
   * of [-(2^53 - 1), 2^53-1].
   */
  reduceUnsafeNumbers?: boolean;

  /**
   * Do not encode bigints that cannot be reduced to integers.
   * @default false
   */
  rejectBigInts?: boolean;

  /**
   * If true, error instead of encoding an instance of Simple.
   * @default false
   */
  rejectCustomSimples?: boolean;

  /**
   * Check that Maps do not contain keys that encode to the same bytes as
   * one another.  This is possible in a Map with object keys.
   * @default false
   */
  rejectDuplicateKeys?: boolean;

  /**
   * Do not encode floating point numbers that cannot be reduced to integers.
   * @default false
   */
  rejectFloats?: boolean;

  /**
   * If true, error instead of encoding `undefined`.
   * @default false
   */
  rejectUndefined?: boolean;

  /**
   * If true, encode -0 as 0.
   * @default false
   */
  simplifyNegativeZero?: boolean;

  /**
   * How should the key/value pairs be sorted before an object or Map
   * gets created?  If null, no sorting is performed.
   * @default null
   */
  sortKeys?: KeySorter | null;

  /**
   * If specified, normalize strings on encoding.  'NFD' may optimize for CPU,
   * 'NFC' may optimize for size.  Don't use this without Unicode
   * expertise.  In particular, the 'K' forms are really unlikely to be useful.
   * @default undefined
   */
  stringNormalization?: StringNormalization | null;

  /**
   * If specified, override how these types are encoded for this call to encode.
   */
  types?: TypeEncoderMap | null;
}

export type RequiredEncodeOptions = Required<EncodeOptions>;
