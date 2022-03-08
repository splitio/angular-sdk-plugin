import { Injectable } from '@angular/core';
import { SplitFactory } from "@splitsoftware/splitio";
import  SplitIO  from "@splitsoftware/splitio/types/splitio";

@Injectable()
export class SplitioService {

  /**
   * The local reference to the Split SDK.
   */
  private splitio: SplitIO.IBrowserSDK;
  /**
   * The local reference to the Split SDK's Client.
   */
  private splitClient: SplitIO.IBrowserClient;
  /**
   * The local reference to the Split SDK's Manager.
   */
  private splitManager: SplitIO.IManager
  /**
   * Flag to determine if SDK is ready or not.
   */
  isReady = false;


  constructor() {  }

  /**
   * This method initializes the SDK with the required Browser APIKEY
   * and the 'key' according to the Traffic type set (ex.: an user id).
   *
   * @returns void
   */
  initSdk(settings: SplitIO.IBrowserSettings): void {
    this.splitio = SplitFactory(settings);
    this.splitClient = this.splitio.client();
    this.splitManager = this.splitio.manager();

    // verify if sdk is initialized
    this.verifyReady();
  }

  /**
   * Function to check if the SDK is ready, subscribe to an Observable
   * and set the isReady flag according to the result.
   *
   * @returns void
   */
  private verifyReady(): void {

    this.splitClient.on(this.splitClient.Event.SDK_READY, () => {
      this.isReady = true;
      console.log('angular SDK plugin ready')
    })
  }

  /**
   * Returns a Treatment value, which is the treatment string for the given feature.
   *
   * @function — getTreatment
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
