import { AfterViewInit, Component, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { cloneDeep } from 'lodash';
import { Subscription } from 'rxjs';
import { Position, Section } from 'src/app/shared/classes';
import { Context } from 'src/app/shared/classes/context';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { DragDropEventsService, DragOrigins, IDragDrop } from 'src/app/shared/drag-drop.module';
import { ClipBoardItem, DialogSearch, ProductListItem } from 'src/app/shared/models';
import {
    ClipBoardService,
    HistoryService,
    NotifyService,
    ParentApplicationService,
    PlanogramCommonService,
    PlanogramService,
    ProductlibraryService,
    SharedService,
} from 'src/app/shared/services';
import { AllocateValidationService } from 'src/app/shared/services/layouts';
@Component({
    selector: 'app-clipboard',
    templateUrl: './clipboard.component.html',
    styleUrls: ['./clipboard.component.scss'],
})
export class ClipboardComponent implements OnInit, OnDestroy, AfterViewInit {
    public clipboard: ClipBoardItem[] = [];
    public dynamicZIndex: number = 1000;
    private subscriptions: Subscription = new Subscription();
    public showClipboard: boolean;
    public clipBoardViewBottom: boolean = false;

    constructor(
        public sappClipBoardService: ClipBoardService,
        private readonly sharedService: SharedService,
        private readonly notifyService: NotifyService,
        private readonly historyService: HistoryService,
        private readonly productlibraryservice: ProductlibraryService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly planogramService: PlanogramService,
        private readonly dragDropEventsService: DragDropEventsService,
        private readonly dialogRef: MatDialogRef<ClipboardComponent>,
        private readonly parentApp: ParentApplicationService,
        private readonly allocateValidator: AllocateValidationService,
        @Optional() @Inject(MAT_DIALOG_DATA) private dialogData?: DialogSearch,
    ) { }

    ngAfterViewInit(): void {
        this.subscriptions.add(this.sappClipBoardService.selectItem.subscribe((res) => {
            if (res) {
                this.itemclicked(res)
            }
        }))
    }

    ngOnInit(): void {
        this.showClipboard = this.dialogData.flag;
        this.clipboard = this.sappClipBoardService.clipboard;
        this.subscriptions.add(this.dragDropEventsService.beginDrag.subscribe(() => this.toggleClipBoard(true)));
        this.subscriptions.add(this.dragDropEventsService.endDrag.subscribe(() => this.toggleClipBoard(false)));
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public getDragDropData(itemData: ClipBoardItem): IDragDrop {
        const dropData: IDragDrop = {
            $id: `clip|${itemData.clipId}`,
            ObjectDerivedType: itemData.ObjectDerivedType,
            $sectionID: '',
            dragOriginatedFrom: DragOrigins.ClipBoard,
            dragDropSettings: { drag: true, drop: false },
        };
        return dropData;
    }

    public removeClipboardItem(event): void {
        if (this.sappClipBoardService.isSelectAllClipItems) {
            this.clipboard.length = 0;
            this.sappClipBoardService.clipItemLength=0;
            this.dialogRef.close();
            this.notifyService.success('CLIPBOARD_EMPTIED');           
        } else {
            this.clipboard.forEach((clipItem) => {
                if (clipItem.isSelected) {
                    let index = this.clipboard.findIndex(e => e.clipId == clipItem.clipId);
                    this.sappClipBoardService.clipItemLength -= this.sappClipBoardService.productCount;
                    this.sappClipBoardService.clipboard.splice(index, 1);
                }
            })
        }
        this.sappClipBoardService.isItemSelected = false;
        this.sappClipBoardService.isSelectAllClipItems = false;
    }

    public toShoppingCart(product: ProductListItem[]): void {
        const items = [];
        const itemsToAdd = product;
        if (itemsToAdd.length == 0) {
            this.notifyService.warn('NO_ITEMS_FOUND_TO_ADD');
        } else {
            const rootObj = this.sharedService.getObject(
                this.sharedService.activeSectionID,
                this.sharedService.activeSectionID,
            );
            const cartObj = Utils.getShoppingCartObj(rootObj.Children);
            cartObj.Children.forEach((element) => {
                itemsToAdd.forEach((el, index) => {
                    if (element.Position.Product.UPC === el.Product.UPC) {
                        itemsToAdd.splice(index, 1);
                    }
                });
            });

            if (itemsToAdd.length) {
                itemsToAdd.forEach((dataItem) => {
                    items.push(dataItem);
                });
                this.validateProductAndAddToCart(items);
            } else {
                this.notifyService.warn('PRODUCT_IS_ALREADY_EXIST_IN_SHOPPING_CART');
            }
        }
    }

    private validateProductAndAddToCart(items: ProductListItem[]): void {
      if(this.parentApp.isAllocateApp) {
        this.allocateValidator.validateProducts(items).subscribe((isValid: boolean) => {
          if(isValid) {
            this.addToShoppingCartFromClipboard(items);
          }
        })
      } else {
        this.addToShoppingCartFromClipboard(items);
      }
    }
    public addToShoppingcart(): void {
        let selectedClipItem = this.sappClipBoardService.clipboard.filter((clipItem) => clipItem.isSelected);
        let positions: ProductListItem[] = [];
        if (selectedClipItem.length) {
            selectedClipItem.forEach((element) => {
                element.productList.forEach((element) => {
                    positions.push(element);
                })
            })
        }
        if(this.sharedService.activeSectionID!=""){
            this.toShoppingCart(positions);
            this.sappClipBoardService.isItemSelected = false;
            this.sappClipBoardService.isSelectAllClipItems = false; 
        }
        else{
            this.notifyService.warn('PLEASE_LOAD_THE_PLANOGRAM_FIRST');
        }     
    }
    private addToShoppingCartFromClipboard(item?: ProductListItem[]): void {
        if (!this.sharedService.checkIfAssortMode('new-position-add')) {
            let itemsToadd: Position[] = [];
            const items: ProductListItem[] = cloneDeep(item);
            const sectionID = this.sharedService.activeSectionID;
            const rootObj = this.sharedService.getObjectAs<Section>(sectionID, sectionID);
            const cartObj = Utils.getShoppingCartObj(rootObj.Children);
            let itemNotAdded = 0;
            this.historyService.startRecording();
            items.forEach((dataItem) => {
                itemsToadd = itemsToadd.concat(this.planogramCommonService.initPrepareModel([dataItem], rootObj));
            });
            const ctx = new Context(rootObj);
            for (const itemToAdd of itemsToadd) {
                if (itemToAdd.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
                    if (typeof itemToAdd.moveSelectedToCartfromProductSearch === 'function') {
                        var itemAdded = itemToAdd.moveSelectedToCartfromProductSearch(ctx, cartObj);
                        itemAdded ? '' : itemNotAdded++;
                        this.planogramService.rootFlags[this.sharedService.activeSectionID].isSaveDirtyFlag = true;
                        this.planogramService.updateSaveDirtyFlag(
                            this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag,
                        );
                    }
                }
            }
            if (itemNotAdded) {
                this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag = false;
                this.planogramService.updateSaveDirtyFlag(
                    this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag,
                );
                if (item) {
                    this.notifyService.warn('PRODUCT_IS_ALREADY_EXIST_IN_SHOPPING_CART_PLANOGRAM');
                } else {
                    this.productlibraryservice.selectedProductList.length === 1
                        ? this.notifyService.warn('PRODUCT_IS_ALREADY_EXIST_IN_SHOPPING_CART_PLANOGRAM')
                        : this.notifyService.warn('SOME_OF_THE_PRODUCTS_ARE_ALREADY_EXIST_IN_SHOPPINGCART_PLANOGRAM');
                }
            } else {
                this.notifyService.success('PRODUCTS_ADDED_SUCCESSFULLY_TO_CART');
            }
            this.historyService.stopRecording();
        } else {
            this.notifyService.warn('ADDING_TO_CART_DISABLED');
        }
    }

    private toggleClipBoard(toogle: boolean): void {
        const dialogRef = this.dialogRef;
        if (toogle) {
            setTimeout(() => {
                document.querySelector(`#${dialogRef.id}`).parentElement.classList.add('hidden-dialog');
            });
            document.querySelector<HTMLElement>('.cdk-overlay-pane').style.visibility = 'hidden';
        } else {
            setTimeout(() => {
                document.querySelector(`#${dialogRef.id}`).parentElement.classList.remove('hidden-dialog');
            });
            document.querySelector<HTMLElement>('.cdk-overlay-pane').style.visibility = 'visible';
        }
    }
    
    public showhideClipboard(){
        this.dialogRef.close();
        this.showClipboard= !this.showClipboard;
        if(this.showClipboard){
            this.sappClipBoardService.openDialog(true,"openInBottom");
        }
        else{
             this.sappClipBoardService.openDialog(false,"collapse");
        }
    }

    // Selection of clipitem (single click . ctrl + click , shift + click)
    public itemclicked(item: ClipBoardItem, event?: MouseEvent): void {
        this.sharedService.isItemClickedOnPlanogram = false;
        let ind: number = -1;
        if (this.sappClipBoardService.preSelectedObj && this.sappClipBoardService.clipboard.length) {
            ind = this.sappClipBoardService.clipboard.findIndex((clipItem) => clipItem.clipId === this.sappClipBoardService.preSelectedObj.clipId)
        }
        switch (true) {
            case event?.ctrlKey:
                item.isSelected = !item.isSelected;
                this.sappClipBoardService.preSelectedObj = item;
                break;
            case event?.shiftKey:
                if (this.sappClipBoardService.preSelectedObj.clipId > item.clipId) {
                    for (let i = this.sappClipBoardService.preSelectedObj.clipId; i >= item.clipId; i--) {
                        let index = this.clipboard.findIndex(e => e.clipId == i);
                        if (index > -1 && ind > -1 && index !== ind)
                            this.clipboard[index].isSelected = !this.clipboard[index].isSelected;
                    }
                } else {
                    for (let i = this.sappClipBoardService.preSelectedObj.clipId; i <= item.clipId; i++) {
                        let index = this.clipboard.findIndex(e => e.clipId == i);
                        if (index > -1 && ind > -1 && index !== ind)
                            this.clipboard[index].isSelected = !this.clipboard[index].isSelected;
                    }
                }
                break;
            default:
                if (this.clipboard.length > 1) {
                    this.clipboard.forEach((clipItem) => {
                        clipItem.isSelected = false;
                    })
                }
                item.isSelected = true;
                this.sappClipBoardService.preSelectedObj = item;
                break;
        }
        if (!this.clipboard.some((clipItem) => clipItem?.isSelected === false)) {
            this.sappClipBoardService.isSelectAllClipItems = true;
        }
        else {
            this.sappClipBoardService.isSelectAllClipItems = false;
        }
        let index = this.clipboard.findIndex(clipItem => clipItem.isSelected === true)
        if (index > -1) {
            this.sappClipBoardService.isItemSelected = true;
        }
        else {
            this.sappClipBoardService.isItemSelected = false;
        }
        this.sappClipBoardService.getCount();
        this.sappClipBoardService.clipboard = this.clipboard;
    }
}
