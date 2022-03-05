import { Injectable } from '@angular/core';
import { SplitFactory } from "@splitsoftware/splitio-browserjs/full";
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
  isSdkReady = false;

  SDKReady$: Observable<string>;
  SDKReadyTimeOut$: Observable<string>;
  SDKReadyFromCache$: Observable<string>;
  SDKUpdate$: Observable<string>;

  settings: SplitIO.IBrowserSettings

  constructor() { }


  /**
   * This method initializes the SDK with the required Browser APIKEY
   * and the 'key' according to the Traffic type set (ex.: an user id).
   *
   * @returns void
   */
  initSdk(settings: SplitIO.IBrowserSettings): void {
    this.settings = settings;
    this.splitio = SplitFactory(settings);
    this.splitClient = this.splitio.client();
    this.splitManager = this.splitio.manager();
    this.sdkInitEventObservable();
  }

  /**
   * This method initializes the SDK with the required Browser APIKEY
   * and waits for the SDK to be ready
   *
   * @returns Promise<void>
   */
  async initSDKReady(settings: SplitIO.IBrowserSettings): Promise<void> {
    this.initSdk(settings);
    await this.splitClient.ready().then(() => {
      this.isSdkReady = true;
    })
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
   * Private function to return as observable the event on parameter
   *
   * @param event
   * @returns Observable<string>
   */
  private toObservable(event: string): Observable<string> {
    return new Observable(subscriber => {
      this.splitClient.on(event, () => {
        subscriber.next(event);
      });
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
   * Returns a Treatment value, which is the treatment string for the given feature. For usage on NodeJS as we don't have only one key.
   *
   * @function — getTreatment
   *
   * @param key — The string key representing the consumer.
   *
   * @param splitName — The string that represents the split we wan't to get the treatment.
   *
   * @param attributes — An object of type Attributes defining the attributes for the given key.
   *
   * @returns — The treatment string.
   */
  getTreatment(splitName: string, attributes?: SplitIO.Attributes): SplitIO.Treatment {
    return this.splitClient.getTreatment(splitName, attributes);
  }

  /**
   * Returns a TreatmentWithConfig value, which is an object with both treatment and config string for the given feature.
   *
   * @function — getTreatmentWithConfig
   *
   * @param key — The string key representing the consumer.
   *
   * @param splitName — The string that represents the split we wan't to get the treatment.
   *
   * @param attributes — An object of type Attributes defining the attributes for the given key.
   *
   * @returns The TreatmentWithConfig, the object containing the treatment string and the configuration stringified JSON (or null if there was no config for that treatment).
   */
  getTreatmentWithConfig(splitName: string, attributes?: SplitIO.Attributes): SplitIO.TreatmentWithConfig {
    return this.splitClient.getTreatmentWithConfig(splitName, attributes);
  }

}
