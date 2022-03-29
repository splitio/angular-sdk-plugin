import { IClient } from "@splitsoftware/splitio-browserjs/types/splitio";
import { Observable } from "rxjs";
import { CONTROL } from "./constants";

/**
 * Private function to return as observable the event on parameter
 * @param {string} event
 * @param response
 * @returns Observable<any>
 */
export function toObservable(client: IClient, event: string): Observable<string> {
  let wasEventEmitted = false;
  return new Observable(subscriber => {
    if (wasEventEmitted) {
      subscriber.next(event);
    } else {
      client.on(event, () => {
        wasEventEmitted = true;
        subscriber.next(event);
      });
    }
  });
}

export function isString(val: any): val is string {
  return typeof val === 'string' || val instanceof String;
}

/**
 * client with methods that return default values
 */
export const CONTROL_CLIENT = {
  getTreatment: () => { return CONTROL },
  getTreatmentWithConfig: () => { return { treatment: CONTROL, config: null } },
  getTreatments: (splitNames: string[]) => {
    let result = {}
    splitNames.forEach((splitName) => {
      result = { ...result, [splitName]: CONTROL };
    })
    return result;
  },
  getTreatmentsWithConfig: (splitNames: string[]) => {
    let result = {}
    splitNames.forEach((splitName) => {
      result = { ...result, [splitName]: { treatment: CONTROL, config: null } };
    })
    return result;
  },
  on: () => {},
  track: () => {return false},
  Event: {
    SDK_READY: 'init::ready',
    SDK_READY_FROM_CACHE: 'init::cache-ready',
    SDK_READY_TIMED_OUT: 'init::timeout',
    SDK_UPDATE: 'state::update'
  }
}

/**
 *  with methods that return default values
 */
export const DEFAULT_MANAGER = {
  splits: () => { return [] },
  split: () => { return null },
  names: () => { return [] }
}
