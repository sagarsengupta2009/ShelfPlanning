import { ElementRef, Injectable, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

@Injectable()
export abstract class PogComponent {

  protected dataContainer: ElementRef;
  protected subscriptions: Subscription = new Subscription();

  private lastSvg: string = '';

  protected updateSvg(value: string) {
    if (this.dataContainer) {
      if (this.lastSvg != value) {
        this.dataContainer.nativeElement.innerHTML = value;
        this.lastSvg = value;
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
