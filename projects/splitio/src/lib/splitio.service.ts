import { Injectable } from '@angular/core';
import { SplitFactory } from '@splitsoftware/splitio-browserjs/full';
import * as SplitIO from '@splitsoftware/splitio-browserjs/types/splitio';
import { from, Observable } from 'rxjs';
import { INIT_CLIENT_EXISTS, INIT_CLIENT_FIRST, VERSION } from './utils/constants';
import { CONTROL_CLIENT, DEFAULT_MANAGER, isString, toObservable} from './utils/utils';

@Injectable({
  providedIn: 'root'
})
export class SplitioService {

  /**
   * The local reference to the Split SDK.
   */
  private splitio: SplitIO.ISDK | undefined;
  /**
   * The local reference to the Split SDK's Client.
   */
  private splitClient: SplitIO.IClient;
  /**
   * The local reference to the Split SDK's Manager.
   */
  private splitManager: SplitIO.IManager;
  /**
   * Map of intialized clients
   */
  private clientsMap: Map<string, SplitIO.IClient> = new Map<string, SplitIO.IClient>();
  /**
   * Flag to determine if SDK is ready or not.
   */
  isSDKReady = false;
  /**
   * Factory config
   */
  private config: SplitIO.IBrowserSettings;
  /**
   * SDK events observables
   */
  sdkReady$: Observable<string>;
  sdkReadyTimedOut$: Observable<string>;
  sdkReadyFromCache$: Observable<string>;
  sdkUpdate$: Observable<string>;

  private buildInstance(key: SplitIO.SplitKey): string {
    // @ts-ignore
    if (!key.bucketingKey) return key;
    // @ts-ignore
    return `${key.matchingKey ? key.matchingKey : key}-${key.bucketingKey ? key.bucketingKey : key}-`;
  }

