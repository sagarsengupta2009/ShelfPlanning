import { Component, Input, OnInit } from '@angular/core';
import { Dimension } from '../../models';

/** Displays dimension in below format.
 *  Height x Width x Depth
 */
@Component({
  selector: 'shelf-dimension-display',
  templateUrl: './dimension-display.component.html',
  styleUrls: ['./dimension-display.component.scss']
})
export class DimensionDisplayComponent implements OnInit {

  @Input() dimension: Dimension;
  @Input() isMultiple: boolean = false;

  public canShowDimension: boolean = false;

  constructor() { }

  ngOnInit(): void {
    if (!this.isMultiple && this.dimension) {
      this.canShowDimension = true;
    }
  }

}
