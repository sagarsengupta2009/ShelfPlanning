import { Component, ElementRef, OnDestroy } from "@angular/core";
import { ICellRendererParams, IHeaderParams } from 'ag-grid-community';
import { IHeaderAngularComp } from 'ag-grid-angular';

@Component({
  selector: 'shelf-checkbox-header',
  templateUrl: './checkbox-header.component.html',
  styleUrls: ['./checkbox-header.component.scss']
})
export class CheckboxHeaderComponent implements OnDestroy, IHeaderAngularComp {

  params: IHeaderParams;
  checkBoxId = 'checkbox-' + new Date().getTime();

  private _checkboxState = false;
  private rowSelectedListenerActive = true;
  public isAnyChecked: boolean = false;

  constructor(elementRef: ElementRef) { }

  agInit(params: IHeaderParams): void {
    this.params = params;
    this.params.api.addEventListener('rowSelected', this.rowSelectedEventCallback);

    /**
     * Triggered every time the paging state changes. Some of the most common scenarios for this event to be triggered are:
     * - The page size changes
     * - The current shown page is changed
     * - New data is loaded onto the grid (this includes sorting and filtering)
     */
    this.params.api.addEventListener('paginationChanged', this.paginationChangedEventCallback);
  }

  private rowSelectedEventCallback = (event) => {
    if (this.rowSelectedListenerActive) {
      this.resolveSelectAllCheckboxState();
    }
  };

  /**
   * When rows in grid change because of current page, page size, sorting or filtering deselect all rows currently selected.
   */
  private paginationChangedEventCallback = () => {
    this.params.api.deselectAll();
    if (this._checkboxState)
      this._checkboxState = false;
  };

  /**
   * If all rows on a page are selected then make 'select all' checkbox in header also checked, otherwise it needs to be unchecked.
   */
  private resolveSelectAllCheckboxState() {
    const nodesOnPageCount = this.params.api.getRenderedNodes().length;
    const selectedCount = this.params.api.getSelectedNodes().length;
    this._checkboxState = selectedCount === nodesOnPageCount ? true : false;
    this.isAnyChecked = selectedCount !== nodesOnPageCount ? selectedCount > 0 ? true : false : false;
  }

  private toggleSelectAll(newValue: boolean) {
    const nodesOnPage = this.params.api;

    // stop listening to row selected event while we are programatically selecting nodes
    this.rowSelectedListenerActive = false;

    nodesOnPage.forEachNode(node => {
      // Use api.selectNode() and api.deselectNode(); instead of node.selectThisNode(newValue) because the latter doesn't trigger 'selectionChanged' event on the grid
      if (newValue === true) {
        node.setSelected(true);
      } else {
        node.setSelected(false);
      }
    });

    if (newValue){
      this.isAnyChecked = false;
    }

    setTimeout(() => this.rowSelectedListenerActive = true);
  }

  get checkboxState(): boolean {
    return this._checkboxState;
  }

  set checkboxState(value: boolean) {
    this._checkboxState = value;
    this.toggleSelectAll(value);
  }

  toggleCheckbox() {
    this.checkboxState = !this.checkboxState;
  }

  ngOnDestroy() {
    this.params.api.removeEventListener('rowSelected', this.rowSelectedEventCallback);
    this.params.api.removeEventListener('paginationChanged', this.paginationChangedEventCallback);
  }
  public refresh(params: IHeaderParams): boolean {
    this.isAnyChecked = false;
    return true;
  }
}