import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { AssortRecADRI, SvgToolTip } from 'src/app/shared/models';
import { Subscription } from 'rxjs';
import { ShoppingCartService, SharedService, PlanogramService, ParentApplicationService, AllocateService, Render2dService, MoveService, PanelService, ColorService, PlanogramStoreService } from 'src/app/shared/services';
@Component({
    selector: 'sp-shopping-cart-unloaded-state',
    templateUrl: './shopping-cart-unloaded-state.html',
    styleUrls: ['./shopping-cart-unloaded-state.scss'],
})

export class ShoppingCartUnloadedStateComponent implements OnInit, OnDestroy {
    private subscription: Subscription = new Subscription();
    private initialSizeY = 0;
    private sideNavMenuWidth = 68;
    constructor(
        private readonly dialog: MatDialogRef<ShoppingCartUnloadedStateComponent>,
        private readonly shoppingCartService: ShoppingCartService,
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly planogramService: PlanogramService,
        private readonly allocateService: AllocateService,
        private readonly render2d: Render2dService,
        private readonly moveService: MoveService,
        private readonly panelService: PanelService,
        private readonly colorService: ColorService,
        private readonly planogramStore: PlanogramStoreService,
    ) { 
        this.render2d.onUpdate.subscribe(() => {
            if(this.moveService.mouseMoveEvent){
              this.updateDialogSize({activeScreen: 'USC',width: this.shoppingCartService.unLoadedCartwidth, height: this.initialSizeY }, true);
              this.moveService.mouseMoveEvent.preventDefault();
            }
          });
    }
    public filterText: string;
    public cartItems = [];
    public ToolTipData = [];
    public isallocate = this.parentApp.isAllocateApp;
    ngOnInit() {
        this.shoppingCartService.showShoppingCartUnloaded = true;
        this.shoppingCartService.hideUnLoadCart = true;
        this.filterText = '';
        if (this.filterText) {
            this.bindSearchEvent(this.filterText);
        }
        if (this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
            this.sideNavMenuWidth = 25;
        }
        else if (this.parentApp.isWebViewApp) {
            this.sideNavMenuWidth = 32;
        }
        this.bindUnLoadCart();
        this.registerEvents();
    }
    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public updateDialogSize(result: { activeScreen?: string, width?: number, height?: number }, cartResize: boolean = false): void {
        //Adjusting unloading shopping cart Dock to top.
        //Floatingwidth will be 3 or 2 (For Webview) if Property grid is unpinned and maximized window
        if (!cartResize) {
            if (this.shoppingCartService.unLoadedCartwidth > result.width)
                this.sideNavMenuWidth = (this.parentApp.isWebViewApp) ? (this.sideNavMenuWidth + 2) : (this.sideNavMenuWidth + 5);
            else if (this.shoppingCartService.unLoadedCartwidth < result.width && this.shoppingCartService.unLoadedCartwidth != (3 || 2))
                this.sideNavMenuWidth = (this.parentApp.isWebViewApp) ? (this.sideNavMenuWidth - 2) : (this.sideNavMenuWidth - 5);
        }
        this.shoppingCartService.unLoadedCartwidth = result.activeScreen ? result.width : this.parentApp.isWebViewApp ? 2 : 3;
        result.height && (this.shoppingCartService.unLoadedCartHeight = result.height);
        let isUnloadedCart = this.panelService.panelPointer['panelOne'].isLoaded || this.panelService.panelPointer['panelTwo'].isLoaded ? false : this.shoppingCartService.showShoppingCartUnloaded;
        this.sharedService.showUnLoadedCart.next(isUnloadedCart);
        this.sharedService.changeInGridHeight.next(true);
        this.dialog?.updateSize(`calc(100vw - ${this.shoppingCartService.unLoadedCartwidth}% - ${this.sideNavMenuWidth}px)`, this.shoppingCartService.unLoadedCartHeight + 'px');
    }

    private registerEvents(): void {
        this.subscription.add(
            this.shoppingCartService.updateUnLoadedCart.subscribe((respose: boolean) => {
                if (respose) {
                    this.bindUnLoadCart();
                }
            })
        );
    }

