import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'sp-custom-header-template',
  templateUrl: './custom-header-template.component.html',
  styleUrls: ['./custom-header-template.component.scss']
})
export class CustomHeaderTemplateComponent implements OnInit {

  @Input() column: any;
  @Input() showDetailedTooltip?: boolean;
  @Input() headerType?: string;
  @Input() selectAllState?: string;
  @Output() mouseLeave = new EventEmitter<any>();
  @Output() mouseEnter = new EventEmitter<any>();
  @Output() selectAllCheckbox = new EventEmitter<any>();

  constructor() { }

  ngOnInit(): void {
  }

  public onMouseLeave = () => {
    this.mouseLeave.emit();
  }
  public onMouseEnter = (event, column) => {
    this.mouseEnter.emit({ event: event, column: column });
  }
  public onSelectAllCheckBoxChange = (event) => {
    this.selectAllCheckbox.emit(event);
  }
}
