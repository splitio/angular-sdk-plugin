import { IClient } from "@splitsoftware/splitio-browserjs/types/splitio";
import { Observable } from "rxjs";

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
