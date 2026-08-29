/**
 * The standing strategy brief, re-exported as one module.
 *
 * Split by concern — who we are, how each platform is played, what the buckets
 * are, how things are labelled, where our profiles live — because a single
 * 300-line file mixed the brand voice the model reads with the hex codes a
 * chip renders, and the two change for entirely different reasons.
 */
export { BRAND } from "./brand";
export { PLATFORM_STRATEGY, CAPTION_SPEC, type PlatformStrategy } from "./platforms";
export {
  BUCKET_DEFINITIONS,
  PLATFORM_BUCKET_MIX,
  bucketTarget,
  bucketsForPlatform,
  type BucketDefinition,
} from "./buckets";
export {
  BUCKET_COLOR,
  BUCKET_LABEL,
  FORMAT_LABEL,
  PLATFORM_GRADIENT,
  PLATFORM_LABEL,
  bucketChipStyle,
} from "./presentation";
export { platformUrl } from "./links";
