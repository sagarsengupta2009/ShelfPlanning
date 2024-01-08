import { Component, Inject, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Utils } from 'src/app/shared/constants/utils';
import { range } from 'lodash-es';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { LookUpChildOptions, OrientationsObject, PropertyObject } from 'src/app/shared/models';
import { PaneltoolsComponent } from '../../paneltools/paneltools.component';
import { ConsoleLogService } from 'src/app/framework.module';
import { Orientation, Position, Section } from 'src/app/shared/classes'
import { SharedService, PlanogramService, AllocateService, PlanogramStoreService, PanelService, Planogram_2DService, CrunchModeService, CrunchMode, Render2dService, ClipBoardService, HistoryService, PlanogramHelperService, NotifyService } from 'src/app/shared/services';
import { OrientationService } from 'src/app/shared/services/layouts/space-automation/dashboard/shelf-planogram/3d-planogram/orientation.service';

//Not exporting, as this interface is added for code readability & it is not used outside this file
interface PositionOrFixtureProperty {
  facings: number;
  orientation: number;
  crunchMode: CrunchMode,
}
@Component({
  selector: 'app-panel-context-menu',
  templateUrl: './panel-context-menu.component.html',
  styleUrls: ['./panel-context-menu.component.scss']
})
export class PanelContextMenuComponent implements OnInit {
  @ViewChild('FacingDialog') FacingDialog: TemplateRef<any>;
  @ViewChild('OrientationDialog') OrientationDialog: TemplateRef<any>;
  @ViewChild('CrunchsDialog') CrunchsDialog: TemplateRef<any>;
  @Input() panelID: string;
  @Input() displayView: string;
  public objectType: string = '';
  public componentInPanel: number;
  public facingOptions: number[] = [];
  public data: Section;
  public changesToAllObject: PositionOrFixtureProperty = {
    facings: null,
    orientation: null,
    crunchMode: null
  }
  public undoFrontCapping: boolean = false;
  public undoDepthCapping: boolean = false;
  public undoFront_DepthCapping: boolean = false;
  public orientationsObject: OrientationsObject = {orientationsGroups:[], orientationsList:[]};
  public allOrientations = this.planogramStore.allOrientationGroups;
  public allowedOrientations:  number[];
  public orientationIconFile: string;
  public orientationImageFilePath: string;
  public showIcon: boolean = false;
  public sameProductDefaultOrientation: number;
  public orientationValues = Object.values(AppConstantSpace.ORIENTATION);
  public orientationKeys = Object.keys(AppConstantSpace.ORIENTATION);
  public keyToCompare = Object.keys(AppConstantSpace.ORIENTATION_VIEW);
  private orientation = new Orientation();
  public rotateImg: string = '0deg';
  public fixtureType: string;
  private sameProduct: boolean = false;
  private errorIndex: string[] = [];
  public imageNotAvailablePath = this.planogramHelper.deploymentPath + '/assets/icons/imageNotAvailable.png';
  constructor(private readonly translate: TranslateService,
    private readonly planogramService: PlanogramService,
    private readonly dialog: MatDialog,
    private readonly sharedService: SharedService,
    private readonly planogram2dService: Planogram_2DService,
    private readonly panelService: PanelService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly allocateService: AllocateService,
    private readonly log: ConsoleLogService,
    public crunchMode: CrunchModeService,
    private readonly render2d: Render2dService,
    private readonly sappClipBoardService: ClipBoardService,
    private readonly historyService: HistoryService,
    private readonly planogramHelper: PlanogramHelperService,
    private readonly notifyService: NotifyService,
    private readonly orientationService: OrientationService
  ) {
  }

  public ngOnInit(): void {
    this.data = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
    this.facingOptions = this.getFacingRangeCxt();
    this.orientationMenu();
    this.initPanelContextMenu();
  }

  private getFacingRangeCxt(): number[] {
    let min: number = 1;
    let max: number = 8;
    return range(min, max + 1);
  }

  private initPanelContextMenu(): boolean {
    let sectionID: string;
    const panelRunningObj = this.panelService.panelPointer[this.panelID];
    this.componentInPanel = panelRunningObj['componentID'];
    const guid = this.panelService.panelPointer[this.panelID]['globalUniqueID'];
    if (guid === '') return false;
    const currObj = this.planogramService.getCurrentObject(guid);
    const pog = this.planogramStore.getPogById(currObj.IDPOG);
    if (pog) {
      sectionID = pog.sectionID;
    }
    this.objectType = this.planogramService.getLastSelectedObjectType(sectionID);
    this.initializeValues();
  };

