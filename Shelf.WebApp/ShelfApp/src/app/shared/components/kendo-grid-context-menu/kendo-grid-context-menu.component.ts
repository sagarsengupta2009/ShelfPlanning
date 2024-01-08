import { Component, ContentChild, EventEmitter, Input, Output, OnDestroy, Renderer2, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { GridComponent } from '@progress/kendo-angular-grid';

@Component({
  selector: 'srp-kendo-grid-context-menu',
  templateUrl: './kendo-grid-context-menu.component.html',
  styleUrls: ['./kendo-grid-context-menu.component.scss'],
})
export class KendoGridContextMenuComponent implements OnDestroy {
  @ContentChild(TemplateRef)
  public menuItemTemplate: TemplateRef<any>;
  public filter: { 'display': true };

  @Input()
  public menuItems: any[] = [];
  public filterMenu: any[] = [];

  @Output()
  public select: EventEmitter<any> = new EventEmitter<any>();
  @Output()
  public popUpOpen: EventEmitter<any> = new EventEmitter<any>();

  @Input() public set for(grid: GridComponent) {
    this.unsubscribe();
    if (grid) {
      this.cellClickSubscription = grid.cellClick.subscribe(this.onCellClick);
    }
  }

  public show: boolean;
  public dataItem: any;
  public offset: any;

  private cellClickSubscription: Subscription;
  private documentClickSubscription: any;

  constructor(private renderer: Renderer2) {
    this.onCellClick = this.onCellClick.bind(this);
    this.documentClickSubscription = this.renderer.listen(
      'document',
      'click',
      () => {
        this.show = false;
      }
    );
  }

  public ngOnDestroy(): void {
    this.unsubscribe();
    this.documentClickSubscription();
  }

  public menuItemSelected(item: any): void {
    this.select.emit({ item, dataItem: this.dataItem });
  }
  public popUpOpened(originalEvent): void {
    this.popUpOpen.emit(originalEvent);
  }
  private onCellClick({ dataItem, type, originalEvent }): void {
    if (type === 'contextmenu') {
      this.filterMenu = [];
      for (let i = 0; i < this.menuItems.length; i++) {
        if (this.menuItems[i].template && this.menuItems[i].template != '') {
          if (eval(this.menuItems[i].template)) {
            this.filterMenu.push(this.menuItems[i]);
          }
        }
        else {
          this.filterMenu.push(this.menuItems[i]);
        }
      }
      originalEvent.preventDefault();
      this.dataItem = dataItem;
      this.show = true;
      this.offset = { left: originalEvent.pageX, top: originalEvent.pageY };
    }
  }

  private unsubscribe(): void {
    if (this.cellClickSubscription) {
      this.cellClickSubscription.unsubscribe();
      this.cellClickSubscription = null;
    }
  }
}
