/**
 * Batteries-included easy entry point.  Pulls in all type encoders and
 * decoders.
 *
 * If you only need encoding *or* decoding, or if you don't want to use
 * tags in either direction, or if you just want more control, you might
 * want to import different modules directly.
 *
 * @module
 */

import { CBORContainer } from './src/main/ts/container';

export type { DecodeStream, ValueGenerator } from './src/main/ts/decodeStream';

export type {
  BaseDecoder,
  CommentOptions,
  Decodeable,
  DecodeOptions,
  DecodeStreamOptions,
  DecodeValue,
  EncodeOptions,
  MtAiValue,
  ICommenter,
  ITag,
  ObjectCreator,
  Parent,
  ParentConstructor,
  RequiredCommentOptions,
  RequiredDecodeOptions,
  RequiredEncodeOptions,
  RequiredWriterOptions,
  Sliceable,
  StringNormalization,
  TagDecoder,
  TagDecoderMap,
  TagNumber,
  WriterOptions,
} from './src/main/ts/options';

export { DiagnosticSizes } from './src/main/ts/options';

export { decode, decodeSequence, SequenceEvents } from './src/main/ts/decoder';

export { diagnose } from './src/main/ts/diagnostic';

export { comment } from './src/main/ts/comment';

export {
  cdeEncodeOptions,
  defaultEncodeOptions,
  dcborEncodeOptions,
  encode,
  encodedNumber,
} from './src/main/ts/encoder';

export { Simple } from './src/main/ts/simple';

export { Tag } from './src/main/ts/tag';

export { type ToCBOR, Writer } from './src/main/ts/writer';

export { saveEncoded, saveEncodedLength, unbox, getEncoded, type OriginalEncoding } from './src/main/ts/box';

export const {
  cdeDecodeOptions,
  dcborDecodeOptions,
  defaultDecodeOptions,
} = CBORContainer;

export {
  type AbstractClassType,
  type TaggedValue,
  type TypeEncoder,
  TypeEncoderMap,
} from './src/main/ts/typeEncoderMap';
