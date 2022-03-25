import { Injectable } from '@angular/core';
import { SplitFactory } from "@splitsoftware/splitio-browserjs/full";
import SplitIO, { IClient } from '@splitsoftware/splitio-browserjs/types/splitio';
import { Observable } from 'rxjs';

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
   *
   */
  private clientsMap: Map<string, IClient> = new Map<string, IClient>();
  /**
   * Flag to determine if SDK is ready or not.
   */
  isSDKReady = false;
  /**
   * Factory settings
   */
  settings: SplitIO.IBrowserSettings
  /**
   * SDK events observables
   */
  sdkReady$: Observable<string>;
  sdkReadyTimeOut$: Observable<string>;
  sdkReadyFromCache$: Observable<string>;
  sdkUpdate$: Observable<string>;

  private INIT_CLIENT_EXISTS = 'init:clientExists';

  constructor() { }

  /**
   * This method initializes the SDK with the required Browser APIKEY
   * and the 'key' according to the Traffic type set (ex.: an user id).
   * @function init
   * @param {IBrowserSettings} settings Should be an object that complies with the SplitIO.IBrowserSettings.
   * @returns {Observable<string> | undefined}
   */
  init(settings: SplitIO.IBrowserSettings): Observable<string> {
    if (this.splitio) {
      console.log('[ERROR] There is another instance of the SDK.');
      return new Observable(observer => observer.error(this.INIT_CLIENT_EXISTS));
    }
    this.settings = settings;
    this.splitio = SplitFactory(settings);
    this.splitClient = this.splitio.client();
    this.splitManager = this.splitio.manager();
    this.sdkInitEventObservable();
    this.splitClient.on(this.splitClient.Event.SDK_READY, () => {
      this.isSDKReady = true;
    });
    this.clientsMap.set(this.settings.core.key, this.splitClient);
    return this.sdkReady$;
  }

  /**
   * Returns a shared client of the SDK, associated with the given key
   * @function initForKey
   * @param {SplitKey} key The key for the new client instance.
   * @returns {Observable<string> | undefined} The client instance.
   */
  initClient(key: SplitIO.SplitKey): Observable<string> {
    let client = this.clientsMap.get(key);
    if (client) {
      console.log('[ERROR] client for key '+key+' is already initialized.');
      return new Observable(observer => observer.error(this.INIT_CLIENT_EXISTS));
    }
    client = this.splitio.client(key);
    this.clientsMap.set(key, client);
    return this.toObservable(client, client.Event.SDK_READY, client.Event.SDK_READY);
  }

  /**
   * Returns treatment methods for a shared client, associated with the given key
   * @function get
   * @param {SplitKey} key The key for the client instance.
   * @returns Treatment methods for shared client
   */
  get(key: SplitIO.SplitKey) {
    const client = this.clientsMap.get(key);
    if (!client) {
      console.log('[ERROR] client for key '+key+' should be initialized first.');
      return undefined;
    }
    return {
      getTreatment(splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.Treatment {
        return client.getTreatment(splitName, attributes);
      },
      getTreatmentWithConfig(splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentWithConfig {
        return client.getTreatmentWithConfig(splitName, attributes);
      },
      getTreatments(splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.Treatments {
        return client.getTreatments(splitNames, attributes);
      },
      getTreatmentsWithConfig(splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentsWithConfig {
        return client.getTreatmentsWithConfig(splitNames, attributes);
      }
    }
  }

  /**
   * initialize sdk Events into observables
   */
  private sdkInitEventObservable(): void {
    const client = this.splitClient;
    this.sdkReady$ = this.toObservable(client, client.Event.SDK_READY, client.Event.SDK_READY);
    this.sdkReadyTimeOut$ = this.toObservable(client, client.Event.SDK_READY_TIMED_OUT, client.Event.SDK_READY_TIMED_OUT);
    this.sdkReadyFromCache$ = this.toObservable(client, client.Event.SDK_READY_FROM_CACHE, client.Event.SDK_READY_FROM_CACHE);
    this.sdkUpdate$ = this.toObservable(client, client.Event.SDK_UPDATE, client.Event.SDK_UPDATE);
  }

  /**
   * Private function to return as observable the event on parameter
   * @param {string} event
   * @param response
   * @returns Observable<any>
   */
  private toObservable(client: IClient, event: string, response: any): Observable<any> {
    let wasEventEmitted = false;
    return new Observable(subscriber => {
      if (wasEventEmitted) {
        subscriber.next(response);
      } else {
        client.on(event, () => {
          wasEventEmitted = true;
          subscriber.next(response);
        });
      }
    });
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
    key = key ? key : this.settings.core.key;
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
   * Returns a Treatment value, which is the treatment string for the given feature.
   * @function getTreatment
   * @param {string} splitName - The string that represents the split we wan't to get the treatment.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatment} The treatment string.
   */
  getTreatment(splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.Treatment {
    return this.splitClient.getTreatment(splitName, attributes);
  }

  /**
   * Returns a TreatmentWithConfig value, which is an object with both treatment and config string for the given feature.
   * @function getTreatmentWithConfig
   * @param {string} splitName - The string that represents the split we wan't to get the treatment.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentWithConfig} The map containing the treatment and the configuration stringified JSON (or null if there was no config for that treatment).
   */
  getTreatmentWithConfig(splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentWithConfig {
    return this.splitClient.getTreatmentWithConfig(splitName, attributes);
  }

  /**
   * Returns a Treatments value, which is an object map with the treatments for the given features.
   * @function getTreatments
   * @param {Array<string>} splitNames - An array of the split names we wan't to get the treatments.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatments} The treatments object map.
   */
  getTreatments(splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.Treatments {
    return this.splitClient.getTreatments(splitNames, attributes);
  }

  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
   * @function getTreatmentsWithConfig
   * @param {Array<string>} splitNames - An array of the split names we wan't to get the treatments.
   * @param {Attributes} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfig(splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentsWithConfig {
    return this.splitClient.getTreatmentsWithConfig(splitNames, attributes);
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