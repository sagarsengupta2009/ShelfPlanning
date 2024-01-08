import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectorRef, ElementRef, ViewEncapsulation, Input } from '@angular/core';
import { skip } from 'rxjs/operators';
import { Router } from '@angular/router';
import { SharedService, PanelService, PlanogramStoreService, ParentApplicationService, ShoppingCartService, ClipBoardService } from 'src/app/shared/services';
import { PanelSplitterViewType } from '../../models';
import { SplitterService } from '../../services/layouts/space-automation/dashboard/splitter/splitter.service';
import { Subscription } from 'rxjs';
interface KendoSplitterConfig {
  orientation: string,
  rsize?: string,
  rmin?: string,
  lmin?: string,
  lsize?: string
}

@Component({
  selector: 'srp-kendo-splitter',
  templateUrl: './kendo-splitter.component.html',
  styleUrls: ['./kendo-splitter.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class KendoSplitterComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(`splitter`) splitter;
  @ViewChild('leftPaneElement') leftPaneElement;
  @ViewChild('rightPaneElement') rightPaneElement;
  @Input() skipCustomSplitter: boolean = false;
  @Input() splitterHeight: string = "calc(100vh - 91px)";
  @Input() applySplitter: boolean = true;
  public showFloatingShelves: boolean;
  public showClipBoard: boolean;
  public placing: number;
  public config: KendoSplitterConfig = {
    orientation: 'horizontal',
  };

  public elems: HTMLCollectionOf<Element>;
  public grid: NodeListOf<Element>;
  public leftPaneToggle: boolean = false;
  public rightPaneToggle: boolean = false;
  public leftPane: HTMLCollectionOf<Element>;
  public oldPlacing: number;
  public splitterView: number;
  private subscriptions: Subscription = new Subscription();
  public kPaneHeight: string = this.splitterHeight;
  private headerFooterHeight:number = 100;
  constructor(
    private readonly sharedService: SharedService,
    private readonly ref: ChangeDetectorRef,
    private readonly elRef: ElementRef,
    private readonly panelService: PanelService,
    private readonly splitterService: SplitterService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly parentApp: ParentApplicationService,
    public readonly  shoppingCartService: ShoppingCartService,
    public readonly clipBoardService: ClipBoardService,
  ) { }

  public ngOnInit(): void {
    this.splitterView = this.splitterService.getSplitterView();
    if(this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
      this.headerFooterHeight = 0;
    }
  }

  public ngAfterViewInit(): void {
    this.subscriptions.add(this.splitterService.splitterOrientationChangeEvent.pipe(skip(1)).subscribe(response => {
      this.changeOrientation(response);
    }));
    this.subscriptions.add(this.sharedService.showFloatingShelves.subscribe((result: boolean)=>{
      this.showFloatingShelves = result;
      this.kPaneHeight = result ? `calc(100vh - ${this.headerFooterHeight}px - 2px - ${this.shoppingCartService.floatingShelvesHeight}px)`: this.splitterHeight;
    }));
    this.subscriptions.add(this.sharedService.showUnLoadedCart.subscribe((result: boolean)=>{
      if(result){
        this.kPaneHeight = `calc(100vh - ${this.headerFooterHeight}px - 2px - ${this.shoppingCartService.unLoadedCartHeight}px)` ;
      }
      else{
        this.kPaneHeight = this.splitterHeight;
      }
    }));
    this.subscriptions.add(this.splitterService.refreshSplitter.subscribe(res => {
      if (res) {
        this.changeOrientation(this.placing);
      }
    }));
    this.subscriptions.add(this.sharedService.changeInGridHeight.subscribe((res: boolean)=>{
      if (res) {
        setTimeout(() => { //added delay to update height once the floatingshelve dialog resize from the bottom is done       
            this.changeOrientation(this.placing);        
        },10);  
      }
    }));
    if (this.splitterView != 4 && this.applySplitter) {
      this.changeOrientation(this.splitterView);
    } else if (this.applySplitter) {
      this.splitterService.setSplitterView(PanelSplitterViewType.Full)
      this.splitterView = PanelSplitterViewType.Full
      this.changeOrientation(PanelSplitterViewType.Full);
    }
    else {
      this.changeOrientation(PanelSplitterViewType.Full);
    }

    // delete default events and add custom events to the close and expand button.
    // TODO @karthik this may not be required in shelf app.
    if (!this.skipCustomSplitter) {
      const old = this.elRef.nativeElement.querySelector('div.k-collapse-prev.k-i-arrow-60-left.k-icon');
      const newNode = this.elRef.nativeElement.querySelector('div.k-collapse-prev.k-i-arrow-60-left.k-icon')?.cloneNode(true);
      const oldRight = this.elRef.nativeElement.querySelector('div.k-collapse-next.k-icon.k-i-arrow-60-right');
      const newRight = this.elRef.nativeElement.querySelector('div.k-collapse-next.k-icon.k-i-arrow-60-right')?.cloneNode(true);
      old?.parentElement?.replaceChild(newNode, old);
      oldRight?.parentElement?.replaceChild(newRight, oldRight);
      setTimeout((e) => {
        this.elRef?.nativeElement?.querySelector('div.k-collapse-prev.k-i-arrow-60-left.k-icon')?.addEventListener('click',
          this.leftPaneCollapased.bind(this));
        this.elRef?.nativeElement?.querySelector('div.k-collapse-next.k-icon.k-i-arrow-60-right')?.addEventListener('click',
          this.rightPaneCollapsed.bind(this));
      });
    }
  }

  private changeHeight(placing: number, percentage: string): void {
    if (this.skipCustomSplitter)
      return;
    this.elems = document.getElementsByClassName('sapp-panel-body');
    this.leftPane = document.getElementsByClassName('panel-body-woheader');
    this.grid = document.querySelectorAll('#bodyPanel .grid');
    const floatingShelfDialog = document.querySelectorAll('#shoppingcart-top-view');
    let floatingShelfDialogHeight = floatingShelfDialog.length ? floatingShelfDialog[0].clientHeight : 0;
    if (placing == 2) {
      if (this.elems.length && this.grid.length) {
        const lpane = document.getElementById('lpane');
        const rpane = document.getElementById('rpane');
        let totalHeight = document.getElementById('panelResize').clientHeight;
        const splitter = document.querySelector('kendo-splitter-bar');
        let splitterHeight = splitter ? splitter.clientHeight : 0;

        if (percentage == undefined) {
          percentage = (0.5 * totalHeight) + 'px';
        }

        const newHeight = Number(percentage.replace('px', ''));
        const panelOneHeader = document.getElementsByClassName('panel-panelOne');
        const panelTwoHeader = document.getElementsByClassName('panel-panelTwo');

        let panelTwoHeight = newHeight;
        if (panelTwoHeader.length) {
          panelTwoHeight = panelTwoHeight - panelTwoHeader[0].clientHeight;
        }

        let panelOneHeight = totalHeight - newHeight;
        if (panelOneHeader.length) {
          panelOneHeight = panelOneHeight - panelOneHeader[0].clientHeight;
        }

        if (this.elems.length) { // to handle scenario where pog is in unloaded state and view selected is store
          if (lpane.getElementsByClassName('sapp-panel-body')) {
            this.elems[0].setAttribute('style', `height: ${panelOneHeight}px`);
            const storeHeader = this.elems[0].getElementsByClassName('storeCntnr');
            if (storeHeader.length){
              this.elems[0].setAttribute('style', `height: ${panelOneHeight - splitterHeight}px`);
              panelOneHeight = panelOneHeight - storeHeader[0].clientHeight;
            }
            const performanceWSFooter = this.elems[0].querySelector('#performance-ws-footer'); 
            if(performanceWSFooter || floatingShelfDialogHeight)
              panelOneHeight = performanceWSFooter?panelOneHeight - performanceWSFooter?.clientHeight - floatingShelfDialogHeight : panelOneHeight;
          } else if (this.elems.length == 1) {
            this.elems[0].setAttribute('style', `height: ${panelTwoHeight}px`);
            const storeHeader = this.elems[0].getElementsByClassName('storeCntnr');
            if (storeHeader.length)
              panelTwoHeight = panelTwoHeight - storeHeader[0].clientHeight;
            const performanceWSFooter = this.elems[0].querySelector('#performance-ws-footer');
            if (performanceWSFooter || floatingShelfDialogHeight)
              panelTwoHeight = performanceWSFooter? panelTwoHeight - performanceWSFooter?.clientHeight - floatingShelfDialogHeight: panelTwoHeight - floatingShelfDialogHeight;
          }

          if (this.elems.length > 1) {
            this.elems[1].setAttribute('style', `height: ${panelTwoHeight}px`);
            const panelTwoStoreHeader = this.elems[1].getElementsByClassName('storeCntnr');
            if (panelTwoStoreHeader.length)
              panelTwoHeight = panelTwoHeight - panelTwoStoreHeader[0].clientHeight;
            const performanceWSFooter = this.elems[1].querySelector('#performance-ws-footer');
            if (performanceWSFooter || floatingShelfDialogHeight)
              panelTwoHeight = performanceWSFooter? panelTwoHeight - performanceWSFooter?.clientHeight - floatingShelfDialogHeight : panelTwoHeight - floatingShelfDialogHeight;
          }
        }

        for (let index = 0; index < this.elems.length; index++) {
          if (this.leftPane.length) {
            this.leftPane[0].setAttribute('style', `height: ${totalHeight - this.elems[index].clientHeight - 72}px`);
          }
        }

        if (this.grid.length) {
          if (this.elems[0].querySelector('#bodyPanel .grid'))
            this.grid[0].setAttribute('style', `height: ${panelOneHeight - splitterHeight - 4}px`);
          else if (this.grid.length == 1)
            this.grid[0].setAttribute('style', `height: ${panelTwoHeight - splitterHeight}px`);

          if (this.grid.length > 1) {
            const hg = rpane.clientHeight;
            if (hg) {
              this.grid[1].setAttribute('style', `height: ${hg - 50}px`);
            } else {
              this.grid[1].setAttribute('style', `height: ${panelTwoHeight - splitterHeight}px`);
            }
          }
        }
      }
    } else {
      this.elems = document.getElementsByClassName('sapp-panel-body');
      this.leftPane = document.getElementsByClassName('panel-body-woheader');
      this.grid = document.querySelectorAll('#bodyPanel .grid');
      if (this.elems.length > 0 && this.grid.length > 0) {
        for (let index = 0; index < this.elems.length; index++) {
          this.elems[index].setAttribute('style', `height:calc(100vh - ${46 + this.headerFooterHeight}px)`);
          if (this.leftPane[0]) {
            this.leftPane[0].setAttribute('style', 'height:calc(100vh - 104px)');
          }
        }
        this.updateGridHeight();
      }
    }
  }
  private updateGridHeight(): void {
      if(this.placing === 2){
        return;
      }
    if (this.grid?.length) {
      const performanceWSFooter = document.querySelectorAll('#performance-ws-footer');
      const floatingShelfDialog = document.querySelectorAll('#shoppingcart-top-view');
      let floatingShelfDialogHeight = floatingShelfDialog.length ? floatingShelfDialog[0].clientHeight : 0;
      let performanceWSFooterHeight = performanceWSFooter.length ? performanceWSFooter[0].clientHeight : 0;
      this.grid[0].setAttribute('style', `height:calc(100vh - ${49 + this.headerFooterHeight + performanceWSFooterHeight + floatingShelfDialogHeight}px)`);
      document.getElementById(this.grid[0].getAttribute("id")).setAttribute('style', `height:calc(100vh - ${49 + this.headerFooterHeight + performanceWSFooterHeight + floatingShelfDialogHeight}px)`);   
      if (this.grid.length > 1) {
        const hg = document.getElementById('rpane').clientHeight;
        if (hg) {        
          this.grid[1].setAttribute('style', `height: ${hg - 50}px`);
        } else {         
          this.grid[1].setAttribute('style', `height:calc(100vh - ${149 + floatingShelfDialogHeight}px)`);
        }
      }
    }
  }
  private changeOrientation(response: number, interalChange?: boolean, leftOrRight?: number): void {
    // Added this condition to not apply this setting for store assignment screen
    const splitView = this.planogramStore.splitterViewMode.displayMode;
    if (response != 4 && this.applySplitter == true) {
      // Added this to not set/get in local storage if view is full screen
      if (response == 0) {
        this.placing = 0;
      }
      else {
        this.placing = Number(splitView);
      }
    } else {
      // override to not set/get from local but need to apply from shelf
      this.placing = (response == 4) ? 0 : response;
    }
    // HACK
    if (this.splitter) {
      if (this.placing == 2) {
        this.splitter.orientation = 'vertical';
      }
      if (response != 4) {
        this.splitter.panes._results[1].size = '50%';
        this.splitter.panes._results[0].size = '';
        this.splitter.panes._results[0].collapsed = false;
        this.splitter.panes._results[1].collapsed = false;
      }
    }
    let placing;

    switch (this.placing) {
      //full screen
      case 0:
        if (this.panelService.activePanelID === 'panelOne') {
          this.splitter.panes._results[1].size = '';
          this.splitter.panes._results[0].size = '100%';
          this.config.rsize = `0%`;
          this.config.lsize = `99%`;
        } else {
          this.splitter.panes._results[1].size = '100%';
          this.splitter.panes._results[0].size = '';
          this.config.rsize = `99%`;
          this.config.lsize = `0%`;
        }
        this.config.orientation = `horizontal`;
        if (response == 4 && interalChange != true) {
          this.config.rsize = `0%`;
          this.config.lsize = ``;
        } else {
          if (leftOrRight == 0) {
            this.config.lsize = `0%`;
            this.config.rsize = `100%`;
          }
          else if (leftOrRight == 1) {
            this.config.lsize = `99%`;
            this.config.rsize = `0%`;
          }
        }
        this.config.lmin = `0%`;
        this.config.rmin = `0%`;
        placing = 0;
        break;
      //over under
      case 1:

        this.config.orientation = `horizontal`;
        this.config.lsize = `50%`;
        this.config.lmin = `30%`;
        this.config.rsize = ``;
        this.config.rmin = `30%`;
        placing = 1;
        break;
      //side by side
      case 2:

        this.config.orientation = `vertical`;
        this.config.lsize = `50%`;
        this.config.lmin = `20%`;
        this.config.rsize = ``;
        this.config.rmin = `20%`;
        placing = 2;
        break;

      default:
        this.config.orientation = `horizontal`;
        this.config.lsize = `50%`;
        this.config.lmin = `30%`;
        this.config.rsize = ``;
        this.config.rmin = ``;
        break;
    }
    setTimeout((e) => {
      this.changeHeight(placing, undefined);
    });
    if (this.sharedService.isShelfLoaded) {
      this.ref.detectChanges();
    }
  }

  public onSizeRightChange(event: string): void {
    if (this.skipCustomSplitter)
      return;
    if (this.placing == 2) {
      const height = document.getElementById('panelResize').clientHeight;
      if (event.includes('%')) {
        event = event.replace('%', '');
        event = ((Number(event) / 100) * height).toString();
        this.changeHeight(this.placing, (Number(event)) + 'px');
      } else {
        event = event.replace('px', '');
        event = event;
        this.changeHeight(this.placing, (Number(event)) + 'px');
      }
    }
  }

  public collapsedChangeEvent(event: boolean): void {
    if (this.skipCustomSplitter)
      return;
    if (event) {
      if (this.placing == 2) {
        const height = document.getElementById('panelResize').clientHeight;
        this.changeHeight(this.placing, (height - 60) + 'px');
      }
      this.elRef.nativeElement.querySelector('div.k-collapse-next.k-icon.k-i-arrow-60-right').classList.add('custom-right-icon');
      this.elRef.nativeElement.querySelectorAll('div.k-collapse-prev.k-icon.k-i-arrow-60-left , div.k-resize-handle').forEach(e => e.style.display = 'none');
    }
    else {
      if (this.placing == 2) {
        this.changeHeight(this.placing, undefined);
      }
      this.elRef.nativeElement.querySelector('div.k-collapse-next.k-icon.k-i-arrow-60-right').classList.remove('custom-right-icon');
      this.elRef.nativeElement.querySelectorAll('div.k-collapse-prev.k-icon.k-i-arrow-60-left , div.k-resize-handle').forEach(e => e.style.display = '');
    }
  }

  public collapsedChangeLeftEvent(event: boolean): void {
    if (this.skipCustomSplitter)
      return;
    if (event) {
      if (this.placing == 2) {
        const height = document.getElementById('panelResize').clientHeight;
        this.changeHeight(this.placing, (height - 60) + 'px');
      }
      this.elRef.nativeElement.querySelector('div.k-collapse-prev.k-i-arrow-60-left.k-icon').classList.add('custom-left-icon');
      this.elRef.nativeElement.querySelectorAll('div.k-collapse-next.k-i-arrow-60-right.k-icon , div.k-resize-handle').forEach(e => e.style.display = 'none');
    } else {
      if (this.placing == 2) {
        this.changeHeight(this.placing, undefined);
      }
      this.elRef.nativeElement.querySelector('div.k-collapse-prev.k-i-arrow-60-left.k-icon').classList.remove('custom-left-icon');
      this.elRef.nativeElement.querySelectorAll('div.k-collapse-next.k-i-arrow-60-right.k-icon , div.k-resize-handle').forEach(e => e.style.display = '');
    }
  }

  private leftPaneCollapased(event: MouseEvent): void {
    if (this.skipCustomSplitter)
      return;
    event.stopPropagation();
    event.preventDefault();
    if (this.leftPaneToggle == false) {
      this.oldPlacing = this.placing;
      this.changeOrientation(PanelSplitterViewType.Full, true, 0);
      this.leftPaneToggle = true;
      this.collapsedChangeLeftEvent(true);
      this.splitterService.splitterOrientation = PanelSplitterViewType.Full;
    }
    else {
      this.changeOrientation(this.oldPlacing, true, 0);
      this.splitterService.splitterOrientation = this.oldPlacing;
      this.oldPlacing = this.placing;
      this.leftPaneToggle = false;
      this.collapsedChangeLeftEvent(false);
    }
    setTimeout((e) => {
      this.leftPaneElement.detectChanges();
    });
  }

  private rightPaneCollapsed(event: MouseEvent): void {
    if (this.skipCustomSplitter)
      return;
    event.stopPropagation();
    event.preventDefault();
    if (this.rightPaneToggle == false) {
      this.oldPlacing = this.placing;
      this.changeOrientation(PanelSplitterViewType.Full, true, 1);
      this.rightPaneToggle = true;
      this.splitterService.splitterOrientation = 0;
      this.collapsedChangeEvent(true);
    }
    else {
      this.changeOrientation(this.oldPlacing, true, 1);
      this.splitterService.splitterOrientation = this.oldPlacing;
      this.oldPlacing = this.placing;
      this.rightPaneToggle = false;

      this.collapsedChangeEvent(false);
    }
    setTimeout((e) => {
      this.rightPaneElement.detectChanges();
    });
  }
  
  public updateStyleSC() {
    if (this.showFloatingShelves) {
      return {
        'top': 'calc(' + this.shoppingCartService.floatingShelvesHeight + 'px)',
        'bottom': this.showClipBoard ? 'calc(' + this.clipBoardService.clipBoardHeight + 'px)' : '0px'
      }
    }
    else if (this.splitterService.splitterOrientation === PanelSplitterViewType.Full && document.getElementsByClassName('shoppingcart-Unloaded-topview').length > 0) { //add appsettings
      return {
        'top': 'calc(' + this.shoppingCartService.unLoadedCartHeight + 'px)',
        'bottom': this.showClipBoard ? 'calc(' + this.clipBoardService.clipBoardHeight + 'px)' : '0px'
      }
    } 
    else if (this.splitterService.splitterOrientation !== PanelSplitterViewType.Full && document.getElementsByClassName('shoppingcart-Unloaded-topview').length > 0) { //add appsettings
      if (this.panelService.panelPointer['panelOne'].isLoaded || this.panelService.panelPointer['panelTwo'].isLoaded) {
        return {
          'top': '0px',
          'bottom': this.showClipBoard ? 'calc(' + this.clipBoardService.clipBoardHeight + 'px)' : '0px'
        }
      }
      else {
        return {
          'top': 'calc(' + this.shoppingCartService.unLoadedCartHeight + 'px)',
          'bottom': this.showClipBoard ? 'calc(' + this.clipBoardService.clipBoardHeight + 'px)' : '0px'
        }
      }
    }
    else {
      return {
        'top': '0px',
        'bottom': this.showClipBoard ? 'calc(' + this.clipBoardService.clipBoardHeight + 'px)' : '0px'
      }
    }
  }

  public ngOnDestroy(): void {
    this.sharedService.initializeSplitter(false);
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
