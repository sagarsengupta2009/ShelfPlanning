import { BehaviorSubject } from 'rxjs';

export interface IOnReady {
    readonly onReady: BehaviorSubject<boolean>;
    readonly isReady: boolean;
    notifySubscribers(): void;
}

// Usage guidelines:
//  1) Any service which, needs a BehaviorSubject to communicate
//     its property/data readiness can extend this class.
//  2) The extended class needs to call notifySubscribers()
//     method once the data/properties available
export class OnReady implements IOnReady {

    constructor() {
        this.onReadyBehaviorSubject = new BehaviorSubject<boolean>(false);
    }

    protected onReadyBehaviorSubject: BehaviorSubject<boolean>;

    // BehaviorSubject will notify the subscribers with the latest value.
    // it is capable of storing the latest value and notifying subscribers
    // even if at the time of .next() call the subscription was not present.
    // Whereas Observable doesn't keep track of current value
    public get onReady(): BehaviorSubject<boolean> {
        return this.onReadyBehaviorSubject;
    }

    /** Indicates whether the service is ready for use or not */
    public get isReady(): boolean {
        return this.onReady.value;
    }

    public notifySubscribers(): void {
        this.onReady.next(true);
    }
}
