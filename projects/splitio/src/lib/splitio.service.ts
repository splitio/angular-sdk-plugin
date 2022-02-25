import { Injectable } from '@angular/core';
import { SplitFactory } from "@splitsoftware/splitio"

@Injectable({
  providedIn: 'root'
})
export class SplitioService {

  /**
   * The local reference to the Split SDK.
   */
  splitio: SplitIO.ISDK;
  /**
   * The local reference to the Split SDK's Client.
   */
  splitClient: SplitIO.IClient;
  /**
   * The local reference to the Split SDK's Manager.
   */
  splitManager: SplitIO.IManager
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

}