  private initializeValues() {
    const selectedObjsList = this.planogramService.getSelectedObject(this.sharedService.activeSectionID);
    const positionIDDictionaries = [
      { IDDictionary: 416, field: 'Position.IDOrientation' },
      { IDDictionary: 394, field: 'Position.FacingsX' }];
    if (this.objectType == AppConstantSpace.POSITIONOBJECT) {
      this.sameProduct = this.planogramService.isSameProduct(selectedObjsList as Position[]);
      if(this.sameProduct){
        this.sameProductDefaultOrientation = (selectedObjsList[0] as Position).getDefaultOrientation();
      }
    }
    positionIDDictionaries.map(element => {
      let newValue = null;
      let value: any = this.sharedService.getObjectField(undefined, element.field, undefined, selectedObjsList[0]);
      for (const positionItem of selectedObjsList) {
        newValue = this.sharedService.getObjectField(undefined, element.field, undefined, positionItem);
        if (value != newValue) {
          value = null;
          break;
        }
        value = newValue;
      }
      element.field === 'Position.IDOrientation' ? this.changesToAllObject.orientation = value : this.changesToAllObject.facings = value;
    });
  }

  private orientationMenu(): void {
    this.orientationService.setOrientationImages();
    const selectedObjsList = this.planogramService.getSelectedObject(this.sharedService.activeSectionID);
    this.orientationsObject = this.planogramService.getAvailableOrientations(selectedObjsList as Position[]);
    this.allowedOrientations = this.orientationsObject.orientationsList.map(item=>item.value);
    this.changeFilePath(this.orientationsObject.orientationsList.find(ori => ori.value == this.changesToAllObject.orientation));
  }

  public enableUnitCapping(): boolean {
    const sectionID = this.sharedService.getActiveSectionId();
    return this.planogramService.getSelectedPosition(sectionID).every((posObj) => {
      const pkgStyle = posObj?.Position?.ProductPackage.IdPackageStyle;;
      const mechStyle = posObj?.Position?.IDMerchStyle;
      return ((pkgStyle === AppConstantSpace.PKGSTYLE_TRAY) && (mechStyle != AppConstantSpace.MERCH_ADVANCED_TRAY));
    });
  }

  public enableAdvancedCapping(): boolean {
    const sectionID = this.sharedService.getActiveSectionId();
    return this.planogramService.getSelectedPosition(sectionID).every((posObj) => {
      const pkgStyle = posObj?.Position?.ProductPackage.IdPackageStyle;;
      const mechStyle = posObj?.Position?.IDMerchStyle;
      return ((pkgStyle === AppConstantSpace.PKGSTYLE_TRAY) && (mechStyle === AppConstantSpace.MERCH_ADVANCED_TRAY));
    });
  }

  public canUnitCapping(): boolean {
    const sectionID = this.sharedService.getActiveSectionId();
    const positionObjs = this.planogramService.getSelectedPosition(sectionID);
    return positionObjs.every((posObj) => {
      const pkgStyle = posObj?.Position?.ProductPackage.IdPackageStyle;
      return ((pkgStyle === 1 || pkgStyle === 2) && (!posObj.hasAboveItem && !posObj.hasBackItem));
    });
  }

  public canAdvancedCapping(): boolean {
    const sectionID = this.sharedService.getActiveSectionId();
    const positionObjs = this.planogramService.getSelectedPosition(sectionID);
    this.undoFrontCapping = positionObjs.every((frontCap) => {
      if (frontCap.Position.UnitCapping === null) {
        frontCap.Position.UnitCapping = 0;
      }
      return (frontCap.Position.UnitCapping == AppConstantSpace.FRONTCAPPING);
    });

    this.undoDepthCapping = positionObjs.every((depthCap) => {
      return (depthCap.Position.UnitCapping == AppConstantSpace.DEPTHCAPPING);
    });

    this.undoFront_DepthCapping = positionObjs.every((bothCap) => {
      return (bothCap.Position.UnitCapping == AppConstantSpace.FRONT_DEPTHCAPPING);
    });

    return positionObjs.every((posObj) => {
      const pkgStyle = posObj?.Position?.ProductPackage.IdPackageStyle;
      const mechStyle = posObj?.Position?.IDMerchStyle;
      return ((pkgStyle === AppConstantSpace.PKGSTYLE_TRAY) && (mechStyle == AppConstantSpace.MERCH_ADVANCED_TRAY));
    });
  }

