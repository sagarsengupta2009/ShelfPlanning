import { Overlay, OverlayPositionBuilder, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ComponentRef, Directive, ElementRef, HostListener, Input, NgZone, TemplateRef } from '@angular/core';
import { CustomToolTipComponent } from '../../components/custom-tool-tip/custom-tool-tip.component';
import { SharedService } from '../../services';

@Directive({
  selector: '[srpMenuToolTip]',
})
export class MenuToolTipDirective {

  @Input() showToolTip = true;
  @Input() detailContent: { title: string, info: string };
  @Input() contentTemplate: TemplateRef<any>;

  private _overlayRef: OverlayRef;

  constructor(
    private readonly _overlay: Overlay,
    private readonly _overlayPositionBuilder: OverlayPositionBuilder,
    private readonly _elementRef: ElementRef,
    private readonly _sharedService: SharedService,
    private readonly _zone: NgZone) { }

  /**
   * Init life cycle event handler
   */
  ngOnInit() {
    this._zone.runOutsideAngular(() => {
      if (!this.showToolTip) {
        return;
      }
      const positionStrategy = this._overlayPositionBuilder
        .flexibleConnectedTo(this._elementRef)
        .withPositions([{
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          //offsetY: this.getOffsetY()
        }]);
      if (this.detailContent && this.detailContent.info && this.detailContent.title !== this.detailContent.info) {
        this._overlayRef = this._overlay.create({ positionStrategy });
      }
    });
  }

  /**
   * This method will be called whenever mouse enters in the Host element
   * i.e. where this directive is applied
   * This method will show the tooltip by instantiating the McToolTipComponent and attaching to the overlay
   */
  @HostListener('mouseenter')
  show() {
    if (this._overlayRef && !this._overlayRef.hasAttached()) {
      const tooltipRef: ComponentRef<CustomToolTipComponent> = this._overlayRef.attach(new ComponentPortal(CustomToolTipComponent));
      this.showToolTip = false;
      if (this.detailContent && this.detailContent.info && this.detailContent.title !== this.detailContent.info && tooltipRef?.instance?.detailContent) {
        setTimeout(() => {
          tooltipRef.instance.detailContent = this.detailContent;
          this._sharedService.HideDefaultMenu(true);
          this.showToolTip = true;
        }, 2000);
      } else if (this.contentTemplate && tooltipRef?.instance?.contentTemplate) {
        setTimeout(() => {
          tooltipRef.instance.contentTemplate = this.contentTemplate;
          this._sharedService.HideDefaultMenu(true);
          this.showToolTip = true;
        }, 2000);
      } else {
        this.closeToolTip();
      }
    }
  }

  /**
   * This method will be called when mouse goes out of the host element
   * i.e. where this directive is applied
   * This method will close the tooltip by detaching the overlay from the view
   */
  @HostListener('mouseleave')
  hide() {
    this._sharedService.HideDefaultMenu(false);
    this.closeToolTip();
  }

  @HostListener('click')
  hideTooltip() {
    this._sharedService.HideDefaultMenu(false);
    this.closeToolTip();
  }
  //this.removeElementsByClass('ng-trigger-transformMenu')
  /**
   * Destroy lifecycle event handler
   * This method will make sure to close the tooltip
   * It will be needed in case when app is navigating to different page
   * and user is still seeing the tooltip; In that case we do not want to hang around the
   * tooltip after the page [on which tooltip visible] is destroyed
   */
  ngOnDestroy() {
    this.closeToolTip();
  }

  /**
   * This method will close the tooltip by detaching the component from the overlay
   */
  private closeToolTip() {
    if (this._overlayRef) {
      this._overlayRef.detach();
      //this._overlayRef.dispose();
    }
  }

  private getOffsetY() {
    if (this._elementRef.nativeElement.getBoundingClientRect().bottom > 500)
      return -400;
    if (this._elementRef.nativeElement.getBoundingClientRect().bottom > 400)
      return -300;
    if (this._elementRef.nativeElement.getBoundingClientRect().bottom > 300)
      return -200;
    return -10;
  }
}
