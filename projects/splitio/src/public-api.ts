/*
 * Public API Surface of splitio
 */

// provider-based API (recommended)
export {
  provideSplitIo,
  SPLIT_CONFIG,
  SPLIT_FEATURE_OPTIONS,
  SplitIoService,
  withConfig,
  withFeatureOptions,
} from './lib/providers';

export {
  DEFAULT_SPLIT_CONFIG,
  SplitConfig,
  SplitFeatureOptions,
} from './lib/config';

export {
  createMultiTreatmentGuard,
  createTreatmentGuard,
  splitIoReadyGuard,
  splitIoReadyMatchGuard,
} from './lib/guards';

// Legacy service-based API (deprecated)
export { SplitService } from './lib/splitio.service';
export { SplitioGuard } from './lib/splitio.guard';

// Re-export from Split.io SDK for convenience
export {
  DebugLogger,
  ErrorLogger,
  InfoLogger,
  InLocalStorage,
  WarnLogger,
} from '@splitsoftware/splitio-browserjs';