  public canRemoveUnitCapping(): boolean {
    const sectionID = this.sharedService.getActiveSectionId();
    const positionObjs = this.planogramService.getSelectedPosition(sectionID);
    return positionObjs.every((posObj) => {
      const pkgStyle = posObj?.Position?.ProductPackage.IdPackageStyle;
      return ((pkgStyle === AppConstantSpace.PKGSTYLE_TRAY) && posObj.hasAboveItem);
    });
  }

  public cappingFronts(): void {
    const res = this.planogram2dService.doCapping('unit-capping-fronts');
    res?.subscribe();
    this.planogramService.updateNestedStyleDirty = true;
  }

  public cappingLayovers(): void {
    const res = this.planogram2dService.doCapping('unit-capping-layovers');
    res?.subscribe();
    this.planogramService.updateNestedStyleDirty = true;
  }

  public cappingRemove(): void {
    const res = this.planogram2dService.doCapping('unit-capping-remove');
    res?.subscribe();
    this.planogramService.updateNestedStyleDirty = true;
  }

  public applyAdvancedCapping(cappingType: string): void {
    const res = this.planogram2dService.doCapping(cappingType);
    res?.subscribe();
    this.planogramService.updateNestedStyleDirty = true;
  }

  public canRemoveAdvancedCapping(): boolean {
    const sectionID = this.sharedService.getActiveSectionId();
    const positionObjs = this.planogramService.getSelectedPosition(sectionID);
    let cappingValue = 0;
    positionObjs.every((frontCap) => {
      if (frontCap.Position.UnitCapping == AppConstantSpace.FRONTCAPPING) {
        return cappingValue = AppConstantSpace.FRONTCAPPING;
      }
    });

    positionObjs.every((depthCap) => {
      if (depthCap.Position.UnitCapping == AppConstantSpace.FRONT_DEPTHCAPPING) {
        return cappingValue = AppConstantSpace.FRONT_DEPTHCAPPING;
      }
    });

    positionObjs.every((frontDepthCap) => {
      if (frontDepthCap.Position.UnitCapping == AppConstantSpace.DEPTHCAPPING) {
        return cappingValue = AppConstantSpace.DEPTHCAPPING;
      }
    });

    if (cappingValue != 0) {
      return positionObjs.every((posObj) => {
        const pkgStyle = posObj?.Position?.ProductPackage.IdPackageStyle;
        return ((pkgStyle === AppConstantSpace.PKGSTYLE_TRAY) && posObj.Position.UnitCapping == cappingValue);
      });
    }
    else {
      return false;
    }
  }

  public removeAdvancedCapping(): void {
    const res = this.planogram2dService.doCapping('remove-advanced-capping');
    res?.subscribe();
    this.planogramService.updateNestedStyleDirty = true;
  }

  public alignPegsOrCoffins(action: string): void {
    if (this.fixtureType == AppConstantSpace.PEGBOARDOBJ || this.fixtureType == AppConstantSpace.SLOTWALLOBJ) {
      this.planogram2dService.doPegAlign(action);
    }
    else if (this.fixtureType == AppConstantSpace.COFFINCASEOBJ || this.fixtureType == AppConstantSpace.BASKETOBJ) {
      this.planogram2dService.doCoffinAlign(action);
    }
  }

  public enableAlignPegsOrCoffins(): boolean {
    const sectionID = this.sharedService.getActiveSectionId();
    let positionObjs = this.planogramService.getSelectedObject(sectionID);
    let fixtureCrunchMode: number;
    let enabledFixtures: string[];
    enabledFixtures = [
      AppConstantSpace.SLOTWALLOBJ,
      AppConstantSpace.COFFINCASEOBJ,
      AppConstantSpace.PEGBOARDOBJ,
      AppConstantSpace.BASKETOBJ
    ]
    positionObjs = positionObjs.filter(p => {
      let type = this.sharedService.getObject(p.$idParent, p.$sectionID)?.ObjectDerivedType;
      fixtureCrunchMode = this.sharedService.getObject(p.$idParent, p.$sectionID)?.Fixture.LKCrunchMode;
      this.fixtureType = type;
      return type === AppConstantSpace.COFFINCASEOBJ || type === AppConstantSpace.SLOTWALLOBJ || type === AppConstantSpace.PEGBOARDOBJ || type === AppConstantSpace.BASKETOBJ;
    });
    if (this.fixtureType == AppConstantSpace.PEGBOARDOBJ || this.fixtureType == AppConstantSpace.SLOTWALLOBJ) {
      if (positionObjs.length < 2) { return false; }
    }
    else if (this.fixtureType == AppConstantSpace.COFFINCASEOBJ || this.fixtureType == AppConstantSpace.BASKETOBJ) {
      if (positionObjs.length < 2 || fixtureCrunchMode != CrunchMode.NoCrunch) { return false; }
    } else if (!enabledFixtures.includes(this.fixtureType)) {
      return false;
    }
    return true;
  }

