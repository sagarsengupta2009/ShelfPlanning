import { Component, OnInit, Input, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { SharedService } from '../../services/common/shared/shared.service';

@Component({
  selector: 'srp-custom-tool-tip',
  templateUrl: './custom-tool-tip.component.html',
  styleUrls: ['./custom-tool-tip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomToolTipComponent implements OnInit {
  /**
   * This is simple text which is to be shown in the tooltip
   */
  @Input() text?: string;

  /**
   * This provides finer control on the content to be visible on the tooltip
   * This template will be injected in McToolTipRenderer directive in the consumer template
   * <ng-template #template>
   *  content.....
   * </ng-template>
   */
  @Input() contentTemplate?: TemplateRef<any>;

  @Input() detailContent?: { title: string, info: string };
  public anchor: Element;

  constructor() { }

  ngOnInit() {
  }
  public get animate(): any {
    return {
      duration: 1000,
      type: 'slide',
    };
  }
}
