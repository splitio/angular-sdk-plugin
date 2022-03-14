import { Injectable } from '@angular/core';
import { SplitFactory } from "@splitsoftware/splitio-browserjs/full";
import SplitIO, { IClient } from '@splitsoftware/splitio-browserjs/types/splitio';
import { Observable } from 'rxjs';

@Injectable()
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
   * Flag to determine if SDK is ready or not.
   */
  isSDKReady = false;

  manager: any;

  SDKReady$: Observable<string>;
  SDKReadyTimeOut$: Observable<string>;
  SDKReadyFromCache$: Observable<string>;
  SDKUpdate$: Observable<string>;

  settings: SplitIO.IBrowserSettings

  constructor() { }


  /**
   * This method initializes the SDK with the required Browser APIKEY
   * and the 'key' according to the Traffic type set (ex.: an user id).
   * @function init
   * @param {IBrowserSettings} settings Should be an object that complies with the SplitIO.IBrowserSettings.
   * @returns void
   */
  init(settings: SplitIO.IBrowserSettings): void {
    if (this.splitio) {
      console.error('there is another instance of the SDK');
      return
    }
    this.settings = settings;
    this.splitio = SplitFactory(settings);
    this.splitClient = this.splitio.client()
    this.sdkInitManager();
    this.setReady()
    this.splitManager = this.splitio.manager();
    this.sdkInitEventObservable();
  }

  /**
   * This method initializes the SDK with the required Browser APIKEY
   * and waits for the SDK to be ready
   * @function initWaitForReady
   * @param {IBrowserSettings} settings Should be an object that complies with the SplitIO.IBrowserSettings.
   * @returns Promise<void>
   */
  async initWaitForReady(settings: SplitIO.IBrowserSettings): Promise<SplitIO.IClient> {
    this.init(settings);
    return await this.setReady()
  }

  private setReady(): IClient {
    return this.splitClient.on(this.splitClient.Event.SDK_READY, () => {
      this.isSDKReady = true;
    });
  }

  /**
   * Returns a shared client of the SDK, associated with the given key
   * @function initForKey
   * @param {SplitKey} key The key for the new client instance.
   * @returns {IClient} The client instance.
   */
  async initForKey(key: SplitIO.SplitKey): Promise<SplitIO.IClient> {
    return this.splitio.client(key)
  }

  /**
   * Returns treatment methods for a shared client, associated with the given key
   * @function initForKeyWaitForReady
   * @param {SplitKey} key The key for the client instance.
   * @returns Treatment methods for shared client
   */
  get(key: SplitIO.SplitKey) {
    const client = this.splitio.client(key);
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
    this.SDKReady$ = this.toObservable(this.splitClient.Event.SDK_READY);
    this.SDKReadyTimeOut$ = this.toObservable(this.splitClient.Event.SDK_READY_TIMED_OUT);
    this.SDKReadyFromCache$ = this.toObservable(this.splitClient.Event.SDK_READY_FROM_CACHE);
    this.SDKUpdate$ = this.toObservable(this.splitClient.Event.SDK_UPDATE);
  }

  /**
   * initialize sdk Manager
   */
  private sdkInitManager(): void {
    const sdkClient = this.splitio.client();
    sdkClient.on(sdkClient.Event.SDK_READY, () => {
      const sdkManager = this.splitio.manager()
      this.manager = {
        split : sdkManager.split,
        splits : sdkManager.splits,
        names : sdkManager.names
      }
    })
  }

  /**
   * Private function to return as observable the event on parameter
   *
   * @param event
   * @returns Observable<string>
   */
  private toObservable(event: string): Observable<string> {
    let wasEventEmitted = false;
    return new Observable(subscriber => {
      if (wasEventEmitted) {
        subscriber.next(event);
      } else {
        this.splitClient.on(event, () => {
          wasEventEmitted = true;
          subscriber.next(event);
        });
      }
    });
  }

  /**
   * Returns a promise that will be resolved once the SDK has finished loading (SDK_READY event emitted) or rejected if the SDK has timedout (SDK_READY_TIMED_OUT event emitted).
   * As it's meant to provide similar flexibility to the event approach, given that the SDK might be eventually ready after a timeout event,
   * calling the ready method after the SDK had timed out will return a new promise that should eventually resolve if the SDK gets ready.
   *
   * @returns Promise<void>
   */
  ready(): Promise<void> {
    return this.splitClient.ready();
  }

  /**
   * Returns the SDK client
   *
   * @returns SplitIO.IClient
   */
  getSDKClient(): SplitIO.IClient{
    return this.splitClient;
  }

  /**
   * Returns the SDK factory
   *
   * @returns SplitIO.ISDK
   */
  getSDKFactory(): SplitIO.ISDK{
    return this.splitio;
  }

  /**
   * Returns the SDK factory
   *
   * @returns SplitIO.ISDK
   */
   getSDKManager(): SplitIO.IManager{
    return this.splitManager;
  }

  /**
   * Returns a Treatment value, which is the treatment string for the given feature.
   * @function getTreatment
   * @param {string} splitName - The string that represents the split we wan't to get the treatment.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatment} The treatment string.
   */
  getTreatment(splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.Treatment {
    return this.splitClient.getTreatment(splitName, attributes);
  }

  /**
   * Returns a TreatmentWithConfig value, which is an object with both treatment and config string for the given feature.
   * @function getTreatmentWithConfig
   * @param {string} splitName - The string that represents the split we wan't to get the treatment.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentWithConfig} The map containing the treatment and the configuration stringified JSON (or null if there was no config for that treatment).
   */
  getTreatmentWithConfig(splitName: string, attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentWithConfig {
    return this.splitClient.getTreatmentWithConfig(splitName, attributes);
  }

  /**
   * Returns a Treatments value, which is an object map with the treatments for the given features.
   * @function getTreatments
   * @param {Array<string>} splitNames - An array of the split names we wan't to get the treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {Treatments} The treatments object map.
   */
  getTreatments(splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.Treatments {
    return this.splitClient.getTreatments(splitNames, attributes);
  }

  /**
   * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
   * @function getTreatmentsWithConfig
   * @param {Array<string>} splitNames - An array of the split names we wan't to get the treatments.
   * @param {Attributes=} attributes - An object of type Attributes defining the attributes for the given key.
   * @returns {TreatmentsWithConfig} The map with all the TreatmentWithConfig objects
   */
  getTreatmentsWithConfig(splitNames: string[], attributes?: SplitIO.Attributes | undefined): SplitIO.TreatmentsWithConfig {
    return this.splitClient.getTreatmentsWithConfig(splitNames, attributes);
  }

}