  public saveFacingCxt(): void {
    if (!Utils.isNullOrEmpty(this.changesToAllObject.facings)) {
      this.planogram2dService.increaseFacing(this.changesToAllObject.facings, this.data);
      this.render2d.isDirty = true,
        this.planogramService.updateNestedStyleDirty = true;
      this.sharedService.sectionStyleSub.next(true);
    }
  }

  public saveOrientationCxt(): void {
    if (!Utils.isNullOrEmpty(this.changesToAllObject.orientation)) {
      const orientationValue: number = (this.changesToAllObject.orientation === -1) ? null : this.changesToAllObject.orientation;
      this.planogram2dService.changeOrientation(orientationValue, this.data, 'setSelected');
      this.render2d.isDirty = true,
      this.planogramService.updateNestedStyleDirty = true;
    }
  }

  //Multiple select positions  cut
  public multiPosSelectCut(event: MouseEvent): void {
    this.planogram2dService.copyObjects('Cut', this.data.$sectionID);
  }

  //Multiple select positions  cut
  public multiPosSelectCopy(event: MouseEvent): void {
    this.planogram2dService.copyObjects('Copy', this.data.$sectionID);
    if (!this.dialog.openDialogs.length) {
      if (this.sappClipBoardService.showClipboardIfApplicable('Copy')) {
        this.sharedService.changeInGridHeight.next(false);
        this.sappClipBoardService.openDialog(false, "collapse");
      }
    }
  }

  //Multiple positoins select  Flip
  public multiPosSelectFlip(): void {
    this.planogram2dService.doFlip(this.data);
  }

  public saveCrunchCxt(event: MouseEvent): void {
    if (!Utils.isNullOrEmpty(this.changesToAllObject.crunchMode)) {
      this.planogram2dService.changeCrunchMode(this.changesToAllObject.crunchMode);
      this.render2d.isDirty = true,
        setTimeout(() => {
          this.planogramService.updateNestedStyleDirty = true;
        }, 0);
    }
  }

  public multiFixSelectFlip(): void {
    this.planogram2dService.doFlip(this.data);
    this.planogramService.updateNestedStyleDirty = true;
  }

  public multiFixSelectPosClear(): void {
    this.planogram2dService.selectAllPosition(this.data.$sectionID);
    this.planogram2dService.delete();
    this.planogramService.updateNestedStyleDirty = true;
  }

  public multiPosSelectDelete(): void {
    this.planogram2dService.delete();
    this.planogramService.updateNestedStyleDirty = true;
  }

  public isVisibleFixtureAlignIcon(type: string): boolean {
    const panelRunningObj = this.panelService.panelPointer[this.panelID];
    if (panelRunningObj['globalUniqueID'] === '') return false;
    const currObj = this.planogramService.getCurrentObject(panelRunningObj['globalUniqueID']);
    if ((panelRunningObj['componentID'] === 1) && currObj.isLoaded) {
      const sectionID = panelRunningObj['sectionID'];
      const selectedCount = this.planogramService.getSelectionCount(sectionID);
      if (type === 'crunch') {
        let selectedType = this.planogramService.getLastSelectedObjectDerivedType(sectionID);
        if (selectedType != AppConstantSpace.PEGBOARDOBJ && selectedType != AppConstantSpace.SLOTWALLOBJ && selectedType != AppConstantSpace.CROSSBAROBJ && selectedCount > 1) {
          return false;
        }
        return true;
      } else if (this.planogramService.getLastSelectedObjectDerivedType(sectionID) === AppConstantSpace.STANDARDSHELFOBJ && selectedCount > 1) {
        return true;
      }
    }
    return false;
  }

