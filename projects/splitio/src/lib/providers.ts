/**
 * Angular provider functions for Split.io SDK
 */
import {
  EnvironmentProviders,
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
  Provider,
  signal,
  Signal,
} from '@angular/core';

import {
  BehaviorSubject,
  from,
  Observable,
} from 'rxjs';

import { SplitFactory } from '@splitsoftware/splitio-browserjs';
import * as SplitIO from '@splitsoftware/splitio-browserjs/types/splitio';

import {
  DEFAULT_SPLIT_CONFIG,
  SplitConfig,
  SplitFeatureOptions,
} from './config';
import { VERSION } from './utils/constants';

/**
 * Injection token for Split.io configuration
 */
export const SPLIT_CONFIG = new InjectionToken<SplitConfig>('SPLIT_CONFIG');

/**
 * Injection token for Split.io feature options
 */
export const SPLIT_FEATURE_OPTIONS = new InjectionToken<SplitFeatureOptions>('SPLIT_FEATURE_OPTIONS');

/**
 * Split.io service that auto-initializes based on configuration
 */
@Injectable({
  providedIn: 'root'
})
export class SplitIoService {
  private readonly config = inject(SPLIT_CONFIG);
  private readonly featureOptions = inject(SPLIT_FEATURE_OPTIONS, { optional: true });

  private splitio?: SplitIO.IBrowserSDK;
  private splitClient?: SplitIO.IBrowserClient;
  private splitManager?: SplitIO.IManager;
  private clientsMap = new Map<string, SplitIO.IBrowserClient>();
  private emittedEvents = new Map<string, boolean>();

  private readonly _isReady$ = new BehaviorSubject<boolean>(false);
  private readonly _isReadyFromCache$ = new BehaviorSubject<boolean>(false);
  private readonly _isTimedOut$ = new BehaviorSubject<boolean>(false);
  private readonly _hasUpdate$ = new BehaviorSubject<boolean>(false);

  // Signal-based state
  private readonly _isReadySignal = signal(false);
  private readonly _isReadyFromCacheSignal = signal(false);
  private readonly _isTimedOutSignal = signal(false);
  private readonly _hasUpdateSignal = signal(false);

  /**
   * Observable that emits when the SDK is ready
   */
  readonly isReady$ = this._isReady$.asObservable();

  /**
   * Observable that emits when the SDK is ready from cache
   */
  readonly isReadyFromCache$ = this._isReadyFromCache$.asObservable();

  /**
   * Observable that emits when the SDK times out
   */
  readonly isTimedOut$ = this._isTimedOut$.asObservable();

  /**
   * Observable that emits when the SDK has updates
   */
  readonly hasUpdate$ = this._hasUpdate$.asObservable();

  /**
   * Signal that indicates when the SDK is ready
   * @example
   * ```typescript
   * readonly canUseSdk = computed(() => this.splitService.isReadySignal());
   * ```
   */
  readonly isReadySignal: Signal<boolean> = this._isReadySignal.asReadonly();

  /**
   * Signal that indicates when the SDK is ready from cache
   */
  readonly isReadyFromCacheSignal: Signal<boolean> = this._isReadyFromCacheSignal.asReadonly();

  /**
   * Signal that indicates when the SDK times out
   */
  readonly isTimedOutSignal: Signal<boolean> = this._isTimedOutSignal.asReadonly();

  /**
   * Signal that indicates when the SDK has updates
   */
  readonly hasUpdateSignal: Signal<boolean> = this._hasUpdateSignal.asReadonly();

  /**
   * Whether the SDK is currently ready
   */
  get isReady(): boolean {
    return this._isReady$.value;
  }

  constructor() {
    if (this.config.autoInit !== false) {
      this.initialize();
    }
  }

