import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { LocalStorageService } from 'src/app/framework.module';
import { LocalStorageKeys } from 'src/app/shared/constants';
import { PanelSplitterViewType } from 'src/app/shared/models';

@Injectable({
  providedIn: 'root'
})
export class SplitterService {

  public splitterOrientationChangeEvent: BehaviorSubject<number> = new BehaviorSubject<number>(1);
  public spitterView: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public refreshSplitter = new Subject<boolean>();
  public splitterView: number;
  public splitterOrientation: number;
  private keys = LocalStorageKeys;

  constructor(private readonly localStorage: LocalStorageService) {
  }

  public getSplitterView(): PanelSplitterViewType {
    if (!this.splitterView) {
      this.splitterView = this.localStorage.getNumber(this.keys.SPLITTER_VIEW);
    }
    return this.splitterView;
  }

  public setSplitterView(data: number): void {
    this.splitterView = data;
    this.localStorage.setNumber(this.keys.SPLITTER_VIEW, data);
  }

  public changeSplitterOrientation(text?: number): void {
    if (text || text === 0) {
      if (text !== 4) {
        this.setSplitterView(text);
      }
      this.splitterOrientationChangeEvent.next(text);
      this.splitterOrientation = text;
    } else {
      this.splitterOrientationChangeEvent.next(Number(this.getSplitterView()));
    }
  }
}