  /**
   * This method initializes the SDK with the required Browser APIKEY
   * and the 'key' according to the Traffic type set (ex.: an user id).
   * @function init
   * @param {IBrowserSettings} config Should be an object that complies with the SplitIO.IBrowserSettings.
   * @returns {Observable<string>} Returns when sdk is ready
   */
  init(config: SplitIO.IBrowserSettings): Observable<string> {
    if (this.splitio) {
      console.log('[ERROR] There is another instance of the SDK.');
      return new Observable(observer => observer.error(INIT_CLIENT_EXISTS));
    }
    this.config = config;
    // @ts-ignore. 2nd param is not part of type definitions. Used to overwrite the version of the SDK for correct tracking.
    this.splitio = SplitFactory(config, (modules) => {
      modules.settings.version = VERSION;
    });
    this.splitClient = this.splitio.client();
    this.splitManager = this.splitio.manager();
    this.sdkInitEventObservable();
    this.splitClient.on(this.splitClient.Event.SDK_READY, () => {
      this.isSDKReady = true;
    });
    this.clientsMap.set(this.buildInstance(this.config.core.key), this.splitClient);
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
      console.log('[ERROR] client for key ' + this.buildInstance(key) + ' is already initialized.');
      return new Observable(observer => observer.error(INIT_CLIENT_EXISTS));
    }
    if (!this.splitio) return new Observable(observer => observer.error(INIT_CLIENT_FIRST));
    client = this.splitio.client(key);
    this.clientsMap.set(this.buildInstance(key), client);
    return toObservable(client, client.Event.SDK_READY);
  }

  private getClientObservable(key: SplitIO.SplitKey, event: string, isOneTimeEvent = true): Observable<string> {
    const client = this.getClient(key);
    if (client === CONTROL_CLIENT) {
      return new Observable(observer => observer.error(INIT_CLIENT_FIRST));
    }
    return toObservable(client, client.Event[event], isOneTimeEvent);
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
    this.sdkReady$ = toObservable(client, client.Event.SDK_READY);
    this.sdkReadyTimedOut$ = toObservable(client, client.Event.SDK_READY_TIMED_OUT);
    this.sdkReadyFromCache$ = toObservable(client, client.Event.SDK_READY_FROM_CACHE);
    this.sdkUpdate$ = toObservable(client, client.Event.SDK_UPDATE, false);
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
   * @returns {IClient} split client.
   */
  getSDKClient(key?: SplitIO.SplitKey): SplitIO.IClient | undefined {
    if (!this.isInitialized()) return undefined;
    key = key ? key : this.config.core.key;
    return this.clientsMap.get(this.buildInstance(key));
  }

  /**
   * Returns the SDK factory
   * @returns {ISDK} split factory
   */
  getSDKFactory(): SplitIO.ISDK | undefined {
    if (!this.isInitialized()) return undefined;
    return this.splitio;
  }

  /**
   * Validates key and returns client if it is initialized for key or controlClient if it isn't
   */
  private getClient(key?: SplitIO.SplitKey | undefined): any {
    const client = this.getSDKClient(key);
    if (!client) {
      console.log('[ERROR] client' + ( key ? ' for key ' + this.buildInstance(key) : '') + ' should be initialized first.');
      return CONTROL_CLIENT;
    }
    return client;
  }

  private parseTreatmentParams(param1: string | string[] | SplitIO.SplitKey, param2?: string | string[] | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): any {
    if (isString(param2) || Array.isArray(param2)) return { key: param1, splitNames: param2, attributes: param3};
    return { key: undefined, splitNames: param1, attributes: param2 };
  }

  /**
   * Returns a Treatment value, which is the treatment string for the given feature.
   * @function getTreatment
   * @param {SplitKey} key - The key for the client instance.
   * @param {string} splitName - The string that represents the split we want to get the treatment.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatment} - The treatment string.
   */
  getTreatment(key: SplitIO.SplitKey, splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.Treatment;
  /**
   * Returns a Treatment value, which is the treatment string for the given feature.
   * @function getTreatment
   * @param {string} splitName - The string that represents the split we want to get the treatment.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatment} - The treatment string.
   */
  getTreatment(splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.Treatment;
  getTreatment(param1: string | SplitIO.SplitKey, param2?: string | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): SplitIO.Treatment {
    const {key, splitNames, attributes} = this.parseTreatmentParams(param1, param2, param3);
    return this.getClient(key).getTreatment(splitNames, attributes);
  }

  /**
   * Returns a TreatmentWithConfig value, which is an object with both treatment and config string for the given feature.
   * @function getTreatmentWithConfig
   * @param {SplitKey} key - The key for the client instance.
   * @param {string} splitName - The string that represents the split we want to get the treatment.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentWithConfig} - The map containing the treatment and the configuration stringified JSON (or null if there was no config for that treatment).
   */
  getTreatmentWithConfig(key: SplitIO.SplitKey, splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentWithConfig;
  /**
   * Returns a TreatmentWithConfig value, which is an object with both treatment and config string for the given feature.
   * @function getTreatmentWithConfig
   * @param {string} splitName - The string that represents the split we want to get the treatment.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentWithConfig} - The map containing the treatment and the configuration stringified JSON (or null if there was no config for that treatment).
   */
  getTreatmentWithConfig(splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentWithConfig;
  getTreatmentWithConfig(param1: string | SplitIO.SplitKey, param2?: string | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): SplitIO.TreatmentWithConfig {
    const {key, splitNames, attributes} = this.parseTreatmentParams(param1, param2, param3);
    return this.getClient(key).getTreatmentWithConfig(splitNames, attributes);
  }

  /**
   * Returns a Treatments value, which is an object map with the treatments for the given features.
   * @function getTreatments
   * @param {SplitKey} key - The key for the client instance.
   * @param {Array<string>} splitNames - An array of the split names we want to get the treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatments} - The treatments object map.
   */
  getTreatments(key: SplitIO.SplitKey, splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.Treatments;
  /**
   * Returns a Treatments value, which is an object map with the treatments for the given features.
   * @function getTreatments\
   * @param {Array<string>} splitNames - An array of the split names we want to get the treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatments} - The treatments object map.
   */
  getTreatments(splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.Treatments;
  getTreatments(param1: string[] | SplitIO.SplitKey, param2?: string[] | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): SplitIO.Treatments {
    const {key, splitNames, attributes} = this.parseTreatmentParams(param1, param2, param3);
    return this.getClient(key).getTreatments(splitNames, attributes);
  }

  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
   * @function getTreatmentsWithConfig
   * @param {SplitKey} key - The key for the client instance.
   * @param {Array<string>} splitNames - An array of the split names we want to get the treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfig(key: SplitIO.SplitKey, splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentsWithConfig;
  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
   * @function getTreatmentsWithConfig
   * @param {Array<string>} splitNames - An array of the split names we want to get the treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfig(splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentsWithConfig;
  getTreatmentsWithConfig(param1: string[] | SplitIO.SplitKey, param2?: string[] | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): SplitIO.TreatmentsWithConfig {
    const {key, splitNames, attributes} = this.parseTreatmentParams(param1, param2, param3);
    return this.getClient(key).getTreatmentsWithConfig(splitNames, attributes);
  }

  private parseTrackParams(param1: string | SplitIO.SplitKey, param2: string, param3: number | string | undefined, param4: number | SplitIO.Properties | undefined, param5: SplitIO.Properties | undefined) {
    if (isString(param3)) return { key: param1, trafficType: param2, eventType: param3, value: param4, properties: param5};
    return { key: undefined, trafficType: param1, eventType: param2, value: param3, properties: param4 };
  }

  /**
   * Tracks an event for a shared client to be fed to the results product on Split Webconsole and returns a promise to signal when the event was successfully queued (or not).
   * @function track
   * @param {SplitKey} key - The key that identifies the entity related to this event.
   * @param {string} trafficType - The traffic type of the entity related to this event.
   * @param {string} eventType - The event type corresponding to this event.
   * @param {number=} value - The value of this event.
   * @param {Properties=} properties - The properties of this event. Values can be string, number, boolean or null.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating if the event was added to the queue successfully or not.
   */
  track(key: SplitIO.SplitKey, trafficType: string, eventType: string, value?: number | undefined, properties?: SplitIO.Properties | undefined): boolean;
  /**
   * Tracks an event to be fed to the results product on Split Webconsole and returns a promise to signal when the event was successfully queued (or not).
   * @function track
   * @param {string} trafficType - The traffic type of the entity related to this event.
   * @param {string} eventType - The event type corresponding to this event.
   * @param {number=} value - The value of this event.
   * @param {Properties=} properties - The properties of this event. Values can be string, number, boolean or null.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating if the event was added to the queue successfully or not.
   */
  track(trafficType: string, eventType: string, value?: number | undefined, properties?: SplitIO.Properties | undefined): boolean;
  track(param1: string | SplitIO.SplitKey, param2: string, param3?: string | number | undefined, param4?: number | SplitIO.Properties | undefined, param5?: SplitIO.Properties | undefined): boolean {
    const {key, trafficType, eventType, value, properties} = this.parseTrackParams(param1, param2, param3, param4, param5);
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
   * Get the array of splits data in SplitView format.
   * @function getSplits
   * @returns {SplitViews} The list of SplitIO.SplitView.
   */
  getSplits(): SplitIO.SplitViews {
    return this.getManager().splits();
  }

  /**
   * Get the data of a split in SplitView format.
   * @function getSplit
   * @param {string} splitName The name of the split we wan't to get info of.
   * @returns {SplitView} The SplitIO.SplitView of the given split.
   */
  getSplit(splitName: string): SplitIO.SplitView | null {
    return this.getManager().split(splitName);
  }

  /**
   * Get the array of Split names.
   * @function getSplitNames
   * @returns {SplitNames} The lists of Split names.
   */
  getSplitNames(): SplitIO.SplitNames {
    return this.getManager().names();
  }

  /**
   * Destroy all clients instances.
   * @function destroy
   * @returns {Observable<unknown>}
   */
  destroy(): Observable<unknown> {
    const mainInstanceKey = this.buildInstance(this.config.core.key);
    this.clientsMap.forEach((client, key) => {
      if (this.buildInstance(key) !== mainInstanceKey){
        client.destroy();
        this.clientsMap.delete(this.buildInstance(key));
      }
    });
    this.clientsMap.delete(mainInstanceKey);
    this.splitio = undefined;
    return from(this.splitClient.destroy());
  }
}
