import { IClient } from "@splitsoftware/splitio-browserjs/types/splitio";
import { Observable } from "rxjs";
import { CONTROL } from "./constants";

/**
 * Private function to return as observable the event on parameter
 * @param {string} event
 * @param response
 * @returns Observable<any>
 */
 export function toObservable(client: IClient, event: string, isOneTimeEvent = true): Observable<string> {
  if (isOneTimeEvent) {
    let wasEventEmitted = false;
    return new Observable(subscriber => {
      if (wasEventEmitted) {
        subscriber.next(event);
      } else {
        client.once(event, () => {
          wasEventEmitted = true;
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
  }
}