    private bindUnLoadCart() {
        this.cartItems = [];
        if(this.parentApp.isAllocateApp) {
          this.cartItems = this.allocateService.getShoppingCartItems();
        } else {
          let unLoadCartItems = Object.entries(this.shoppingCartService.cartObj).flat();
          for (let i = 0; i < unLoadCartItems.length; i++) {
              if (i % 2 !== 0) {
                  this.cartItems.push(unLoadCartItems[i]);
              }
          }
        }
    }

    public bindSearchEvent(searchtext: string): void {
        this.filterText = searchtext ? searchtext : '';
    }
    ;
    public stylePositionDiv(itemData: any, isDiv?: boolean): { height: string; width: string; 'background-color'?: string; border?: string; } {
        let scaleFactor = 0.272;
        let imgWidthRef = this.convertToPixel(itemData.Width) * scaleFactor;
        let imgHeightRef = this.convertToPixel(itemData.Height) * scaleFactor;
        const style = {
            height: imgHeightRef + 'px',
            width: imgWidthRef + 'px',
        };
        if (isDiv) {
            style['background-color'] = this.colorService.validateItemColor(itemData.Color);
            style['border'] = '1px solid #000';
        }
        style['position'] = "relative";
        return style;
    }

    public checkIfPositionHasImage(image: string): boolean {
        return Boolean(image);
    }

    private convertToPixel(v: string | number): number {
        let sizeReductionFactor = 4.32029;
        v = Number(v);
        if (this.sharedService.measurementUnit == 'IMPERIAL') {	//imperial
            return Number((v * (37.8 * 2.54) / (sizeReductionFactor)).toFixed(2));
        }
        if (this.sharedService.measurementUnit == 'METRIC') {  //metric
            return Number((v * 37.8 / (sizeReductionFactor)).toFixed(2));
        }
    };
    public stylePositionObject(itemData: any, isDiv?: boolean) {
        let scaleFactor = 0.272;
        let imgWidthRef =
            this.convertToPixel(itemData.Width) * scaleFactor;
        let imgHeightRef =
            this.convertToPixel(itemData.Height) * scaleFactor;
        let style = {
            transform: '',
            'transform-origin': '',
            height: '',
            width: '',
            display: '',
            'background-color': '',
            border: ''
        };

        style.height = imgHeightRef + 'px';
        style.width = imgWidthRef + 'px';
        style.display = 'block';
        if (isDiv) {
            style['background-color'] = itemData.getStringColor();
            style['border'] = '1px solid #000';
        }
        return style;
    }
    public checkShoppingCart(idPogObject: string): string {
        this.ToolTipData = this.getToolTipData(idPogObject);
        const image = (this.ToolTipData.find((x) => x.keyName === 'Image')?.value as string);
        this.ToolTipData = this.ToolTipData.filter((it) => it.keyName != 'Image');
        return image;
    }
    private getToolTipData(idPogObject: string): SvgToolTip[] {
        return this.planogramService.getUnLoadCartToolTipData(idPogObject, this.shoppingCartService.cartObj);
    }
    public closeDialog(): void {
        this.shoppingCartService.showShoppingCartUnloaded = false;
        this.shoppingCartService.hideUnLoadCart = false;
        this.sharedService.showUnLoadedCart.next(false);
        this.dialog.close();
    }

    public getAssortmentClass(recADRI: string): 
                                {cartiAssortAdd: boolean; 'cartiAssortDelete allowDelete'?: boolean; 
                                cartiAssortDelete?: boolean; cartiAssortRetain: boolean } {
        if (this.planogramStore.appSettings?.disableDeletedScItem) {
          return {
            cartiAssortAdd: recADRI === AssortRecADRI.Add,
            'cartiAssortDelete allowDelete': recADRI === AssortRecADRI.Delete,
            cartiAssortRetain: recADRI === AssortRecADRI.Retain,
          };
        } else {
          return {
            cartiAssortAdd: recADRI === AssortRecADRI.Add,
            cartiAssortDelete: recADRI === AssortRecADRI.Delete,
            cartiAssortRetain: recADRI === AssortRecADRI.Retain,
          };
       }
      }
}
