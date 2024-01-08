import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

declare const window: any;
@Injectable({
  providedIn: 'root'
})
export class OnlineOfflineService {
  private internalConnectionChanged = new Subject<boolean>();
  private onlineStatus: boolean = !!window.navigator.onLine;

  get connectionChanged() {
    return this.internalConnectionChanged.asObservable();
  }

  get isOnline() {
    return this.onlineStatus;
  }

  constructor() {
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  public updateOnlineStatus(isOnline: boolean) {
    this.onlineStatus = isOnline;
    this.internalConnectionChanged.next(isOnline);
  }
}
