import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy } from '@angular/core';
import { ITooltipAngularComp } from 'ag-grid-angular';
import { ITooltipParams } from 'ag-grid-enterprise';
import { LanguageService } from 'src/app/shared/services';

@Component({
  selector: 'lib-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss']
})
export class TooltipComponent implements ITooltipAngularComp, OnDestroy {

  private skeletonFormat: string;
  private skeletonHourFormat: string;

  public tooltipText: string = '';

  public observer: MutationObserver;
  // select the target node to observe
  private target = this.elRef.nativeElement;
  // configuration of the observer
  private observerConfig = { childList: true }

  constructor(private readonly elRef: ElementRef,
    private readonly languageService: LanguageService,
    private readonly datePipe: DatePipe
  ) {
    this.skeletonFormat = this.languageService.getDateFormat();
    this.skeletonHourFormat = " " + this.languageService.getTimeFormat();
  }

  public agInit(params: { color: string } & ITooltipParams): void {
    let hElement: HTMLElement = this.elRef.nativeElement;
    let cellSpanElement = hElement.parentElement.getElementsByClassName(`cell_${params.rowIndex}_${params?.column?.getInstanceId()}`);
    if (cellSpanElement.length > 0) {
      const cellSpanEle = cellSpanElement[0] as HTMLElement;
      //Adding 10 to compensate space taken up by ellipsis and cell padding/margin
      if ((cellSpanEle.offsetWidth + 10) >= cellSpanEle.parentElement.parentElement.offsetWidth) {

        let columnType = '';
        if (params?.node?.group) {
          columnType = params?.node?.rowGroupColumn?.getColDef()?.tooltipComponentParams?.columntype;
        } else {
          columnType = params?.colDef?.tooltipComponentParams?.columntype;
        }
        switch (columnType) {
          case 'datetime': {
            this.tooltipText = this.datePipe.transform(new Date(params.value), this.skeletonFormat + this.skeletonHourFormat);
            break;
          }
          case 'custom': {
            if (params?.data && params?.colDef?.tooltipComponentParams?.['template']) {
              try {
                let temp = eval(String(params.colDef.tooltipComponentParams['template']).replaceAll('dataItem', 'params.data'));
                this.tooltipText = temp;
              } catch (error) {
                this.tooltipText = params.colDef.tooltipComponentParams['template'] ? params.colDef.tooltipComponentParams['template'] : params.value;
              }
            }
            break;
          }
          default:
            this.tooltipText = params.value;
        }

        //Todo@Priyanka: Replace mutation observer if any other alternative to position tooltip is found

        /*Following check to create mutation observer only when needed,
         the value 150 represents the width set to this component(host) in scss file */
        if (cellSpanEle.offsetWidth > 150) {
          // create an observer instance
          this.observer = new MutationObserver((mutations: MutationRecord[]) => {
            if (mutations.some(mutation => mutation.type === 'childList'))
              this.updateToolTipPosition();
          });
          // pass in the target node, as well as the observer options
          this.observer.observe(this.target, this.observerConfig);
        }
      }
    } else if (params.colDef.headerTooltip) {
      this.tooltipText = params.colDef.headerTooltip;
    }
  }
  
  public updateToolTipPosition() {
    let parentWidth = this.elRef.nativeElement.offsetParent.clientWidth;
    let tooltipLeftPosition = this.elRef.nativeElement.offsetLeft;
    let tooltipTextWidth = this.elRef.nativeElement.children[0].offsetWidth;
    if ((parentWidth - tooltipLeftPosition) < tooltipTextWidth) {
      let newLeftPosition = parentWidth - tooltipTextWidth;
      if (newLeftPosition >= 0) {
        this.elRef.nativeElement.style.left = `${newLeftPosition}px`;
      } else {
        this.elRef.nativeElement.children[0].style.whiteSpace = 'normal';
      }
    }
  }

  ngOnDestroy(): void {
    // stop observing
    this.observer?.disconnect();
  }
}
