/**
 * Configuration interfaces for Split.io Angular SDK
 */
import * as SplitIO from '@splitsoftware/splitio-browserjs/types/splitio';

/**
 * Configuration interface for Split.io SDK provider
 */
export interface SplitConfig extends SplitIO.IClientSideSettings {
  /**
   * Whether to automatically initialize the SDK on app bootstrap
   * @default true
   */
  autoInit?: boolean;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Custom error handler for SDK errors
   */
  errorHandler?: (error: Error) => void;
}

/**
 * Options for configuring Split.io features
 */
export interface SplitFeatureOptions {
  /**
   * Enable automatic impression tracking
   * @default true
   */
  enableImpressions?: boolean;

  /**
   * Enable automatic event tracking
   * @default true
   */
  enableEvents?: boolean;

  /**
   * Custom treatment evaluator
   */
  treatmentEvaluator?: (key: SplitIO.SplitKey, flagName: string, attributes?: SplitIO.Attributes) => SplitIO.Treatment;
}

/**
 * Default configuration values
 */
export const DEFAULT_SPLIT_CONFIG: Partial<SplitConfig> = {
  autoInit: true,
  debug: false,
  startup: {
    readyTimeout: 10000,
  },
  features: {},
};
