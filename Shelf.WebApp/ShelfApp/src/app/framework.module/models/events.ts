import { Subscription, Subject } from 'rxjs';

export interface IEvent<T> {

  /**
   * Method which will signal the subscribers.
   * param payload
   */
  publish(payload: T): void;

  /**
   * Registers the payload receiving function.
   * NOTE: Subscribing component should handle the subscription disposal on ngOnDestroy method.
   * @param callback: callback function
   */
  subscribe(callback: (payload: T) => void): Subscription;
}

export class Event<T> implements IEvent<T> {

  private subject = new Subject<T>();

  constructor() { }

  public publish(payload: T): void {
    // Notify subscribers.
    this.subject.next(payload);
  }

  public subscribe(callback: (payload: T) => void): Subscription {
    // Create a subscription with the passed callback
    const subscription = this.subject.asObservable().subscribe(callback);
    return subscription;
  }
}
