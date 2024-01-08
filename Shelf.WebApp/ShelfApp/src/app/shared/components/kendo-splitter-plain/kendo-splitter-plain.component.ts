import { Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'srp-kendo-splitter-plain',
  templateUrl: './kendo-splitter-plain.component.html',
  styleUrls: ['./kendo-splitter-plain.component.scss']
})
export class KendoSplitterPlainComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
  ngAfterViewInit() {
    this.SetGridHeight();
  }
  public onSizeBottomChange(event) {
    if (document.getElementById('resizepogCompare')) {
      event = Number(event.replace('px', ''));
      const height = document.getElementById('resizepogCompare').clientHeight;
      event = (height - event) - 30;
      const grid = document.getElementsByClassName('pogCompareResize');
      grid[0].setAttribute('style', `height: ${event}px`);

      if (document.getElementsByClassName('k-grid-content-locked')) {
        const gridlocked = document.getElementsByClassName('k-grid-content-locked');
        if (gridlocked.length === 1) {
          gridlocked[0].setAttribute('style', `height: ${event}px`);
        }
        else {
          gridlocked[1].setAttribute('style', `height: ${event}px`);
        }
      }
    }
  }
  public SetGridHeight() {
    const heighttoppane = document.getElementById('toppanesplitter').clientHeight;
    if (document.getElementById('resizepogCompare') && document.getElementsByClassName('k-grid')) {
      const height = document.getElementById('resizepogCompare').clientHeight;
      const gridHeight = (height - heighttoppane) - 30;
      const grid = document.getElementsByClassName('pogCompareResize');
      const gridlocked = document.getElementsByClassName('k-grid-content-locked');
      if (grid.length > 0) {
        grid[0].setAttribute('style', `height: ${gridHeight}px`);
      }
      if (gridlocked.length > 0) {
        // tslint:disable-next-line: no-shadowed-variable
        const gridlocked = document.getElementsByClassName('k-grid-content-locked');
        gridlocked[0].setAttribute('style', `height: ${gridHeight}px`);
      }
    }
  }
}
