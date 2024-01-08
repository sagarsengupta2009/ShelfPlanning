import { AfterViewInit, Directive, ElementRef, Input, OnInit, OnDestroy, NgZone } from '@angular/core';
import { PlanogramService } from '../../services/common/planogram/planogram.service';
import { SharedService } from '../../services/common/shared/shared.service';
import * as d3 from 'd3';
import { MoveService, PanelService, Render2dService, ShoppingCartService,PogSideNavStateService, SplitterService } from '../../services';
import { fromEvent, Observable, Subscription } from 'rxjs';
import { PlanogramStoreService } from '../../services';
import { PanelSplitterViewType, Transform, ZoomType } from '../../models';

@Directive({
  selector: '[spPanZoom]'
})
export class PanZoom implements OnInit, AfterViewInit, OnDestroy {
  @Input() panelID: string;

  private zoomRange = [0.1, 10];
  public subscriptions: Subscription = new Subscription();
  private zoom: any; //@Sagar: we are assigning the zoom method from d3 to this memeber and then it keeps on expanding. Couldn't set a particular type to this member.
  private oldTransform: Transform;
  private parentEl: HTMLElement;

  constructor(private el: ElementRef,
    public planogramService: PlanogramService,
    private sharedServicess: SharedService,
    public panelService: PanelService,
    private planogramStore: PlanogramStoreService,
    private move: MoveService,
    private ngZone: NgZone,
    private shoppingCartService: ShoppingCartService,
    private readonly PogSideNavStateService: PogSideNavStateService,
    private readonly splitterView: SplitterService
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.sharedServicess.twoDPanning.subscribe((keyEvent: KeyboardEvent) => {
        //Added code for applying event in both the panel if same planogram is present in both the panel with Sync mode
        if (this.checkPanelView()) {
          this.onKeyDown(keyEvent);
        } else if (this.panelID === this.panelService.activePanelID) {
          this.onKeyDown(keyEvent);
        }
      })
    );