  public multiFixtureAllignToLeft(): void {
    this.planogram2dService.multiFixtureAllignToLeft(this.data);
    this.planogramService.updateNestedStyleDirty = true;
    this.sharedService.renderDividersAgainEvent.next(true);
  }

  public updatePanel(): void {
    this.panelService.updatePanel(this.panelID, this.data.$sectionID)
    this.planogramService.setSelectedIDPOGPanelID(this.panelID);
  }

  public toolsClickHandler(): void {
    this.allocateService.resizeParentWindow(true);
    this.sharedService.iSHELF.showDirective.panelID = this.panelID;
    const dialogRef = this.dialog.open(PaneltoolsComponent, {
      height: '85%',
      width: '55%',
      data: '',
    });
    dialogRef.afterClosed().subscribe(result => {
      this.allocateService.resizeParentWindow(false);
    });
    this.showToolBar();
  }

  public triggerUndo(): void {
    this.planogram2dService.doUndo();
  }

  public isUndoVisible(): boolean {
    if (this.historyService.historyStack && Object.keys(this.historyService.historyStack).length && this.panelService.view !== '3D') {
      return (
        this.historyService.historyStack[this.sharedService.activeSectionID] &&
        this.historyService.historyStack[this.sharedService.activeSectionID].length
      );
    }
    return false;
  }

  public isRedoVisible(): boolean {
    if (this.historyService.undoStack && Object.keys(this.historyService.undoStack).length && this.panelService.view !== '3D') {
      return (
        this.historyService.undoStack[this.sharedService.activeSectionID] &&
        this.historyService.undoStack[this.sharedService.activeSectionID].length
      );
    }
    return false;
  }

  public triggerRedo(): void {
    this.planogram2dService.doRedo();
  }

  public openFacingsDialog(): void {
    this.initializeValues();
    this.allocateService.resizeParentWindow(true);
    const dialogRef = this.dialog.open(this.FacingDialog, {
      height: 'auto',
      width: '300px',
      panelClass: 'mat-dialog-move-cursor',
    });
    dialogRef.afterClosed().subscribe(result => {
      this.allocateService.resizeParentWindow(false);
    })
    this.showToolBar();
  }

  public openOrientationDialog(): void {
    this.initializeValues();
    this.orientationMenu();
    this.allocateService.resizeParentWindow(true);
    const dialogRef = this.dialog.open(this.OrientationDialog, {
      height: 'auto',
      width: '560px',
    });
    dialogRef.afterClosed().subscribe(result => {
      this.allocateService.resizeParentWindow(false);
    })
    this.showToolBar();
    if (this.changesToAllObject.orientation) {
      setTimeout(() => {
        const orientationElSelected = document.getElementById(this.changesToAllObject.orientation.toString());
        orientationElSelected && this.sharedService.scrollToNext(this.changesToAllObject.orientation);
      });
    }
  }

  public openCrunchMode(): void {
    const sectionID = this.sharedService.getActiveSectionId();
    const selectedObjectList = this.planogramService.getSelectedObject(sectionID);
    this.crunchMode.getCrunchModeMenu(selectedObjectList[selectedObjectList.length - 1].ObjectDerivedType, this.data._IsSpanAcrossShelf.FlagData);
    const dialogRef = this.dialog.open(this.CrunchsDialog, {
      height: 'auto',
      width: '300px',
    });
    dialogRef.afterClosed().subscribe(result => {
      // Note: If the user clicks outside the dialog or presses the escape key, there'll be no result
      if (result !== undefined) {
        if (result === 'yes') {
          // TODO: Replace the following line with your code.
          this.log.info('User clicked yes.');
        } else if (result === 'no') {
          // TODO: Replace the following line with your code.
          this.log.info('User clicked no.');
        }
      }
    })
    this.showToolBar();
  }

  public trackByFn(index: number, item: LookUpChildOptions): number {
    return item.value;
  }

  public trackFacings(index: number): number {
    return index;
  }

  private showToolBar(): void {
    if (!this.planogramStore.appSettings.dockToolbar) {
      this.sharedService.mouseoverDockToolbar(false);
    }
  }

  public changeOrientationCxt(orientation: LookUpChildOptions): void {
    this.changesToAllObject.orientation = orientation?.value;
    this.changeFilePath(orientation);
  }

