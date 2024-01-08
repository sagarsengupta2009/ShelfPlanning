import { Injectable, Optional } from '@angular/core';
import { AppConstantSpace } from '../../../../../constants/appConstantSpace';
import { TranslateService } from '@ngx-translate/core';
import { Utils } from '../../../../../constants/utils';
import {
    NotifyService,
    PlanogramRendererService,
    PositionSvgRenderService,
    PlanogramService,
    SharedService,
    PogSideNavStateService,
    ParentApplicationService,
    PlanogramStoreService,
} from 'src/app/shared/services';
import { ClipBoardItem, ProductListItem } from 'src/app/shared/models';
import { Position, Fixture, Modular, Annotation, Section, Orientation } from 'src/app/shared/classes';
import { cloneDeep } from 'lodash';
import { DomSanitizer } from '@angular/platform-browser';
import { ConsoleLogService } from 'src/app/framework.module';
import { ClipboardComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { DecimalPipe } from '@angular/common';
@Injectable({
    providedIn: 'root',
})
export class ClipBoardService {
    public clipboard: ClipBoardItem[] = [];
    public lastCopiedObjSectionId = null;
    private clipItemCounter: number = 0;
    public clipboardwidth : number = 4;
    public clipBoardHeight: number = 200;
    private sideNavMenuWidth: number = 33;
    public clipItemLength : number = 0;
    public preSelectedObj: ClipBoardItem;
    public isSelectAllClipItems: boolean = false;
    public selectItem: Subject<ClipBoardItem> = new Subject<ClipBoardItem>();
    public isItemSelected: boolean = false;
    public productCount: number = 0;
    public fixtureCount: number = 0;
    public totalHeight: number = 0;
    public totalWidth: number = 0;
    public totalDepth: number = 0;
    public totalDimension: string;
    private OrientNS = new Orientation();
    constructor(
        private readonly sharedService: SharedService,
        private readonly translate: TranslateService,
        private readonly planogramService: PlanogramService,
        private readonly notifyService: NotifyService,
        private readonly sanitizer: DomSanitizer,
        private readonly log: ConsoleLogService,
        private readonly positionSvgRender: PositionSvgRenderService,
        private readonly planogramRendererService: PlanogramRendererService,
        public readonly pogSideNavStateService: PogSideNavStateService,
        private readonly parentApp: ParentApplicationService,
        private readonly matDialog: MatDialog,
        private readonly decimalPipe: DecimalPipe,
        private readonly planogramStore: PlanogramStoreService,
        @Optional() private readonly dialog: MatDialogRef<ClipboardComponent>,
    ) {}

    public showClipboardIfApplicable(action:string): boolean {
        let annotationCopied: boolean;
        const lastSelAnnotation: ClipBoardItem = this.clipboard[0];
        if (lastSelAnnotation && lastSelAnnotation.ObjectDerivedType == 'Annotation') {
            annotationCopied = true;
        }
        if(action=='Copy' || action=='Cut'){
            return (
                this.lastCopiedObjSectionId &&
                !annotationCopied
            );
        }
        else if(action=='Paste'){
            return (
                this.lastCopiedObjSectionId &&
                this.lastCopiedObjSectionId != this.sharedService.getActiveSectionId() &&
                !annotationCopied
            );
        }
        
    }
    public openDialog(flag: boolean, calledFrom: string): void {
        this.sharedService.showClipBoard.next(flag);
        let position;
        if (this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
          position = { left: '0px', bottom: '0px' }
        }
        else if (this.parentApp.isWebViewApp) {
          position = { left: '6px', bottom: '57px' }
        }
        else {
          position = { left: '55px', bottom: '45px' }
        }
        if(calledFrom ==='openInBottom' && this.matDialog.getDialogById('clipBoard-top-view')){
            return;
        }
        const dialogRef = this.matDialog.open(ClipboardComponent, {
          maxWidth: `calc(100vw -${this.sideNavMenuWidth}px)`,
          height: calledFrom=='openInBottom' ? '200px' : '30px',
          width: calledFrom=='openInBottom' ? `calc(100vw - ${this.clipboardwidth}% - ${this.sideNavMenuWidth}px)` : 'fit-content',
          hasBackdrop: false,
          data: { flag: calledFrom=='openInBottom' ? true : false },
          position,
          autoFocus: false,
          panelClass: 'clipBoard-bottomview',
          id: calledFrom=='openInBottom' ? 'clipBoard-top-view' : 'clipBoard-bottom-view' 
        });
        dialogRef.disableClose = true;
        dialogRef.afterClosed().subscribe((result) => {
          this.sharedService.showClipBoard.next(false);
        });
        if(calledFrom ==='openInBottom' && this.matDialog.getDialogById('clipBoard-bottom-view')){
            this.matDialog.getDialogById('clipBoard-bottom-view').close();
            return;
        }
      }
    private convertToProductList(positionList: Position[], pogId: number, pogName: string): ProductListItem[] {
        let productList: ProductListItem[] = [];
        for (const positionObject of positionList) {
            const position: Position = cloneDeep(positionObject);
            let product = position.Dimension as any;
            product.Product = position.Position.Product;
            product.ProductPackage = position.Position.ProductPackage;
            product.temp = {
                fromPOGId: pogId,
                fromPOGName: pogName,
                copiedFromPos: cloneDeep(positionObject),
            };
            product.temp.copiedFromPos.Position.IDPOGObject = null;
            product.temp.copiedFromPos.IDPOGObject = null;
            product.temp.copiedFromPos.IDPOGObjectParent = null;
            product.tooltipMsg = this.selectedStatusMsg(position);
            // store corpid for PA for copy pasting items across divisions.
            if(this.parentApp.isAllocateApp) {
              const pog = this.planogramStore.mappers.filter(pog => pog.IDPOG === pogId)[0];
              product.corpId = pog.corpId;
            }

            productList.push(product);
        }
        return productList;
    }
    public selectedStatusMsg(clipItem): string {
        let msg, itemName , itemCapacity, name:string;        
        if(clipItem.ObjectDerivedType == 'Position'){
            name = "UPC : " +  clipItem.Position.Product.UPC + '\n';
            itemCapacity = this.decimalPipe.transform(clipItem.Dimension.Height, '1.2-2') + ' X ' 
                + this.decimalPipe.transform(clipItem.Dimension.Width, '1.2-2') + ' X ' 
                + this.decimalPipe.transform(clipItem.Dimension.Depth, '1.2-2') + '\n'; 
            itemName = clipItem.Position.Product.Name;
        }
        else if(clipItem.ObjectDerivedType!="Position"){
            name= clipItem.Fixture.FixtureDesc + '\n' ;
            itemCapacity = this.decimalPipe.transform(clipItem.Dimension.Height, '1.2-2') + ' X ' 
                + this.decimalPipe.transform(clipItem.Dimension.Width, '1.2-2') + ' X ' 
                + this.decimalPipe.transform(clipItem.Dimension.Depth, '1.2-2')+ '\n' ; 
            if(clipItem.ObjectDerivedType != 'Modular')
                itemName = clipItem.Children.length + this.translate.instant('ITEMS');
            else if(clipItem.ObjectDerivedType == 'Modular')
                itemName = clipItem.Children.length + this.translate.instant('FIXTURES');
        }        
        msg= name + itemCapacity +itemName;  
        return msg;
    }
    public copyObjects(sectionId: string): void {
        if(this.clipboard.length === 30){
            this.notifyService.warn("CLIPBOARD_LIMIT_REACHED");
            return;
        }
        const sectionObj = this.sharedService.getObject(sectionId, sectionId) as Section;
        const POGId = sectionObj.IDPOG;
        const POGName = sectionObj.Name;
        this.lastCopiedObjSectionId = sectionId;
        const selectedObjsList = this.planogramService.getSelectedObject(sectionId);
        const selectedAnnotation = this.planogramService.getSelectedAnnotation(sectionId);
        if (!selectedObjsList.length && !selectedAnnotation.length) {
            return;
        }
        if (!selectedAnnotation.length) {
            if (this.sharedService.lastSelectedObjectDerivedType[sectionId] == AppConstantSpace.POSITIONOBJECT) {
                let itemAlreadyExist = 0;
                const productList = this.convertToProductList(selectedObjsList as Position[], POGId, POGName);
                this.clipboard.forEach((item, key) => {
                    if (item.productList) {
                        if (item.productList.length == productList.length) {
                            this.clipboard[key].productList.forEach((itm, ky) => {
                                if (itm.Product.IDProduct == productList[ky].Product.IDProduct) {
                                    itemAlreadyExist++;
                                }
                            });
                        }
                    }
                });
                if (itemAlreadyExist == 0) {
                    let copiedObject: ClipBoardItem = <ClipBoardItem>{};
                    copiedObject.ObjectDerivedType = AppConstantSpace.POSITIONOBJECT;
                    copiedObject.firstPosition = productList[0];
                    copiedObject.productList = productList;
                    this.clipItemLength += productList.length;
                    if(this.clipItemLength > 300){
                        this.notifyService.warn('CLIPBOARD_ITEMS_LENGTH_EXCEEDING', 'ok');
                        this.clipItemLength -=productList.length;
                        return;
                    };
                    this.getSVG(copiedObject);
                    this.addClipId(copiedObject as Position | Fixture | Modular | Annotation);
                    this.clipboard.splice(0, 0, copiedObject as Position | Fixture | Modular | Annotation);
                    this.notifyService.warn(
                        (productList.length == 1 ? '1 Item ' : productList.length + ' Items ') +
                            this.translate.instant('COPIED_TO_CLIPBOARD'),
                        'ok',
                    );
                    
                } else {
                    this.notifyService.warn('PRODUCT_ALREADY_PRESENT_IN_CLIPBOARD', 'ok');
                }
            }
            if (
                this.planogramService.getSelectionCount(sectionId) == 1 &&
                (selectedObjsList[0].ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ ||
                    selectedObjsList[0].ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                    selectedObjsList[0].ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ ||
                    selectedObjsList[0].ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
                    selectedObjsList[0].ObjectDerivedType == AppConstantSpace.BLOCK_FIXTURE ||
                    selectedObjsList[0].ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                    selectedObjsList[0].ObjectDerivedType == AppConstantSpace.BASKETOBJ ||
                    selectedObjsList[0].ObjectDerivedType == AppConstantSpace.MODULAR)
            ) {
                let fixture = cloneDeep(selectedObjsList[0]);
                fixture.isLoaded = true;
                fixture.temp = {
                    fromPOGId: POGId,
                    fromPOGName: POGName,
                };
                fixture.Fixture.IDPOGObject = null;
                fixture.IDPOGObject = null;
                fixture.IDPOGObjectParent = null;
                fixture.selected = false;
                    let fixtureName,itemCapacity,itemName;
                    fixtureName= fixture.Fixture.FixtureDesc + '\n' ;
                    itemCapacity = this.decimalPipe.transform(fixture.Dimension.Height, '1.2-2') + ' X ' 
                        + this.decimalPipe.transform(fixture.Dimension.Width, '1.2-2') + ' X ' 
                        + this.decimalPipe.transform(fixture.Dimension.Depth, '1.2-2')+ '\n' ; 
                    if(fixture.ObjectDerivedType != 'Modular')
                        itemName = fixture.Children.length + this.translate.instant('ITEMS');
                    else if(fixture.ObjectDerivedType == 'Modular')
                        itemName = fixture.Children.length + this.translate.instant('FIXTURES');
                    fixture["tooltipMsg"]= fixtureName+itemCapacity+itemName ;
                let prodListCopy = [];
                let recursive = (fixObj) => {
                    fixObj.Children.forEach((item) => {
                        if (Utils.checkIfPosition(item)) {
                            item.Position.IDPOGObject = null;
                            item.IDPOGObject = null;
                            item.IDPOGObjectParent = null;
                            item.selected = false;
                            prodListCopy.push(item);
                        } else if (Utils.checkIfFixture(item)) {
                            item.Fixture.IDPOGObject = null;
                            item.IDPOGObject = null;
                            item.IDPOGObjectParent = null;
                            item.selected = false;
                            Utils.checkIfstandardShelf(item) ? (item.spanShelfs = []) : '';
                            recursive(item);
                        }
                    });
                };
                recursive(fixture);
                let itemAlreadyExist = 0;
                const productList = this.convertToProductList(prodListCopy, POGId, POGName);
                this.clipboard.forEach((item, key) => {
                    if (item.productList) {
                        if (item.productList.length == productList.length) {
                            this.clipboard[key].productList.forEach((itm, ky) => {
                                if (itm.Product.IDProduct == productList[ky].Product.IDProduct) {
                                    itemAlreadyExist++;
                                }
                            });
                        }
                    }
                });
                if(itemAlreadyExist == 0){
                    let copiedObject: ClipBoardItem = <ClipBoardItem>{};
                    copiedObject.productList = productList;
                    copiedObject.ObjectDerivedType = fixture.ObjectDerivedType;
                    copiedObject.fixture = fixture;
                    this.clipItemLength += productList.length;
                    if(this.clipItemLength > 300){
                        this.notifyService.warn('CLIPBOARD_ITEMS_LENGTH_EXCEEDING', 'ok');
                        this.clipItemLength -=productList.length;
                        return;
                    };
                    this.getSVG(copiedObject);
                    this.addClipId(copiedObject);
                    //clip board items does not belong to any sectionid so making this empty
                    copiedObject.fixture.$sectionID = '';
                    this.clipboard.splice(0, 0, copiedObject);
                }   
                else{
                    this.notifyService.warn('PRODUCT_ALREADY_PRESENT_IN_CLIPBOARD', 'ok');
                }             
            }
        } else {
            let annotationsCopy: Annotation[] = [];
            for (let i = 0; i < selectedAnnotation.length; i++) {
                let copiedAnnotations = cloneDeep(selectedAnnotation[i]);
                copiedAnnotations.IDPOGObject = null;
                copiedAnnotations.status = 'insert';
                copiedAnnotations.IdPogObjectExtn = null;
                copiedAnnotations.$belongsToID = null;
                copiedAnnotations.IDPOG = null;
                //clip board items does not belong to any section so making this empty
                copiedAnnotations.$sectionID = '';
                annotationsCopy.push(copiedAnnotations);
                this.addClipId(copiedAnnotations);
            }
            this.clipboard.splice(0, 0, { annotations: annotationsCopy, ObjectDerivedType: 'Annotation' });
        }
        if(this.isSelectAllClipItems){
            this.selectAllClipItems(true);
            this.getCount();
        }
    }

    private addClipId(item: ClipBoardItem): void {
        item.clipId = ++this.clipItemCounter;
    }

    private getSVGPosition(clipBoardItem: ClipBoardItem): void {
        let pos = clipBoardItem.productList[0].temp.copiedFromPos;
        let SVG: string = '';
        let scale: number;

        if (pos.ObjectDerivedType) {
            let maxHeight = 0;
            let totalWidth = 0;
            let fullSVG = '';
            for (const o of clipBoardItem.productList) {
                pos = o.temp.copiedFromPos;
                let pwidth,pheight;
                if(this.sharedService.getParentObject(pos, pos?.$sectionID)?.ObjectDerivedType =='ShoppingCart'){
                    pwidth = pos.computeWidth();
                    pheight = pos.computeHeight();
                }
                else{
                    pwidth = pos.Dimension.Width ? pos.Dimension.Width : pos.linearWidth();
                    pheight = pos.Dimension.Height ? pos.Dimension.Height : pos.linearHeight();
                }                
                try {
                    SVG = this.positionSvgRender.SVGPosition(pos, 1, { mode: 'CBSVG' });
                } catch (e) {
                    this.log.error('PARENT_OF_COPIED_POSITION_UNLOADED');
                    const pwidth = pos.Dimension.Width;
                    const pheight = pos.Dimension.Height;
                    const imageUrl = pos.Position.ProductPackage.Images.front;
                    SVG = `<image class="posImage" transform="scale(1, -1) translate(0,-${pheight})" preserveAspectRatio="none" width="${pwidth}" height="${pheight}" xlink:href="${imageUrl}" />`;
                }
                fullSVG += `<g transform="translate(${totalWidth}, 0)"><title>${Utils.replacedHTMLEntityString(o["tooltipMsg"])}</title>${SVG}</g>`;
                maxHeight = maxHeight > pheight ? maxHeight : pheight;
                totalWidth += pwidth;
            }

            let height = 100;
            let vscale = 100 / maxHeight;
            let hscale = 250 / totalWidth;
            if (vscale < hscale) {
                scale = vscale;
            } else {
                scale = hscale;
                height = scale * maxHeight;
            }
            const width = scale * totalWidth;
            let SVGHeader = `<svg style="width: fit-content" viewbox="0 0 ${width} ${height}" version="1.1" height=100% width=100% xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`;
            SVGHeader += `<g transform="translate(0,${height}) scale(${scale},-${scale})">`;
            const svgBlock = `${SVGHeader}${fullSVG}</g></svg>`;
            clipBoardItem.SVGBlock = this.sanitizer.bypassSecurityTrustHtml(svgBlock);
        } else {
            this.log.info('Renderer Not Found: ' + clipBoardItem?.productList, clipBoardItem?.productList);
        }
    }

    private getSVGFixture(clipBoardItem: ClipBoardItem): void {
        let svg: string = '';
        let scale: number;

        if (clipBoardItem?.fixture?.ObjectDerivedType) {
            try {
                svg = this.planogramRendererService.SVGElement(clipBoardItem?.fixture, 1, { mode: 'CBSVG' },clipBoardItem?.productList);
            } catch (e) {
                this.log.error('PARENT_OF_COPIED_FIXTURE_UNLOADED');
                svg = '';
            }
            let height = 100;
            const maxHeight = clipBoardItem?.fixture.maxHeightRequired();
            const vscale = 100 / maxHeight;
            const hscale = 250 / clipBoardItem?.fixture.Dimension.Width;
            if (vscale < hscale) {
                scale = vscale;
            } else {
                scale = hscale;
                height = scale * maxHeight;
            }
            const translateH = clipBoardItem?.fixture.Location.Y * scale + height;
            const width = scale * clipBoardItem?.fixture.Dimension.Width;
            let styleStr = "width: fit-content";
            if(!clipBoardItem?.fixture?.Children?.length || !clipBoardItem?.productList?.length){ //adding this as Standard Shelf empty fixture width takes more space in clipboard
                styleStr = " ";
            }
            let svgHeader = `<svg style="${styleStr}"  viewbox="0 0 ${width} ${height}" version="1.1" height=100% width=100% xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`;
            svgHeader += `<g transform="translate(0,${translateH}) scale(${scale}, -${scale})">`;
            const svgBlock = `${svgHeader}${svg}</g></svg>`;
            clipBoardItem.SVGBlock = this.sanitizer.bypassSecurityTrustHtml(svgBlock);
        } else {
            this.log.info('Renderer Not Found: ' + clipBoardItem?.fixture?.ObjectDerivedType, clipBoardItem?.fixture);
        }
    }

    private getSVG(clipItem: ClipBoardItem): void {
        if (clipItem.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
            return this.getSVGPosition(clipItem);
        } else if (clipItem.ObjectDerivedType !== 'Annotation') {
            return this.getSVGFixture(clipItem);
        }
    }

    public keyDown(key): void{
        switch(key){
            case 'arrowright':
                if(this.preSelectedObj){
                    let index = this.clipboard.findIndex((clipitem) =>clipitem.clipId == this.preSelectedObj.clipId );
                    if(index > -1 && index< this.clipboard.length){
                        this.selectItem.next(this.clipboard[index + 1]);
                    }
                }
            break;
            case 'arrowleft':
                if(this.preSelectedObj){
                    let index = this.clipboard.findIndex((clipitem) =>clipitem.clipId == this.preSelectedObj.clipId );
                    if(index > -1 && index > 0){
                        this.selectItem.next(this.clipboard[index - 1]);
                    }
                }
            break;
        }
    }
    public getCount(): void {
        let positions = [];
        let itemList = [];
        let fixture = 0;
        this.totalHeight = 0;
        this.totalWidth = 0;
        this.totalDepth = 0;
        this.totalDimension = '';
        let selectedproduct = this.clipboard.filter((element) => element.isSelected == true);
        let selectedPositions = this.clipboard.filter((element) => element.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT && element.isSelected == true);
        let selectedFixtures = this.clipboard.filter((element) => element.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT && element.ObjectDerivedType!== AppConstantSpace.MODULAR && element.isSelected);
        let selectedModulars = this.clipboard.filter((element) => element.ObjectDerivedType === AppConstantSpace.MODULAR && element.isSelected);
        if (selectedproduct.length) {
            selectedproduct.forEach((element) => {
                element.productList.forEach((element) => {
                    positions.push(element);
                })
                if (element.productList.length && !selectedFixtures.length && !selectedModulars.length) {
                    element.productList.forEach((prod) => {
                        itemList.push(prod)
                    })
                }
            })
        }        
        this.productCount = positions.length;
        if(selectedModulars.length){
            selectedModulars.forEach((element) => {
                fixture += element.fixture?.Children?.length;
                itemList.push(element.fixture.Dimension);
            })
        }
        else if(selectedFixtures.length && !selectedModulars.length){
            selectedFixtures.forEach((element) => {
                itemList.push(element.fixture.Dimension);
            })
        }
        this.fixtureCount = selectedFixtures.length + fixture;

        if(selectedPositions.length && selectedFixtures.length){
            this.totalDimension= this.translate.instant('VARYING_DIMENSIONS');
        }
        if(selectedPositions.length && selectedModulars.length){
            this.totalDimension= this.translate.instant('VARYING_DIMENSIONS');
        }
        if(selectedFixtures.length && selectedModulars.length){
            this.totalDimension= this.translate.instant('VARYING_DIMENSIONS');
        }
        //calculating total Height
        let heightList = itemList.map((element) => element.Height);
        this.totalHeight= Math.max(...heightList)

        //calculating total Width
        let widthList = itemList.map((element) => element.Width);
        widthList.forEach((width) => {
            this.totalWidth += width;
        })

        //calculating total Width
        let depthList = itemList.map((element) => element.Depth);
        this.totalDepth= Math.max(...depthList)
    }
    //Selecting / Deselecting all clipitems from clipboard
    public selectAllClipItems(isChecked: boolean): void {
        if (isChecked) {
            this.clipboard.forEach((clipItem) => {
                clipItem.isSelected = true;
            })
            this.isItemSelected = true;
            this.getCount();
        } else {
            this.clipboard.forEach((clipItem) => {
                clipItem.isSelected = false;
            })
            this.isItemSelected = false;
            this.isSelectAllClipItems = false;
        }
    }
}
