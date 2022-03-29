import { Injectable } from '@angular/core';
import { SplitFactory } from "@splitsoftware/splitio-browserjs/full";
import SplitIO, { IClient } from '@splitsoftware/splitio-browserjs/types/splitio';
import { Observable } from 'rxjs';
import { INIT_CLIENT_EXISTS } from './utils/constants';
import { CONTROL_CLIENT, isString, toObservable} from './utils/utils';

@Injectable({
  providedIn: 'root'
})
export class SplitioService {

  /**
   * The local reference to the Split SDK.
   */
  private splitio: SplitIO.ISDK;
  /**
   * The local reference to the Split SDK's Client.
   */
  private splitClient: SplitIO.IClient;
  /**
   * The local reference to the Split SDK's Manager.
   */
  private splitManager: SplitIO.IManager
  /**
   * Map of intialized clients
   */
  private clientsMap: Map<string, IClient> = new Map<string, IClient>();
  /**
   * Flag to determine if SDK is ready or not.
   */
  isSDKReady = false;
  /**
   * Factory config
   */
  config: SplitIO.IBrowserSettings;
  /**
   * SDK events observables
   */
  sdkReady$: Observable<string>;
  sdkReadyTimeOut$: Observable<string>;
  sdkReadyFromCache$: Observable<string>;
  sdkUpdate$: Observable<string>;

  constructor() { }

  /**
   * This method initializes the SDK with the required Browser APIKEY
   * and the 'key' according to the Traffic type set (ex.: an user id).
   * @function init
   * @param {IBrowserSettings} config Should be an object that complies with the SplitIO.IBrowserSettings.
   * @returns {Observable<string>}
   */
  init(config: SplitIO.IBrowserSettings): Observable<string> {
    if (this.splitio) {
      console.log('[ERROR] There is another instance of the SDK.');
      return new Observable(observer => observer.error(INIT_CLIENT_EXISTS));
    }
    this.config = config;
    this.splitio = SplitFactory(config);
    this.splitClient = this.splitio.client();
    this.splitManager = this.splitio.manager();
    this.sdkInitEventObservable();
    this.splitClient.on(this.splitClient.Event.SDK_READY, () => {
      this.isSDKReady = true;
    });
    this.clientsMap.set(this.config.core.key, this.splitClient);
    return this.sdkReady$;
  }

  /**
   * Returns a shared client of the SDK, associated with the given key
   * @function initClient
   * @param {SplitKey} key The key for the new client instance.
   * @returns {Observable<string>} The client instance.
   */
  initClient(key: SplitIO.SplitKey): Observable<string> {
    let client = this.getSDKClient(key);
    if (client) {
      console.log('[ERROR] client for key '+key+' is already initialized.');
      return new Observable(observer => observer.error(INIT_CLIENT_EXISTS));
    }
    client = this.splitio.client(key);
    this.clientsMap.set(key, client);
    return toObservable(client, client.Event.SDK_READY, client.Event.SDK_READY);
  }

  /**
   * initialize sdk Events into observables
   */
  private sdkInitEventObservable(): void {
    const client = this.splitClient;
    this.sdkReady$ = toObservable(client, client.Event.SDK_READY, client.Event.SDK_READY);
    this.sdkReadyTimeOut$ = toObservable(client, client.Event.SDK_READY_TIMED_OUT, client.Event.SDK_READY_TIMED_OUT);
    this.sdkReadyFromCache$ = toObservable(client, client.Event.SDK_READY_FROM_CACHE, client.Event.SDK_READY_FROM_CACHE);
    this.sdkUpdate$ = toObservable(client, client.Event.SDK_UPDATE, client.Event.SDK_UPDATE);
  }

  /**
   * Returns a promise that will be resolved once the SDK has finished loading (SDK_READY event emitted) or rejected if the SDK has timedout (SDK_READY_TIMED_OUT event emitted).
   * As it's meant to provide similar flexibility to the event approach, given that the SDK might be eventually ready after a timeout event,
   * calling the ready method after the SDK had timed out will return a new promise that should eventually resolve if the SDK gets ready.
   * @returns Promise<void>
   */
  ready(): Promise<void> {
    return this.splitClient.ready();
  }

  /**
   * Returns the SDK client
   * @param {SplitKey} key The key for the client instance.
   * @returns {IClient} split client.
   */
  getSDKClient(key?: SplitIO.SplitKey): SplitIO.IClient | undefined {
    if (!this.isInitialized()) return undefined;
    key = key ? key : this.config.core.key;
    return this.clientsMap.get(key);
  }

  /**
   * Returns the SDK factory
   * @returns {ISDK} split factory
   */
  getSDKFactory(): SplitIO.ISDK {
    return this.splitio;
  }

  /**
   * Validates key and returns client if it is initialized for key or controlClient if it isn't
   * @param splitNames
   * @param attributes
   * @param key
   * @returns
   */
  private getClient(key?: SplitIO.SplitKey | undefined): any {
    const client = this.getSDKClient(key);
    if (!client) {
      console.log('[ERROR] client for key ' + key + ' should be initialized first.');
      return CONTROL_CLIENT;
    }
    return client
  }