  public switchToNextPreviousOrientation(action: string, event:MouseEvent) {
    let stopExecution = false;
    if (action === 'prev') {
      this.orientationsObject.orientationsGroups.forEach((ele, index) => {
        if (!stopExecution) {
          const currentIndex = ele.findIndex(ori => ori.value === this.changesToAllObject.orientation);
          if (currentIndex > 0 && currentIndex != -1) {
            this.changesToAllObject.orientation  = ele[currentIndex - 1].value;
            this.changeFilePath(ele[currentIndex - 1]);
            this.sharedService.scrollToNext(ele[currentIndex - 1].value);
            stopExecution = true;
          } else if (index > 0 && currentIndex != -1) {
            const prevGroup = this.orientationsObject.orientationsGroups[index - 1];
            this.changesToAllObject.orientation  = prevGroup[prevGroup.length - 1].value;
            this.changeFilePath(prevGroup[prevGroup.length - 1]);
            stopExecution = true;
          }
        }
      });
    } else {
      this.orientationsObject.orientationsGroups.forEach((ele, index) => {
        if (!stopExecution) {
          const currentIndex = ele.findIndex(ori => ori.value === this.changesToAllObject.orientation);
          if (currentIndex < ele.length - 1 && currentIndex != -1) {
            this.changesToAllObject.orientation  = ele[currentIndex + 1].value;
            this.changeFilePath(ele[currentIndex + 1]);
            this.sharedService.scrollToNext(ele[currentIndex + 1].value);
            stopExecution = true;
          } else if (index < this.orientationsObject.orientationsGroups.length - 1 && currentIndex != -1) {
            const currGroup = this.orientationsObject.orientationsGroups[index + 1];
            this.changesToAllObject.orientation  = currGroup[0].value;
            this.changeFilePath(currGroup[0]);
            stopExecution = true;
          }
        }
      });
    }
    event.stopPropagation();
    event.preventDefault();
  }

  public changeFilePath(orientation: LookUpChildOptions, insertIntoErrorIndex?: boolean): void {
    if ((!orientation || (!orientation?.value && orientation?.value != 0)) && !(this.changesToAllObject.orientation || this.changesToAllObject.orientation == 0)) {
      this.orientationIconFile = '';
      this.orientationImageFilePath = '';
      return;
    }
    let orientationValue = !orientation ? this.changesToAllObject.orientation : orientation.value;
    const orientationKey = this.orientationKeys[this.orientationValues.indexOf(orientationValue)];
    const index = this.keyToCompare.find(k => orientationKey.indexOf(k) === 0).toLowerCase();

    if (insertIntoErrorIndex) {
      this.errorIndex.push(index);
    }

    const selectedObjsList = this.planogramService.getSelectedObject(this.sharedService.activeSectionID);
    if (this.sameProduct && selectedObjsList[0].Position.ProductPackage.Images[index] && !this.errorIndex.includes(index)) {
      this.showIcon = false;
      const faceAndRotation = this.orientation.GetImageFaceAndRotation(orientationValue, false, this.orientation.View.Front);
      this.rotateImg = faceAndRotation.Rotation + 'deg';
      this.orientationImageFilePath = selectedObjsList[0].Position.ProductPackage.Images[index];
    } else {
      this.rotateImg = '0deg';
      this.showIcon = true;
      this.orientationIconFile = this.orientationService.getOrientationImage(orientation.text, orientationKey);
    }    
  }

  public handleImageError() {
    const orientation = this.orientationsObject.orientationsList.find(ori => ori.value == this.changesToAllObject.orientation);
    this.changeFilePath(orientation, true);
  }

  // method to set default orientation to all selected positions
  public setDefaultOrientation(): void {
    const sectionID = this.sharedService.getActiveSectionId();
    if (this.planogramHelper.isPOGLive(sectionID, true)) {
      this.dialog.closeAll();
      return;
    }
    //setting default orientation as front Bottom in case of getting null default orientation
    this.planogram2dService.changeOrientation(AppConstantSpace.ORIENTATION.FRONTBOTTOM, this.data, 'setDefault');
    this.render2d.isDirty = true,
    this.planogramService.updateNestedStyleDirty = true;
    this.notifyService.success('DEFAULT_OREINTATION_APPLIED_ALL_SELECTED_POSITIONS', 'GOT_IT');
    this.dialog.closeAll();
  }
}
