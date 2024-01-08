import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { SelectableList } from '../shared/shared.service';

@Injectable({
    providedIn: 'root',
})
export class ContextMenuService {
    public rightClick = new Subject<{ event: MouseEvent; data: SelectableList }>();
    public closeContextMenu = new Subject<void>();
    public contextMenuOpened: boolean = false;

    constructor() {}

    public removeContextMenu(): void {
        this.contextMenuOpened = false;
        this.closeContextMenu.next();
    }

    public addContextMenu(): void {
      this.contextMenuOpened = true;
  }
}
