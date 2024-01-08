import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { PropertyType, PogSideNaveView, CombinedBlock } from 'src/app/shared/models';
import {
  SharedService, PlanogramService, PlanogramStoreService,
  Planogram_2DService, ClipBoardService, PlanogramHelperService,
  HistoryService, NotifyService, ParentApplicationService, PogSideNavStateService, CrunchModeService, Render2dService, ContextMenuService, BlockHelperService, AnnotationService
} from 'src/app/shared/services';
import { AnnotationDialogComponent } from '../../annotation/annotation-dialog/annotation-dialog.component';
import { PropertyGridComponent } from '../../property-grid/property-grid.component';
import { ContextModelComponent } from '../context-model/context-model.component';
import { Coffincase, Position, Section } from 'src/app/shared/classes';
import { PositionParentList } from 'src/app/shared/services/common/shared/shared.service';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { CrunchMode, ManualBlockService } from 'src/app/shared/services/layouts';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
declare const window: any;
@Component({
  selector: 'sp-position-context-menu',
  templateUrl: './position-context-menu.component.html',
  styleUrls: ['./position-context-menu.component.scss']
})
export class PositionContextMenuComponent implements OnChanges {
  @ViewChild(MatMenuTrigger, { static: false }) trigger: MatMenuTrigger;
  @ViewChild('menu2', {static: false}) menu2:MatMenu;
  @ViewChild('menu3', { static: false }) menu3: MatMenu;
  @Input() data: Position;
  public enableDownDivider: boolean = true;
  public enableCopy: boolean = true;
  public enableCut: boolean = true;
  public enableUpDivider: boolean = true;
  public enableUnitCapping: boolean = false;
  public canUnitCapping: boolean = false;
  public canRemoveUnitCapping: boolean = false;
  public advancedTrayCappingType: number = 0;
  public maxreached: boolean;
  public facingCount: number;
  public annotationDis: boolean = true;
  public removeAdvancedTrayCapping: boolean = true;
  public showPABlocksMenu = false;
  public blocks: CombinedBlock[] = [];
  public duplicatePositions: Position[] = [];
  public advancedTrayCapping: boolean = false;
  public undoFrontCapping: boolean = false;
  public undoDepthCapping: boolean = false;
  public undoFront_DepthCapping: boolean = false;
  public enableFacings:boolean=false;
  constructor(
    private readonly translate: TranslateService,
    private readonly dialog: MatDialog,
    private readonly sharedService: SharedService,
    private readonly parentApp: ParentApplicationService,
    private readonly planogramService: PlanogramService,
    private readonly planogramHelper: PlanogramHelperService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly planogram2dService: Planogram_2DService,
    private readonly sappClipBoardService: ClipBoardService,
    private readonly historyService: HistoryService,
    private readonly notifyService: NotifyService,
    private readonly PogSideNavStateService: PogSideNavStateService,
    private readonly crunchMode: CrunchModeService,
    private readonly render2d: Render2dService,
    private readonly contextMenuService: ContextMenuService,
    private readonly blockHelper: BlockHelperService,
    private readonly manualBlock: ManualBlockService,
    private readonly annotationService: AnnotationService
  ) { }


  public ngOnChanges(changes: SimpleChanges): void {
    this.resetFlag();
    this.annotationDis = !this.planogramHelper.isPOGLive(this.data.$sectionID, true);
    this.bindData();
    this.setDuplicatePosition();
  }

  public get isFillOptionEnabled(): { display: 'block' | 'none', cursor?: 'default', color?: string, 'background-color'?: string } | undefined {
    if (this.data.parent.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ || this.data.parent.ObjectDerivedType === AppConstantSpace.BASKETOBJ) {
      return {
        display: "block"
      }
    } else {
      return this.crunchMode.enableFillOption();
    }
  }
  public get isRemoveDuplicateOptionEnabled(): { display: 'block' | 'none' } | undefined {
    if (this.data.parent.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ || this.data.parent.ObjectDerivedType === AppConstantSpace.BASKETOBJ) {
      return {
        display: "block"
      }
    } else {
      return {
        display: "none"
      };
    }
  }