  private parseParams(param1: string | string[] | SplitIO.SplitKey, param2?: string | string[] | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): any{
    if (isString(param2) || Array.isArray(param2)) return { key: param1, splitNames: param2, attributes: param3};
    return { key: this.config.core.key, splitNames: param1, attributes: param2 };
  }

  private isInitialized(): boolean {
    if (!this.config) {
      console.log('[ERROR] plugin should be initialized');
      return false;
    }
    return true;
  }

  /**
   * Returns a Treatment value, which is the treatment string for the given feature.
   * @function getTreatment
   * @param {SplitKey} key - The key for the client instance.
   * @param {string} splitName - The string that represents the split we want to get the treatment.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatment} - The treatment string.
   */
  getTreatment(key: SplitIO.SplitKey, splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.Treatment
  /**
   * Returns a Treatment value, which is the treatment string for the given feature.
   * @function getTreatment
   * @param {string} splitName - The string that represents the split we want to get the treatment.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatment} - The treatment string.
   */
  getTreatment(splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.Treatment
  getTreatment(param1: string | SplitIO.SplitKey, param2?: string | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): SplitIO.Treatment {
    const {key, splitNames, attributes} = this.parseParams(param1, param2, param3);
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
  getTreatmentWithConfig(key: SplitIO.SplitKey, splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentWithConfig
  /**
   * Returns a TreatmentWithConfig value, which is an object with both treatment and config string for the given feature.
   * @function getTreatmentWithConfig
   * @param {string} splitName - The string that represents the split we want to get the treatment.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentWithConfig} - The map containing the treatment and the configuration stringified JSON (or null if there was no config for that treatment).
   */
  getTreatmentWithConfig(splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentWithConfig
  getTreatmentWithConfig(param1: string | SplitIO.SplitKey, param2?: string | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): SplitIO.TreatmentWithConfig {
    const {key, splitNames, attributes} = this.parseParams(param1, param2, param3);
    return this.getClient(key).getTreatmentWithConfig(splitNames, attributes);
  }

  /**
   * Returns a Treatments value, which is an object map with the treatments for the given features.
   * @function getTreatments
   * @param {SplitKey} key - The key for the client instance.
   * @param {Array<string>} splitNames - An array of the split names we want to get the treatments.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatments} - The treatments object map.
   */
  getTreatments(key: SplitIO.SplitKey, splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.Treatments
  /**
   * Returns a Treatments value, which is an object map with the treatments for the given features.
   * @function getTreatments\
   * @param {Array<string>} splitNames - An array of the split names we want to get the treatments.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatments} - The treatments object map.
   */
  getTreatments(splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.Treatments
  getTreatments(param1: string[] | SplitIO.SplitKey, param2?: string[] | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): SplitIO.Treatments {
    const {key, splitNames, attributes} = this.parseParams(param1, param2, param3);
    return this.getClient(key).getTreatments(splitNames, attributes);
  }

  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
   * @function getTreatmentsWithConfig
   * @param {SplitKey} key - The key for the client instance.
   * @param {Array<string>} splitNames - An array of the split names we want to get the treatments.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfig(key: SplitIO.SplitKey, splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentsWithConfig
  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
   * @function getTreatmentsWithConfig
   * @param {Array<string>} splitNames - An array of the split names we want to get the treatments.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfig(splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentsWithConfig
  getTreatmentsWithConfig(param1: string[] | SplitIO.SplitKey, param2?: string[] | SplitIO.Attributes | undefined, param3?: SplitIO.Attributes | undefined): SplitIO.TreatmentsWithConfig {
    const {key, splitNames, attributes} = this.parseParams(param1, param2, param3);
    return this.getClient(key).getTreatmentsWithConfig(splitNames, attributes);
  }

  /**
   * Get the array of splits data in SplitView format.
   * @function getSplits
   * @returns {SplitViews} The list of SplitIO.SplitView.
   */
  getSplits(): SplitIO.SplitViews {
    if (!this.splitManager) {
      console.log('[ERROR] The SDK has not being initialized. Returning default response for `getSplits` method call.');
      return [];
    }
    return this.splitManager.splits();
  }

  /**
   * Get the data of a split in SplitView format.
   * @function getSplit
   * @param {string} splitName The name of the split we wan't to get info of.
   * @returns {SplitView} The SplitIO.SplitView of the given split.
   */
  getSplit(splitName: string): SplitIO.SplitView | null {
    if (!this.splitManager) {
      console.log('[ERROR] The SDK has not being initialized. Returning default response for `getSplits` method call.');
      return null;
    }
    return this.splitManager.split(splitName);
  }

  /**
   * Get the array of Split names.
   * @function getSplitNames
   * @returns {SplitNames} The lists of Split names.
   */
  getSplitNames(): SplitIO.SplitNames {
    if (!this.splitManager) {
      console.log('[ERROR] The SDK has not being initialized. Returning default response for `getSplitNames` method call.');
      return [];
    }
    return this.splitManager.names();
  }
}
