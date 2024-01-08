import { Component, ElementRef, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { IDragDropData } from '../../models';
import { MoveService } from 'src/app/shared/services/move/move.service';
import { SharedService } from 'src/app/shared/services';

/** This component is supposed to be used only in the DndWrapperComponent */
@Component({
  selector: 'app-dnd-source-wrapper',
  templateUrl: './dnd-source-wrapper.component.html',
  styleUrls: ['./dnd-source-wrapper.component.scss']
})
export class DndSourceWrapperComponent implements OnInit, OnDestroy {

  @Input() public data: IDragDropData;

  constructor(
    private readonly el: ElementRef,
    private readonly ngZone: NgZone,
    private readonly move: MoveService,
    private readonly sharedService: SharedService,
  ) { }

  public ngOnInit() {
    this.ngZone.runOutsideAngular(()=>{
      this.el.nativeElement.addEventListener('mousedown',this.onMouseDown.bind(this));
    });
  }

  public ngOnDestroy() {
    this.ngZone.runOutsideAngular(()=>{
      this.el.nativeElement.removeEventListener('mousedown',this.onMouseDown.bind(this));
    });
  }

  private onMouseDown(ev: MouseEvent) {
    let target: HTMLElement = ev.target as HTMLElement;
    /*Added notProdLibGrid check and assigned true when origin is anything other than product library grid
     and in product library grid, set to true only to listen for product drag
     and not to other events like column reorder or mouse down in filter search area */
     if((this.sharedService.freeFlowOn.panelOne || this.sharedService.freeFlowOn.panelTwo) && ev.button == 0) {
      return;
     }
    let notProdLibGrid = this.data.$id === 'productlib_grid' ? (target.offsetParent.classList.contains('ag-cell-range-selected') || target.classList.contains('ag-cell-range-selected')) : true;
    if (ev.button !== 2 && !ev.shiftKey && notProdLibGrid || (ev.shiftKey && ev.ctrlKey)) {
      this.move.onMouseDown(this.data, ev);
      ev.stopImmediatePropagation();
      ev.stopPropagation();
      ev.preventDefault();
    }
  }


}