  /**
   * Initialize the Split.io SDK
   */
  private async initialize(): Promise<void> {
    try {
      if (this.splitio) {
        this.logWarning('SDK is already initialized');
        return;
      }

      const configWithDefaults = {
        ...DEFAULT_SPLIT_CONFIG,
        ...this.config,
      };

      // @ts-ignore. 2nd param is not part of type definitions. Used to overwrite the version of the SDK for correct tracking.
      this.splitio = SplitFactory(configWithDefaults, (modules) => {
        modules.settings.version = VERSION;
        // Update getEventSource method to add ngsw-bypass parameter to streaming url to bypass angular service workers
        modules.platform.getEventSource = () => {
          if (typeof EventSource === 'function') {
            return class CustomEventSource extends EventSource {
              constructor(url: string, eventSourceInitDict?: any) {
                super(url + '&ngsw-bypass=true', eventSourceInitDict);
              }
            };
          }
        };
      });

      this.splitClient = this.splitio.client();
      this.splitManager = this.splitio.manager();

      this.setupEventListeners();
      this.clientsMap.set(this.buildInstanceKey(configWithDefaults.core.key), this.splitClient);

      this.logDebug('Split.io SDK initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Set up event listeners for SDK events
   */
  private setupEventListeners(): void {
    if (!this.splitClient) return;

    this.splitClient.on(this.splitClient.Event.SDK_READY, () => {
      this._isReady$.next(true);
      this._isReadySignal.set(true);
      this.logDebug('SDK ready');
    });

    this.splitClient.on(this.splitClient.Event.SDK_READY_FROM_CACHE, () => {
      this._isReadyFromCache$.next(true);
      this._isReadyFromCacheSignal.set(true);
      this.logDebug('SDK ready from cache');
    });

    this.splitClient.on(this.splitClient.Event.SDK_READY_TIMED_OUT, () => {
      this._isTimedOut$.next(true);
      this._isTimedOutSignal.set(true);
      this.logWarning('SDK timed out');
    });

    this.splitClient.on(this.splitClient.Event.SDK_UPDATE, () => {
      this._hasUpdate$.next(true);
      this._hasUpdateSignal.set(true);
      this.logDebug('SDK update received');
    });
  }

  /**
   * Create a new client for a specific key
   */
  createClient(key: SplitIO.SplitKey): Observable<SplitIO.IBrowserClient> {
    return new Observable(subscriber => {
      if (!this.splitio) {
        subscriber.error(new Error('SDK not initialized. Make sure provideSplitIo() is called in your app providers.'));
        return;
      }

      const instanceKey = this.buildInstanceKey(key);

      if (this.clientsMap.has(instanceKey)) {
        this.logWarning(`Client for key ${instanceKey} already exists`);
        subscriber.next(this.clientsMap.get(instanceKey)!);
        subscriber.complete();
        return;
      }

      const client = this.splitio.client(key);
      this.clientsMap.set(instanceKey, client);

      client.on(client.Event.SDK_READY, () => {
        subscriber.next(client);
        subscriber.complete();
      });

      client.on(client.Event.SDK_READY_TIMED_OUT, () => {
        subscriber.error(new Error(`Client for key ${instanceKey} timed out`));
      });
    });
  }

  /**
   * Get a treatment for a feature flag
   */
  getTreatment(featureFlagName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatment;
  getTreatment(key: SplitIO.SplitKey, featureFlagName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatment;
  getTreatment(
    keyOrFlag: SplitIO.SplitKey | string,
    flagNameOrAttributes?: string | SplitIO.Attributes,
    attributesOrOptions?: SplitIO.Attributes | SplitIO.EvaluationOptions,
    options?: SplitIO.EvaluationOptions
  ): SplitIO.Treatment {
    if (!this.splitClient) {
      this.logError('SDK not ready. Cannot get treatment.');
      return 'control';
    }

    // Handle overloaded parameters
    if (typeof keyOrFlag === 'string' && typeof flagNameOrAttributes !== 'string') {
      // getTreatment(featureFlagName, attributes?, options?)
      return this.splitClient.getTreatment(
        keyOrFlag,
        flagNameOrAttributes as SplitIO.Attributes,
        attributesOrOptions as SplitIO.EvaluationOptions
      );
    } else {
      // getTreatment(key, featureFlagName, attributes?, options?)
      const client = this.getClientForKey(keyOrFlag as SplitIO.SplitKey);
      return client.getTreatment(
        flagNameOrAttributes as string,
        attributesOrOptions as SplitIO.Attributes,
        options
      );
    }
  }

  /**
   * Get treatment with config
   */
  getTreatmentWithConfig(featureFlagName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.TreatmentWithConfig;
  getTreatmentWithConfig(key: SplitIO.SplitKey, featureFlagName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.TreatmentWithConfig;
  getTreatmentWithConfig(
    keyOrFlag: SplitIO.SplitKey | string,
    flagNameOrAttributes?: string | SplitIO.Attributes,
    attributesOrOptions?: SplitIO.Attributes | SplitIO.EvaluationOptions,
    options?: SplitIO.EvaluationOptions
  ): SplitIO.TreatmentWithConfig {
    if (!this.splitClient) {
      this.logError('SDK not ready. Cannot get treatment with config.');
      return { treatment: 'control', config: null };
    }

    if (typeof keyOrFlag === 'string' && typeof flagNameOrAttributes !== 'string') {
      return this.splitClient.getTreatmentWithConfig(
        keyOrFlag,
        flagNameOrAttributes as SplitIO.Attributes,
        attributesOrOptions as SplitIO.EvaluationOptions
      );
    } else {
      const client = this.getClientForKey(keyOrFlag as SplitIO.SplitKey);
      return client.getTreatmentWithConfig(
        flagNameOrAttributes as string,
        attributesOrOptions as SplitIO.Attributes,
        options
      );
    }
  }

  /**
   * Get multiple treatments
   */
  getTreatments(featureFlagNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatments;
  getTreatments(key: SplitIO.SplitKey, featureFlagNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatments;
  getTreatments(
    keyOrFlags: SplitIO.SplitKey | string[],
    flagNamesOrAttributes?: string[] | SplitIO.Attributes,
    attributesOrOptions?: SplitIO.Attributes | SplitIO.EvaluationOptions,
    options?: SplitIO.EvaluationOptions
  ): SplitIO.Treatments {
    if (!this.splitClient) {
      this.logError('SDK not ready. Cannot get treatments.');
      return {};
    }

    if (Array.isArray(keyOrFlags)) {
      return this.splitClient.getTreatments(
        keyOrFlags,
        flagNamesOrAttributes as SplitIO.Attributes,
        attributesOrOptions as SplitIO.EvaluationOptions
      );
    } else {
      const client = this.getClientForKey(keyOrFlags);
      return client.getTreatments(
        flagNamesOrAttributes as string[],
        attributesOrOptions as SplitIO.Attributes,
        options
      );
    }
  }

  /**
   * Track an event
   */
  track(trafficType: string, eventType: string, value?: number, properties?: SplitIO.Properties): boolean;
  track(key: SplitIO.SplitKey, trafficType: string, eventType: string, value?: number, properties?: SplitIO.Properties): boolean;
  track(
    keyOrTrafficType: SplitIO.SplitKey | string,
    trafficTypeOrEventType?: string,
    eventTypeOrValue?: string | number,
    valueOrProperties?: number | SplitIO.Properties,
    properties?: SplitIO.Properties
  ): boolean {
    if (!this.splitClient) {
      this.logError('SDK not ready. Cannot track event.');
      return false;
    }

    if (typeof trafficTypeOrEventType === 'string' && typeof eventTypeOrValue === 'string') {
      // track(key, trafficType, eventType, value?, properties?)
      const client = this.getClientForKey(keyOrTrafficType as SplitIO.SplitKey);
      return client.track(
        trafficTypeOrEventType,
        eventTypeOrValue,
        valueOrProperties as number,
        properties
      );
    } else {
      // track(trafficType, eventType, value?, properties?)
      return this.splitClient.track(
        keyOrTrafficType as string,
        trafficTypeOrEventType as string,
        eventTypeOrValue as number,
        valueOrProperties as SplitIO.Properties
      );
    }
  }

  /**
   * Get Split views (feature flag metadata)
   */
  getSplits(): SplitIO.SplitViews {
    if (!this.splitManager) {
      this.logError('SDK not ready. Cannot get splits.');
      return [];
    }
    return this.splitManager.splits();
  }

  /**
   * Get a specific Split view
   */
  getSplit(featureFlagName: string): SplitIO.SplitView | null {
    if (!this.splitManager) {
      this.logError('SDK not ready. Cannot get split.');
      return null;
    }
    return this.splitManager.split(featureFlagName);
  }

  /**
   * Get Split names
   */
  getSplitNames(): SplitIO.SplitNames {
    if (!this.splitManager) {
      this.logError('SDK not ready. Cannot get split names.');
      return [];
    }
    return this.splitManager.names();
  }

  /**
   * Wait for the SDK to be ready
   */
  ready(): Promise<void> {
    if (!this.splitClient) {
      return Promise.reject(new Error('SDK not initialized'));
    }
    return this.splitClient.ready();
  }

  /**
   * Destroy the SDK and clean up resources
   */
  destroy(): Observable<void> {
    if (!this.splitClient) {
      return from(Promise.resolve());
    }

    // Clean up clients
    this.clientsMap.forEach((client, key) => {
      if (key !== this.buildInstanceKey(this.config.core.key)) {
        client.destroy();
      }
    });
    this.clientsMap.clear();

    // Clean up observables
    this._isReady$.complete();
    this._isReadyFromCache$.complete();
    this._isTimedOut$.complete();
    this._hasUpdate$.complete();

    // Destroy main client
    const destroyPromise = this.splitClient.destroy();
    this.splitio = undefined;
    this.splitClient = undefined;
    this.splitManager = undefined;

    return from(destroyPromise);
  }

  /**
   * Get client for a specific key
   */
  private getClientForKey(key: SplitIO.SplitKey): SplitIO.IBrowserClient {
    const instanceKey = this.buildInstanceKey(key);
    const client = this.clientsMap.get(instanceKey);

    if (!client) {
      this.logError(`Client for key ${instanceKey} not found. Use createClient() first.`);
      // Return the main client as fallback
      return this.splitClient!;
    }

    return client;
  }

  /**
   * Build instance key for client mapping
   */
  private buildInstanceKey(key: SplitIO.SplitKey): string {
    if (typeof key === 'string') return key;
    return `${key.matchingKey || key.bucketingKey}-${key.bucketingKey || key.matchingKey}-`;
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    if (this.config.errorHandler) {
      this.config.errorHandler(error);
    } else {
      this.logError(error.message);
    }
  }

  /**
   * Log debug messages
   */
  private logDebug(message: string): void {
    if (this.config.debug) {
      console.log(`[Split.io Debug] ${message}`);
    }
  }

  /**
   * Log warning messages
   */
  private logWarning(message: string): void {
    console.warn(`[Split.io Warning] ${message}`);
  }

  /**
   * Log error messages
   */
  private logError(message: string): void {
    console.error(`[Split.io Error] ${message}`);
  }
}

/**
 * Configuration feature for provideSplitIo
 */
export interface SplitConfigFeature {
  ɵkind: 'SplitConfigFeature';
  ɵproviders: Provider[];
}

/**
 * Feature options feature for provideSplitIo
 */
export interface SplitFeatureOptionsFeature {
  ɵkind: 'SplitFeatureOptionsFeature';
  ɵproviders: Provider[];
}

/**
 * Union type for all Split.io features
 */
export type SplitFeature = SplitConfigFeature | SplitFeatureOptionsFeature;

/**
 * Configure Split.io with custom configuration
 */
export function withConfig(config: SplitConfig): SplitConfigFeature {
  return {
    ɵkind: 'SplitConfigFeature',
    ɵproviders: [
      {
        provide: SPLIT_CONFIG,
        useValue: config,
      },
    ],
  };
}

/**
 * Configure Split.io with feature options
 */
export function withFeatureOptions(options: SplitFeatureOptions): SplitFeatureOptionsFeature {
  return {
    ɵkind: 'SplitFeatureOptionsFeature',
    ɵproviders: [
      {
        provide: SPLIT_FEATURE_OPTIONS,
        useValue: options,
      },
    ],
  };
}

/**
 * Main provider function for Split.io SDK following Angular patterns
 *
 * @example
 * ```typescript
 * // Basic usage
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideSplitIo(
 *       withConfig({
 *         core: {
 *           authorizationKey: 'YOUR_SDK_KEY',
 *           key: 'user-id'
 *         }
 *       })
 *     )
 *   ]
 * });
 *
 * // Advanced usage with features
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideSplitIo(
 *       withConfig({
 *         core: {
 *           authorizationKey: 'YOUR_SDK_KEY',
 *           key: 'user-id'
 *         },
 *         debug: true,
 *         autoInit: true
 *       }),
 *       withFeatureOptions({
 *         enableImpressions: true,
 *         enableEvents: true
 *       })
 *     )
 *   ]
 * });
 *
 * // Using signals in components
 * @Component({
 *   template: `
 *     @if (isReady()) {
 *       <p>SDK is ready!</p>
 *     }
 *     <p>Can show feature: {{ canShowFeature() }}</p>
 *   `
 * })
 * export class MyComponent {
 *   private splitService = inject(SplitIoService);
 *
 *   // Use signals directly
 *   readonly isReady = this.splitService.isReadySignal;
 *
 *   // Combine with computed for derived state
 *   readonly canShowFeature = computed(() =>
 *     this.isReady() && !this.splitService.isTimedOutSignal()
 *   );
 *
 *   // Use in effects
 *   constructor() {
 *     effect(() => {
 *       if (this.isReady()) {
 *         console.log('SDK is ready, fetch treatments');
 *       }
 *     });
 *   }
 * }
 * ```
 */
export function provideSplitIo(...features: SplitFeature[]): EnvironmentProviders {
  const providers: Provider[] = [SplitIoService];

  // Process all features and collect their providers
  for (const feature of features) {
    providers.push(...feature.ɵproviders);
  }

  // Ensure we have a default config if none provided
  const hasConfig = features.some(f => f.ɵkind === 'SplitConfigFeature');
  if (!hasConfig) {
    providers.push({
      provide: SPLIT_CONFIG,
      useValue: DEFAULT_SPLIT_CONFIG,
    });
  }

  return makeEnvironmentProviders(providers);
}