    this.subscriptions.add(
      this.sharedServicess.changeZoomView.subscribe((view: number) => {
        //Added this code for ctrl + R should work both the panel if same planogram is rendred on both the panel
        if (this.checkPanelView()) {
          this.applyZoomView(view);
        } else {
          if (this.panelID === this.panelService.activePanelID) {
            this.applyZoomView(view)
          }
        }
      })
    );
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.init();
      this.resetZoom()
    });
  }

  private checkPanelView(): boolean {
    const storedMode = this.planogramStore.splitterViewMode;
    return storedMode.displayMode !== 0
      && storedMode.syncMode
      && this.panelService.panelPointer.panelOne.view === 'panelView'
      && this.panelService.panelPointer.panelTwo.view === 'panelView';
  };

  private applyZoomView(view: number): void {
    switch (view) {
      case ZoomType.RESET_ZOOM:
        this.resetZoom();
        break;
      case ZoomType.CENTER_ZOOM:
        this.centerZoom();
        break;
      case ZoomType.FIT_TO_HIGHT_ZOOM:
        this.fitToHeightZoom();
        break;
    }
  };

  private init(): void {
    const element = this.el.nativeElement;
    this.parentEl = document.getElementById('planogram-holder_' + this.panelID);
    this.ngZone.runOutsideAngular(() => {
      this.zoom = d3.zoom()
        .scaleExtent(this.zoomRange)
        .on('zoom', () => {
          const eventType = d3.event.sourceEvent?.type;
          const shiftActive = d3.event.sourceEvent?.shiftKey;
          const ctrlActive = d3.event.sourceEvent?.ctrlKey;
          const t = d3.event.transform;
          if (eventType === 'mousemove' && !shiftActive || (ctrlActive && shiftActive)) {
            return;
          } else {
            this.oldTransform = t;
            const scaleFactor = parseFloat(t.k);
            this.move.scale = scaleFactor;
            const sectionID = this.panelService.panelPointer[this.panelID].sectionID;
            if (this.planogramService.rootFlags[sectionID]) {
              this.planogramService.rootFlags[sectionID].scaleFactor = scaleFactor;
              this.planogramService.rootFlags[sectionID].marchingAntResize('panelOne', sectionID, scaleFactor);
              this.planogramService.rootFlags[sectionID].marchingAntResize('panelTwo', sectionID, scaleFactor);
              this.sharedServicess.sectionStyleSub.next(true); //To change section style based on scalefactor
            }
            d3.select(element).style('transform', `translate(${t.x}px, ${t.y}px) scale(${t.k})`)
              .style('transition', 'none');
            this.shoppingCartService.checkForChangeInCart.next(true);////To change shopping cart style based on scalefactor
          }
        });
      d3.select(this.parentEl)
        .call(this.zoom)
        .on('dblclick.zoom', null)
    })
  }

  private resetZoom(): void {
    // tslint:disable: one-variable-per-declaration
    const panzoomContainer = this.el.nativeElement;
    let floatingShelfHeight=0;
    let view = this.splitterView.getSplitterView();
    if (panzoomContainer) {
      if (panzoomContainer.childElementCount > 0) {
        const parent = panzoomContainer.parentElement.parentElement.parentElement;
        const parentRect = parent.getBoundingClientRect();
        //tweaks to have some space in left
        //we reduce container width by 15px and offset increase by 7px
        parentRect.width -= 15;
        parentRect.x += 7;
        let fullWidth = parentRect.width, fullHeight = parentRect.height;
        if (this.PogSideNavStateService.shoppingCartView.pos === 'top' && !this.PogSideNavStateService.shoppingCartView.isPinned && view !== PanelSplitterViewType.OverUnder) {
          floatingShelfHeight = this.shoppingCartService.floatingShelvesHeight;
          fullHeight -= floatingShelfHeight;
        }
        const width = panzoomContainer.offsetWidth, height = panzoomContainer.offsetHeight;
        const scale = Math.min(fullWidth / width, fullHeight / height);
        const edgeScale = Number((scale - .025).toFixed(3))

        // we could now find the new size
        const newWidth = width * edgeScale;
        const newHeight = height * edgeScale;
        const translate = { x: (parentRect.width - newWidth) / 2, y: ((parentRect.height - newHeight) / 2) }
        this.setZoom({ x: translate.x, y: (translate.y - (floatingShelfHeight || 0) / 2), k: edgeScale });
      } else {
        setTimeout(() => this.resetZoom(), 200);
      }
    }
  }

  private centerZoom(): void {
    const panzoomContainer = this.el.nativeElement;
    if (panzoomContainer) {
      if (panzoomContainer.childElementCount > 0) {
        const parent = panzoomContainer.parentElement.parentElement.parentElement;
        const parentRect = parent.getBoundingClientRect();
        const fullWidth = parent.clientWidth, fullHeight = parent.clientHeight;
        const width = panzoomContainer.offsetWidth, height = panzoomContainer.offsetHeight;
        const scale = width > fullWidth ? Math.min((fullWidth * 0.75) / width, (fullHeight * 0.75) / height) : 0.6;
        const edgeScale = Number((scale - .005).toFixed(3))

        // we could now find the new size
        const newWidth = width * edgeScale;
        const newHeight = height * edgeScale;
        const translate = { x: ((parentRect.width - newWidth) / 2), y: ((parentRect.height - newHeight) / 2) };
        this.setZoom({ x: translate.x, y: translate.y, k: edgeScale });
        const sectionID = this.panelService.panelPointer[this.panelID].sectionID;
        this.planogramService.rootFlags[sectionID].scaleFactor = edgeScale;
      } else {
        setTimeout(() => this.resetZoom(), 200);
      }
    }
  }

  private fitToHeightZoom(): void {
    const panzoomContainer = this.el.nativeElement;
    if (panzoomContainer) {
      if (panzoomContainer.childElementCount > 0) {
        const parent = panzoomContainer.parentElement.parentElement.parentElement;
        const parentRect = parent.getBoundingClientRect();
        const fullHeight = parent.clientHeight;
        const width = panzoomContainer.offsetWidth, height = panzoomContainer.offsetHeight;
        const scale = Number((fullHeight / height * 0.95).toFixed(2));
        const edgeScale = Number((scale - .005))

        // we could now find the new size
        const newWidth = width * edgeScale;
        const newHeight = height * edgeScale;
        const translate = { x: ((parentRect.width - newWidth) / 2), y: ((parentRect.height - newHeight) / 2) };
        this.setZoom({ x: translate.x, y: translate.y, k: edgeScale });
        const sectionID = this.panelService.panelPointer[this.panelID].sectionID;
        this.planogramService.rootFlags[sectionID].scaleFactor = edgeScale;
      } else {
        setTimeout(() => this.resetZoom(), 200);
      }
    }
  }

  private setZoom(t: Transform): void {
    if (!this.zoom) { return; }
    d3.select(this.parentEl)
      .transition()
      .duration(50)
      .call(this.zoom.transform, d3.zoomIdentity.translate(t.x, t.y).scale(t.k));
  }

  private onKeyDown(e: KeyboardEvent): void {
    try {
      if (e) {
        let keyChar = e && (e.code || '');
        const t = this.oldTransform;
        const scaleToAddRemove = 0.1;
        switch (keyChar) {
          case 'KeyD': // left
            t.x -= 20;
            break;

          case 'KeyA': // right
            t.x += 20;
            break;

          case 'KeyS': // up
            t.y -= 20;
            break;

          case 'KeyW': // down
            t.y += 20;
            break;

          // +
          case 'Plus':
          case 'Equal':
          case 'NumpadAdd':
            if (t.k <= (this.zoomRange[1] - scaleToAddRemove)) {
              t.k += scaleToAddRemove;
              t.x = t.x - 90;
              t.y = t.y - 30;
            }
            break;

          // -
          case 'Minus':
          case 'NumpadSubtract':
            if (t.k >= (this.zoomRange[0] + scaleToAddRemove)) {
              t.k -= scaleToAddRemove;
              t.x = t.x + 90;
              t.y = t.y + 30;
            }
            break;

          default:
            break;
        }

        t.k = Math.max(this.zoomRange[0], Math.min(this.zoomRange[1], t.k));
        this.setZoom(t);
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