  private resetFlag(): void {
    this.enableDownDivider = true;
    this.enableCopy = true;
    this.enableCut = true;
    this.enableUpDivider = true;
    this.enableUnitCapping = false;
    this.canUnitCapping = false;
    this.canRemoveUnitCapping = false;
    this.advancedTrayCapping = false;
  }

  private bindData(): void {
    this.showPABlocksMenu = false;
    const positionObj = this.planogramService.getSelectedObject(this.sharedService.getActiveSectionId()) as Position[];
    if (this.parentApp.isAllocateApp && this.parentApp.isAllocateAppInManualMode) {
      const pog = <Section>this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId());
      this.blocks = this.blockHelper.getAllBlocksCombined(pog);
      if (this.blocks.length) {
        this.showPABlocksMenu = true;
      }
    }
    if (this.parentApp.isNiciMode) {
      if (this.sharedService.isNiciFeatureNotAllowed('FLIP', positionObj)) {
        this.enableDownDivider = false;
        this.enableCopy = false;
        this.enableCut = false;
        this.enableUpDivider = false;
      } else {
        this.enableDownDivider = true;
        this.enableCopy = true;
        this.enableCut = true;
        this.enableUpDivider = true;
      }
      if (this.sharedService.isNiciFeatureNotAllowed('FACINGSCHANGE', positionObj)) {
        this.enableFacings = true;
      }
    }
    // Tray or Case
    const pkgStyle = positionObj[0].Position.ProductPackage.IdPackageStyle;
    if (pkgStyle === 1 || pkgStyle === 2) {
      this.enableUnitCapping = true;
      if (Number(positionObj[0].Position.IDMerchStyle) == AppConstantSpace.MERCH_ADVANCED_TRAY) {
        this.advancedTrayCapping = true;
        this.advancedTrayCappingType = positionObj[0].Position.UnitCapping;
        switch (Number(this.advancedTrayCappingType)) {
          case AppConstantSpace.FRONTCAPPING:
            this.undoFrontCapping = true;
            this.undoDepthCapping = false;
            this.undoFront_DepthCapping = false;
            break;
          case AppConstantSpace.DEPTHCAPPING:
            this.undoFrontCapping = false;
            this.undoDepthCapping = true;
            this.undoFront_DepthCapping = false;
            break;
          case AppConstantSpace.FRONT_DEPTHCAPPING:
            this.undoFrontCapping = false;
            this.undoDepthCapping = false;
            this.undoFront_DepthCapping = true;
            break;
        }
      }
      this.canUnitCapping = !positionObj[0].hasAboveItem && !positionObj[0].hasBackItem;
      this.canRemoveUnitCapping = positionObj[0].hasAboveItem;
    }
  }
  public getMenu(): MatMenu{
    if(this.advancedTrayCapping){
      return this.menu3;
    }
    return this.menu2;
  }
  public openFacingsDialog(data: Position, event: MouseEvent): void {
    this.planogram2dService.objectClicked(this.data, event);
    this.dialog.open(ContextModelComponent, {
      height: 'auto',
      width: '300px',
      data: { data, property: PropertyType.Facings },
      autoFocus: false
    });
    this.removeContextMenu();
  }

  public openOrientationDialog(data: Position, event: MouseEvent): void {
    this.planogram2dService.objectClicked(this.data, event);
    this.dialog.open(ContextModelComponent, {
      height: 'auto',
      width: '560px',
      data: { data, property: PropertyType.Orientation },
      panelClass: 'mat-dialog-move-cursor',
      autoFocus: false
    });
    this.removeContextMenu();
  }

  public fillTheFixture(event: MouseEvent): void {
    this.planogram2dService.objectClicked(this.data, event);
    if (event) {
      if (this.data.parent.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ || this.data.parent.ObjectDerivedType === AppConstantSpace.BASKETOBJ) {
        this.fillCoffinCase();
      } else {
        this.maxreached = false;
        let totalAvialableLinear: number;
        let positionSel = this.planogramService.getSelectedObject(this.sharedService.getActiveSectionId()) as Position[];
        const rootObj = this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId()) as Section;
        const posSelFixture = this.sharedService.getParentObject(positionSel[0], positionSel[0].$sectionID) as PositionParentList;
        const crunchMode = posSelFixture.Fixture.LKCrunchMode;
        const currentPosWidth = positionSel[0].computeWidth();
        if (posSelFixture.getColor() != "red") {
          if (crunchMode === 5) {
            totalAvialableLinear = posSelFixture.ChildDimension.Width - positionSel[0].Location.X;
          } else {
            totalAvialableLinear = posSelFixture.Fixture.AvailableLinear;
          }
          const count = totalAvialableLinear / currentPosWidth;
          if (positionSel[0].Position.FacingsX !== undefined && crunchMode !== 5) {
            this.facingCount = positionSel[0].Position.FacingsX + Math.ceil(count);
          } else if (crunchMode === 5) {//nocrunch
            this.facingCount = Math.trunc(count);
          }
          const minFacingXValue = positionSel[0].Position.MinFacingsX;
          const maxFacingXValue = positionSel[0].Position.MaxFacingsX;
          if (this.facingCount > minFacingXValue && this.facingCount <= maxFacingXValue) {
            this.facingCount = this.facingCount;
          } else if (this.facingCount > maxFacingXValue) {
            this.facingCount = maxFacingXValue;
          }
          if (crunchMode === 5) {//for no crunch
            this.planogramHelper.increaseFacing(rootObj, this.facingCount)
            this.reduceFacingCount(posSelFixture);
          } else {
            this.increaseFacingCount(posSelFixture, positionSel[0].Position.FacingsX, positionSel[0]);
          }

        }
        this.sharedService.updatePosition.next(this.data.$id);
        this.planogramService.updateNestedStyleDirty = true;;
        this.sharedService.sectionStyleSub.next(true);
        this.removeContextMenu();
      }
    }
  }

  private fillCoffinCase(): void {
    const unqHistoryID = this.historyService.startRecording();

    const positionSel = this.data;
    const posSelFixture = this.data.parent as Coffincase;
    const fitCheck = posSelFixture.section.fitCheck;

    posSelFixture.section.fitCheck = false;
    posSelFixture.fillCoffinCase(positionSel);

    this.historyService.stopRecording(undefined, undefined, unqHistoryID);
    this.sharedService.renderPositionAgainEvent.next(true);
    posSelFixture.section.fitCheck = fitCheck;
  }

  private setDuplicatePosition(): void {
    const allPositions = this.data.parent.Children;
    this.duplicatePositions = (allPositions.filter(ele => {
      return ele.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT &&
        ((ele.Position.IDPOGObject !== this.data.Position.IDPOGObject) ||
          (this.data.Position.IDPOGObject === null && ele.TempId !== this.data.TempId)) &&
        ele.Position.Product.UPC === this.data.Position.Product.UPC &&
        ele.Position.IDPackage === this.data.Position.IDPackage &&
        ele.Position.IDProduct === this.data.Position.IDProduct
    })) as Position[];
  }

  public removeDuplicates(): void {
    const parentFixture = this.data.parent as Coffincase;
    if (this.duplicatePositions.length) {
      parentFixture.removeDuplicatePosition(this.data.$sectionID , this.duplicatePositions);
    } else {
      this.notifyService.warn(this.translate.instant("NO_DUPLICATES_FOUND"));
    }
  }

  public changeBlock(idBlock: number | string): void {
    const sectionId = this.sharedService.getActiveSectionId();
    let selectedPositions = this.planogramService.getSelectedObject(sectionId) as Position[];
    this.blockHelper.changeBlock(idBlock,sectionId, selectedPositions);
  }

  public createManualBlock(): void {
    this.manualBlock.openManualBlockDialog();
  }

  private reduceFacingCount(posSelFixture: PositionParentList): void {
    let count: number = 1;
    if (posSelFixture.getColor() !== "red") {
      count = 0;
    }
    if (count !== 0) {
      this.facingCount--;
      let rootObj = this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId()) as Section;
      this.planogramHelper.increaseFacing(rootObj, this.facingCount);
      this.reduceFacingCount(posSelFixture);
    }
  }

  private removeHistoryId(): void {
    const idsList = this.planogramHelper.getAllHistoryId;
    for (const id of idsList) {
      this.historyService.abandonLastCapturedActionInHistory(id);
    }
  }

  private increaseFacingCount(posSelFixture: PositionParentList, currentFacingCount: number, positionSel: Position): void {
    let counter: number = 1;
    const rootObj = this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId()) as Section;
    if (this.maxreached) {
      counter = 0;
    }
    if (posSelFixture.getColor() === "red") {
      currentFacingCount--;
      this.removeHistoryId();
      this.planogramHelper.increaseFacing(rootObj, currentFacingCount, true);
      this.planogramHelper.getAllHistoryId = [];
      counter = 0;
    }
    if (counter != 0) {
      currentFacingCount++;
      const minFacingXValue = positionSel.Position.MinFacingsX;
      const maxFacingXValue = positionSel.Position.MaxFacingsX;
      if (currentFacingCount > minFacingXValue && currentFacingCount <= maxFacingXValue) {
        currentFacingCount = currentFacingCount;
      } else if (currentFacingCount > maxFacingXValue) {
        this.removeHistoryId();
        currentFacingCount = maxFacingXValue;
        this.maxreached = true;
        counter = 0;
      }
      this.planogramHelper.increaseFacing(rootObj, currentFacingCount, true);
      this.increaseFacingCount(posSelFixture, currentFacingCount, positionSel);
    }
  }

  private objectPropertyGrid(child, event: MouseEvent): void { //TODO @ankita add interface
    this.sharedService.fixtureTypeMultiple = false;
    if (this.PogSideNavStateService.propertiesView.isPinned && this.PogSideNavStateService.activeVeiw != PogSideNaveView.PROPERTYGRID) {
      this.sharedService.openSelectedComponentInSideNav.next({ activeScreen: 'PG', isPin: true });
    } else if (!this.PogSideNavStateService.propertiesView.isPinned) {
      if (this.parentApp.isAssortAppInIAssortNiciMode && child.ObjectType === "Position") {
        window.parent.postMessage(`invokePaceFunc:openPropertyGrid:["${this.planogramStore.loadPogId}","${child.Position.Product.IDProduct}"]`, '*');
        event.stopPropagation();
        return;
      }
      //TODO perf update, update only if assort grid is dirty or remove completely on updating data source.

      this.dialog.open(PropertyGridComponent, {
        height: '84%',
        width: '55%',
        panelClass: 'mat-dialog-move-cursor',
        id: 'property-grid-dialog'
      });
      event.stopPropagation();
    } else {
      event.stopPropagation();
      return;
    }
    this.removeContextMenu();
  };

  public openPropertyGrid(child: Position, event: MouseEvent): void {
    this.planogram2dService.objectClicked(child, event);
    this.objectPropertyGrid(child, event);
    this.removeContextMenu();
  }

  public deletePositionCxt(event: MouseEvent): void {
    this.planogram2dService.objectClicked(this.data, event);
    this.delete();
    let selectedObjsList: Position[] = [this.data];
    this.sharedService.deleteSubscription.next(selectedObjsList);
    this.planogramService.updateNestedStyleDirty = true;;
  }

  private delete(): void {
    if (this.planogramHelper.isPOGLive(this.data.$sectionID, true)) {
      this.removeContextMenu();
      return;
    }
    this.planogramService.rootFlags[this.data.$sectionID].isActionPerformed++;
    const sectionObj = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID) as Section;
    this.planogramHelper.deleteObject(sectionObj); //$scope.showModularNext
    this.render2d.isDirty = true,
      this.planogramService.updateNestedStyleDirty = true;;
    this.removeContextMenu();
  }

  public copyPositionCxt(event: MouseEvent): void {
    this.planogram2dService.objectClicked(this.data, event);
    const positionObj = this.planogramService.getSelectedObject(this.sharedService.getActiveSectionId()) as Position[];
    const lastSelectedObj = positionObj[positionObj.length - 1];
    if (Utils.checkIfPosition(lastSelectedObj)
      && !this.sharedService.getPositionLockField(this.planogramStore.appSettings.positionLockField, lastSelectedObj).flag) {
      this.planogram2dService.copyObjects('Copy', this.data.$sectionID);
    } else {
      this.notifyService.warn(lastSelectedObj.getLockErrorMsg(this.translate.instant("POSITOIN_LOCKED_CANT_COPY")));
    }
    this.removeContextMenu();
    if(!this.dialog.openDialogs.length){
      if (this.sappClipBoardService.showClipboardIfApplicable('Copy')) {
        this.sharedService.changeInGridHeight.next(false);
        this.sappClipBoardService.openDialog(false,"collapse");
      }
    }
  }

  public cutPositionCxt($event: MouseEvent): void {
    this.planogram2dService.objectClicked(this.data, $event);
    this.planogram2dService.copyObjects('Cut', this.data.$sectionID);
    this.removeContextMenu();
  }

  public pastePositionCxt($event: MouseEvent): boolean {
    this.planogram2dService.objectClicked(this.data, $event);
    const sectionID = this.sharedService.getActiveSectionId();
    if (this.sappClipBoardService.showClipboardIfApplicable('Paste')) {
      this.sharedService.changeInGridHeight.next(true);
      this.sappClipBoardService.openDialog(true, "openInBottom");
      return false;
    } else if (!this.planogramService.rootFlags[sectionID].isItemCopied) {
      this.removeContextMenu();
      return false;
    }

    this.planogram2dService.pasteObjects(this.data.$sectionID);
    this.sharedService.updatePosition.next(this.data.$id);
    this.planogramService.updateNestedStyleDirty = true;;
    this.removeContextMenu();
  }

  public addEditAnnotation(event: MouseEvent): void {
    this.planogram2dService.objectClicked(this.data, event);
    this.annotationService.refreshAnnotationDialog(false, this.data);
    this.removeContextMenu();
  }

  public openSectionInfo($event: MouseEvent): void {
    const sectionObj = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID);
    this.planogram2dService.objectClicked(sectionObj, $event);
    this.planogramService.removeAllSelection(this.data.$sectionID);
    this.removeContextMenu();
    this.objectPropertyGrid(sectionObj, $event);
    $event.stopPropagation();
  }

  public openFixtureInfo($event: MouseEvent): void {
    const fixtureObj = this.sharedService.getObject(this.data.$idParent, this.data.$sectionID);
    this.planogram2dService.objectClicked(fixtureObj, $event);
    this.removeContextMenu();
    this.objectPropertyGrid(fixtureObj, $event);
    $event.stopPropagation();
  }

  public OnCappingClick(cappingType: string): void {
    const res = this.planogram2dService.doCapping(cappingType);
    res.subscribe();
    this.planogramService.updateNestedStyle.next(true);
    // Note : To show red color if fixture weight capacity is more than max weight capacity
    this.render2d.isDirty = true;
    this.removeContextMenu();
  }

  public checkPositionPasteStatus(): object {
    let style = {};
    const sectionID = this.sharedService.getActiveSectionId();
    if ((!(this.planogramService.rootFlags[this.sappClipBoardService.lastCopiedObjSectionId] || {}).isItemCopied
      && !this.planogramService.rootFlags[sectionID].isItemCopied && !this.planogramService.rootFlags[sectionID].isFixtureCopied) || this.planogramService.rootFlags[sectionID].isFixtureCopied) {
      style = {
        'cursor': "default",
        'background-color': "#CDCDCD",
        'color': 'black'
      }
    } else {
      style = {
      }
    }
    return style;
  }

  private removeContextMenu(): void {
    this.contextMenuService.removeContextMenu();
  }

  public openResourceMenu(): void {
    this.trigger.openMenu();
  }

  public closeResourceMenu(): void {
    if (this.trigger) {
      this.trigger.closeMenu();
    }
  }

}
