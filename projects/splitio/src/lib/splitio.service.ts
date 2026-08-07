import { Injectable } from '@angular/core';

import {
  from,
  Observable,
} from 'rxjs';

import { SplitFactory } from '@splitsoftware/splitio-browserjs';
import * as SplitIO from '@splitsoftware/splitio-browserjs/types/splitio';

import { Deprecated } from './deprecation';
import {
  CONTROL_CLIENT,
  DEFAULT_MANAGER,
  INIT_CLIENT_EXISTS,
  INIT_CLIENT_FIRST,
  VERSION,
} from './utils/constants';
import {
  buildInstance,
  parseFlagSetParams,
  parseTrackParams,
  parseTreatmentParams,
} from './utils/utils';

/**
 * @deprecated Use SplitIoService with provideSplitIo() instead. This service will be removed in v5.0.0.
 *
 * Migration guide:
 *
 * Before:
 * ```typescript
 * constructor(private splitService: SplitService) {}
 *
 * ngOnInit() {
 *   this.splitService.init(config).subscribe(() => {
 *     // SDK ready
 *   });
 * }
 * ```
 *
 * After:
 * ```typescript
 * // In main.ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideSplitIo(withConfig(config))
 *   ]
 * });
 *
 * // In component
 * constructor(private splitService: SplitIoService) {}
 *
 * ngOnInit() {
 *   this.splitService.isReady$.subscribe(ready => {
 *     if (ready) {
 *       // SDK ready, auto-initialized
 *     }
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class SplitService {

  /**
   * The local reference to the Split SDK.
   */
  private splitio: SplitIO.IBrowserSDK | undefined;
  /**
   * The local reference to the Split SDK's Client.
   */
  private splitClient: SplitIO.IBrowserClient;
  /**
   * The local reference to the Split SDK's Manager.
   */
  private splitManager: SplitIO.IManager;
  /**
   * Map of intialized clients
   */
  private clientsMap: Map<string, SplitIO.IBrowserClient> = new Map<string, SplitIO.IBrowserClient>();
  /**
   * Map of events status of intialized clients
   */
  private emittedEvents: Map<string, boolean> = new Map<string, boolean>();
  /**
   * Flag to determine if SDK is ready or not.
   */
  isSDKReady = false;
  /**
   * Factory config
   */
  private config: SplitIO.IClientSideSettings;
  /**
   * SDK events observables
   */
  sdkReady$: Observable<string>;
  sdkReadyTimedOut$: Observable<string>;
  sdkReadyFromCache$: Observable<string>;
  sdkUpdate$: Observable<string>;

  /**
   * This method initializes the SDK with the required Browser SDK KEY
   * and the 'key' according to the Traffic type set (ex.: an user id).
   * @function init
   * @param {IClientSideSettings} config Should be an object that complies with the SplitIO.IClientSideSettings.
   * @returns {Observable<string>} Returns when sdk is ready
   * @deprecated Use provideSplitIo() with withConfig() instead
   */
  @Deprecated('provideSplitIo(withConfig(...))')
  init(config: SplitIO.IClientSideSettings): Observable<string> {
    if (this.splitio) {
      console.log('[ERROR] There is another instance of the SDK.');
      return new Observable(observer => observer.error(INIT_CLIENT_EXISTS));
    }
    this.config = config;
    // @ts-ignore. 2nd param is not part of type definitions. Used to overwrite the version of the SDK for correct tracking.
    this.splitio = SplitFactory(config, (modules) => {
      modules.settings.version = VERSION;
      // Update getEventSource method to add ngsw-bypass parameter to streaming url to bypass angular service workers
      modules.platform.getEventSource = () => {
        if (typeof EventSource === 'function')
          return class CustomEventSource extends EventSource {
            constructor(url: string, eventSourceInitDict?: any) {
              super(url+'&ngsw-bypass=true', eventSourceInitDict);
            }
          };
      };
    });
    this.splitClient = this.splitio.client();
    this.splitManager = this.splitio.manager();
    this.sdkInitEventObservable();
    const instanceKey = buildInstance(this.config.core.key);
    const sdkReady = this.splitClient.Event.SDK_READY;
    this.splitClient.on(sdkReady, () => {
      this.emittedEvents.set(instanceKey + sdkReady, true);
      this.isSDKReady = true;
    });
    this.clientsMap.set(instanceKey, this.splitClient);
    return this.sdkReady$;
  }

  /**
   * Returns a shared client of the SDK, associated with the given key
   * @function initClient
   * @param {SplitKey} key The key for the new client instance.
   * @returns {Observable<string>} Returns when sdk is ready
   */
  initClient(key: SplitIO.SplitKey): Observable<string> {
    let client = this.getSDKClient(key);
    if (client) {
      console.log('[WARN] client for key ' + buildInstance(key) + ' is already initialized.');
      return new Observable(observer => observer.error(INIT_CLIENT_EXISTS));
    }
    if (!this.splitio) return new Observable(observer => observer.error(INIT_CLIENT_FIRST));
    client = this.splitio.client(key);
    this.clientsMap.set(buildInstance(key), client);
    return this.toObservable(key, client, client.Event.SDK_READY);
  }

  private getClientObservable(key: SplitIO.SplitKey, event: string, isOneTimeEvent = true): Observable<string> {
    const client = this.getClient(key);
    if (client === CONTROL_CLIENT) {
      return new Observable(observer => observer.error(INIT_CLIENT_FIRST));
    }
    return this.toObservable(key, client, client.Event[event], isOneTimeEvent);
  }

  /**
   * Returns an observable that calls back when the client is ready
   * @function getClientSDKReady
   * @param {SplitKey} key The key for the client instance.
   * @returns {Observable<string>}
   */
  getClientSDKReady(key: SplitIO.SplitKey): Observable<string> {
    return this.getClientObservable(key, 'SDK_READY');
  }

  /**
   * Returns an observable that calls back when the client ready event is timed out
   * @function getClientSDKReadyTimedOut
   * @param {SplitKey} key The key for the client instance.
   * @returns {Observable<string>}
   */
  getClientSDKReadyTimedOut(key: SplitIO.SplitKey): Observable<string> {
    return this.getClientObservable(key, 'SDK_READY_TIMED_OUT');
  }

  /**
   * Returns an observable that calls back when the client is ready from cache
   * @function getClientSDKReadyFromCache
   * @param {SplitKey} key The key for the client instance.
   * @returns {Observable<string>}
   */
  getClientSDKReadyFromCache(key: SplitIO.SplitKey): Observable<string> {
    return this.getClientObservable(key, 'SDK_READY_FROM_CACHE');
  }

  /**
   * Returns an observable that calls back when the client is updated
   * @function getClientSDKUpdate
   * @param {SplitKey} key The key for the client instance.
   * @returns {Observable<string>}
   */
  getClientSDKUpdate(key: SplitIO.SplitKey): Observable<string> {
    return this.getClientObservable(key, 'SDK_UPDATE', false);
  }

  /**
   * initialize sdk Events into observables
   */
  private sdkInitEventObservable(): void {
    const client = this.splitClient;
    const mainKey = this.config.core.key;
    this.sdkReady$ = this.toObservable(mainKey, client, client.Event.SDK_READY);
    this.sdkReadyTimedOut$ = this.toObservable(mainKey, client, client.Event.SDK_READY_TIMED_OUT);
    this.sdkReadyFromCache$ = this.toObservable(mainKey, client, client.Event.SDK_READY_FROM_CACHE);
    this.sdkUpdate$ = this.toObservable(mainKey, client, client.Event.SDK_UPDATE, false);
  }

  /**
   * Returns a promise that will be resolved once the SDK has finished loading (SDK_READY event emitted) or rejected if the SDK has timedout (SDK_READY_TIMED_OUT event emitted).
   * As it's meant to provide similar flexibility to the event approach, given that the SDK might be eventually ready after a timeout event,
   * calling the ready method after the SDK had timed out will return a new promise that should eventually resolve if the SDK gets ready.
   * @returns Promise<void>
   */
  ready(): Promise<void> {
    return this.getClient().ready();
  }

  private isInitialized(): boolean {
    if (!this.splitio) {
      console.log('[ERROR] plugin should be initialized');
      return false;
    }
    return true;
  }

  /**
   * Returns the SDK client
   * @param {SplitKey=} key The key for the client instance.
   * @returns {IBrowserClient} split client.
   */
  getSDKClient(key?: SplitIO.SplitKey): SplitIO.IBrowserClient | undefined {
    if (!this.isInitialized()) return undefined;
    key = key ? key : this.config.core.key;
    return this.clientsMap.get(buildInstance(key));
  }

  /**
   * Returns the SDK factory
   * @returns {IBrowserSDK} split factory
   */
  getSDKFactory(): SplitIO.IBrowserSDK | undefined {
    if (!this.isInitialized()) return undefined;
    return this.splitio;
  }

  /**
   * Validates key and returns client if it is initialized for key or controlClient if it isn't
   */
  private getClient(key?: SplitIO.SplitKey): any {
    const client = this.getSDKClient(key);
    if (!client) {
      console.log('[ERROR] client' + ( key ? ' for key ' + buildInstance(key) : '') + ' should be initialized first.');
      return CONTROL_CLIENT;
    }
    return client;
  }

  /**
   * Returns a Treatment value, which is the treatment string for the given feature.
   * @function getTreatment
   * @param {SplitKey} key - The key for the client instance.
   * @param {string} featureFlagName - The string that represents the feature flag we want to get the treatment.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {Treatment} - The treatment string.
   */
  getTreatment(key: SplitIO.SplitKey, featureFlagName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatment;
  /**
   * Returns a Treatment value, which is the treatment string for the given feature.
   * @function getTreatment
   * @param {string} featureFlagName - The string that represents the feature flag we want to get the treatment.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {Treatment} - The treatment string.
   */
  getTreatment(featureFlagName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatment;
  getTreatment(
    param1: string | SplitIO.SplitKey,
    param2?: string | SplitIO.Attributes,
    param3?: SplitIO.Attributes | SplitIO.EvaluationOptions,
    param4?: SplitIO.EvaluationOptions
  ): SplitIO.Treatment {
    const { key, featureFlagNames, attributes, options } = parseTreatmentParams(param1, param2, param3, param4);
    return this.getClient(key).getTreatment(featureFlagNames, attributes, options);
  }

  /**
   * Returns a TreatmentWithConfig value, which is an object with both treatment and config string for the given feature.
   * @function getTreatmentWithConfig
   * @param {SplitKey} key - The key for the client instance.
   * @param {string} featureFlagName - The string that represents the feature flag we want to get the treatment.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {TreatmentWithConfig} - The map containing the treatment and the configuration stringified JSON (or null if there was no config for that treatment).
   */
  getTreatmentWithConfig(key: SplitIO.SplitKey, featureFlagName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.TreatmentWithConfig;
  /**
   * Returns a TreatmentWithConfig value, which is an object with both treatment and config string for the given feature.
   * @function getTreatmentWithConfig
   * @param {string} featureFlagName - The string that represents the feature flag we want to get the treatment.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {TreatmentWithConfig} - The map containing the treatment and the configuration stringified JSON (or null if there was no config for that treatment).
   */
  getTreatmentWithConfig(featureFlagName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.TreatmentWithConfig;
  getTreatmentWithConfig(
    param1: string | SplitIO.SplitKey,
    param2?: string | SplitIO.Attributes,
    param3?: SplitIO.Attributes | SplitIO.EvaluationOptions,
    param4?: SplitIO.EvaluationOptions
  ): SplitIO.TreatmentWithConfig {
    const { key, featureFlagNames, attributes, options } = parseTreatmentParams(param1, param2, param3, param4);
    return this.getClient(key).getTreatmentWithConfig(featureFlagNames, attributes, options);
  }

  /**
   * Returns a Treatments value, which is an object map with the treatments for the given features.
   * @function getTreatments
   * @param {SplitKey} key - The key for the client instance.
   * @param {Array<string>} featureFlagNames - An array of the feature flag names we want to get the treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {Treatments} - The treatments object map.
   */
  getTreatments(key: SplitIO.SplitKey, featureFlagNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatments;
  /**
   * Returns a Treatments value, which is an object map with the treatments for the given features.
   * @function getTreatments
   * @param {Array<string>} featureFlagNames - An array of the feature flag names we want to get the treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {Treatments} - The treatments object map.
   */
  getTreatments(featureFlagNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatments;
  getTreatments(
    param1: string[] | SplitIO.SplitKey,
    param2?: string[] | SplitIO.Attributes,
    param3?: SplitIO.Attributes | SplitIO.EvaluationOptions,
    param4?: SplitIO.EvaluationOptions
  ): SplitIO.Treatments {
    const { key, featureFlagNames, attributes, options } = parseTreatmentParams(param1, param2, param3, param4);
    return this.getClient(key).getTreatments(featureFlagNames, attributes, options);
  }

  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
   * @function getTreatmentsWithConfig
   * @param {SplitKey} key - The key for the client instance.
   * @param {Array<string>} featureFlagNames - An array of the feature flag names we want to get the treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfig(key: SplitIO.SplitKey, featureFlagNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.TreatmentsWithConfig;
  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
   * @function getTreatmentsWithConfig
   * @param {Array<string>} featureFlagNames - An array of the feature flag names we want to get the treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfig(featureFlagNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.TreatmentsWithConfig;
  getTreatmentsWithConfig(
    param1: string[] | SplitIO.SplitKey,
    param2?: string[] | SplitIO.Attributes,
    param3?: SplitIO.Attributes | SplitIO.EvaluationOptions,
    param4?: SplitIO.EvaluationOptions
  ): SplitIO.TreatmentsWithConfig {
    const { key, featureFlagNames, attributes, options } = parseTreatmentParams(param1, param2, param3, param4);
    return this.getClient(key).getTreatmentsWithConfig(featureFlagNames, attributes, options);
  }

  /**
   * Returns a Treatments value, which is an object map with the treatments for the given flag set.
   * @function getTreatmentsByFlagSet
   * @param {SplitKey} key - The key for the client instance.
   * @param {string} flagSetName - The string that represents the flag set we want to get the related feature flags and treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {Treatments} - The treatments object map.
   */
  getTreatmentsByFlagSet(key: SplitIO.SplitKey, flagSetName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatments;
  /**
   * Returns a Treatments value, which is an object map with the treatments for the given flag set.
   * @function getTreatmentsByFlagSet
   * @param {string} flagSetName - The string that represents the flag set we want to get the related feature flags and treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {Treatments} - The treatments object map.
   */
  getTreatmentsByFlagSet(flagSetName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatments;
  getTreatmentsByFlagSet(param1: string | SplitIO.SplitKey, param2?: string | SplitIO.Attributes, param3?: SplitIO.Attributes, param4?: SplitIO.EvaluationOptions): SplitIO.Treatments {
    const {key, flagSetNames, attributes, options} = parseFlagSetParams(param1, param2, param3, param4);
    return this.getClient(key).getTreatmentsByFlagSet(flagSetNames, attributes, options);
  }

  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given flag set.
   * @function getTreatmentsWithConfigByFlagSet
   * @param {SplitKey} key - The key for the client instance.
   * @param {string} flagSetName - The string that represents the flag set we want to get the related feature flags and treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfigByFlagSet(key: SplitIO.SplitKey, flagSetName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.TreatmentsWithConfig;
  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given flag set.
   * @function getTreatmentsWithConfigByFlagSet
   * @param {string} flagSetName - The string that represents the flag set we want to get the related feature flags and treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfigByFlagSet(flagSetName: string, attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.TreatmentsWithConfig;
  getTreatmentsWithConfigByFlagSet(param1: string | SplitIO.SplitKey, param2?: string | SplitIO.Attributes, param3?: SplitIO.Attributes, param4?: SplitIO.EvaluationOptions): SplitIO.TreatmentsWithConfig {
    const {key, flagSetNames, attributes, options} = parseFlagSetParams(param1, param2, param3, param4);
    return this.getClient(key).getTreatmentsWithConfigByFlagSet(flagSetNames, attributes, options);
  }

  /**
   * Returns a Treatments value, which is an object map with the treatments for the given flag sets.
   * @function getTreatmentsByFlagSets
   * @param {SplitKey} key - The key for the client instance.
   * @param {Array<string>} flagSetNames - An array of the flag set names we want to get the related feature flags and treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {Treatments} - The treatments object map.
   */
  getTreatmentsByFlagSets(key: SplitIO.SplitKey, flagSetNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatments;
  /**
   * Returns a Treatments value, which is an object map with the treatments for the given flag sets.
   * @function getTreatmentsByFlagSets
   * @param {Array<string>} flagSetNames - An array of the flag set names we want to get the related feature flags and treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {Treatments} - The treatments object map.
   */
  getTreatmentsByFlagSets(flagSetNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.Treatments;
  getTreatmentsByFlagSets(param1: string[] | SplitIO.SplitKey, param2?: string[] | SplitIO.Attributes, param3?: SplitIO.Attributes, param4?: SplitIO.EvaluationOptions): SplitIO.Treatments {
    const {key, flagSetNames, attributes, options} = parseFlagSetParams(param1, param2, param3, param4);
    return this.getClient(key).getTreatmentsByFlagSets(flagSetNames, attributes, options);
  }

  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given flag sets.
   * @function getTreatmentsWithConfigByFlagSets
   * @param {SplitKey} key - The key for the client instance.
   * @param {Array<string>} flagSetNames - An array of the flag set names we want to get the related feature flags and treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfigByFlagSets(key: SplitIO.SplitKey, flagSetNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.TreatmentsWithConfig;
  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given flag sets.
   * @function getTreatmentsWithConfigByFlagSets
   * @param {Array<string>} flagSetNames - An array of the flag set names we want to get the related feature flags and treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @param {EvaluationOptions=} options - An object of type EvaluationOptions to include in the evaluation. Must be a flat object.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfigByFlagSets(flagSetNames: string[], attributes?: SplitIO.Attributes, options?: SplitIO.EvaluationOptions): SplitIO.TreatmentsWithConfig;
  getTreatmentsWithConfigByFlagSets(param1: string[] | SplitIO.SplitKey, param2?: string[] | SplitIO.Attributes, param3?: SplitIO.Attributes, param4?: SplitIO.EvaluationOptions): SplitIO.TreatmentsWithConfig {
    const {key, flagSetNames, attributes, options} = parseFlagSetParams(param1, param2, param3, param4);
    return this.getClient(key).getTreatmentsWithConfigByFlagSets(flagSetNames, attributes, options);
  }

  /**
   * Tracks an event for a shared client to be fed to the results product on Split user interface and returns a promise to signal when the event was successfully queued (or not).
   * @function track
   * @param {SplitKey} key - The key that identifies the entity related to this event.
   * @param {string} trafficType - The traffic type of the entity related to this event.
   * @param {string} eventType - The event type corresponding to this event.
   * @param {number=} value - The value of this event.
   * @param {Properties=} properties - The properties of this event. Values can be string, number, boolean or null.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating if the event was added to the queue successfully or not.
   */
  track(key: SplitIO.SplitKey, trafficType: string, eventType: string, value?: number, properties?: SplitIO.Properties): boolean;
  /**
   * Tracks an event to be fed to the results product on Split user interface and returns a promise to signal when the event was successfully queued (or not).
   * @function track
   * @param {string} trafficType - The traffic type of the entity related to this event.
   * @param {string} eventType - The event type corresponding to this event.
   * @param {number=} value - The value of this event.
   * @param {Properties=} properties - The properties of this event. Values can be string, number, boolean or null.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating if the event was added to the queue successfully or not.
   */
  track(trafficType: string, eventType: string, value?: number, properties?: SplitIO.Properties): boolean;
  track(param1: string | SplitIO.SplitKey, param2: string, param3?: string | number, param4?: number | SplitIO.Properties, param5?: SplitIO.Properties): boolean {
    const {key, trafficType, eventType, value, properties} = parseTrackParams(param1, param2, param3, param4, param5);
    return this.getClient(key).track(trafficType, eventType, value, properties);
  }

  /**
   * Validates key and returns client if it is initialized for key or controlClient if it isn't
   */
  private getManager() {
    const client = this.getSDKClient();
    if (!client) {
      console.log('[ERROR] The SDK has not being initialized. Returning default response for method call.');
      return DEFAULT_MANAGER;
    }
    return this.splitManager;
  }

  /**
   * Get the array of feature flags data in SplitView format.
   * @function getSplits
   * @returns {SplitViews} The list of SplitIO.SplitView.
   */
  getSplits(): SplitIO.SplitViews {
    return this.getManager().splits();
  }

  /**
   * Get the data of a split in SplitView format.
   * @function getSplit
   * @param {string} featureFlagName The name of the feature flag we wan't to get info of.
   * @returns {SplitView} The SplitIO.SplitView of the given split.
   */
  getSplit(featureFlagName: string): SplitIO.SplitView | null {
    return this.getManager().split(featureFlagName);
  }

  /**
   * Get the array of feature flag names.
   * @function getSplitNames
   * @returns {SplitNames} The lists of feature flag names.
   */
  getSplitNames(): SplitIO.SplitNames {
    return this.getManager().names();
  }

  /**
   * Destroy all clients instances.
   * @function destroy
   * @returns {Observable<unknown>}
   */
  destroy(): Observable<void> {
    const mainInstanceKey = buildInstance(this.config.core.key);
    this.clientsMap.forEach((client, key) => {
      if (buildInstance(key) !== mainInstanceKey){
        client.destroy();
        this.clientsMap.delete(buildInstance(key));
      }
    });
    this.clientsMap.delete(mainInstanceKey);
    this.splitio = undefined;
    return from(this.splitClient.destroy());
  }

  /**
   * Private function to return as observable the event on parameter
   * @param {string} event
   * @param response
   * @returns Observable<any>
   */
  private toObservable(key: SplitIO.SplitKey, client: SplitIO.IBrowserClient, event: string, isOneTimeEvent = true): Observable<string> {
    const eventKey = buildInstance(key) + event;
    if (isOneTimeEvent) {
      return new Observable(subscriber => {
        const wasEventEmitted = this.emittedEvents.get(eventKey);
        if (wasEventEmitted) {
          Promise.resolve().then(() => subscriber.next(event));
        } else {
          client.once(event, () => {
            this.emittedEvents.set(eventKey, true);
            subscriber.next(event);
          });
        }
      });
    } else {
      return new Observable(subscriber => {
        client.on(event, () => {
          subscriber.next(event);
        });
      });
    }
  }

}
