import { Component, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ConsoleLogService } from 'src/app/framework.module';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { PropertyType, PogSideNaveView } from 'src/app/shared/models';
import { Modular, Crossbar, Section } from 'src/app/shared/classes'
import {
    SharedService, PlanogramService, ClipBoardService,
    PlanogramHelperService, Planogram_2DService, NotifyService,
    ParentApplicationService, PogSideNavStateService, Render2dService, ContextMenuService, AnnotationService
} from 'src/app/shared/services';
import { ContextModelComponent } from '../context-model/context-model.component';
import { PropertyGridComponent } from '../../property-grid/property-grid.component';
import { AnnotationDialogComponent } from '../../annotation/annotation-dialog/annotation-dialog.component';
import { CrunchModeFixtures, FixtureList,MerchandisableList,SelectableList } from 'src/app/shared/services/common/shared/shared.service';
import {MatMenuTrigger} from '@angular/material/menu';

@Component({
    selector: 'sp-fixture-context-menu',
    templateUrl: './fixture-context-menu.component.html',
    styleUrls: ['./fixture-context-menu.component.scss']
})
export class FixtureContextMenuComponent implements OnChanges, OnDestroy {
    @ViewChild(MatMenuTrigger, {static: false}) trigger: MatMenuTrigger;
    @Input() data: FixtureList|Modular;
    private subscriptions = new Subscription()
    public enablePaste: boolean = true;
    public enableCopy: boolean = true;
    public enableFlip: boolean = true;
    public enableCrunchMode: boolean = true;
    public enableClearAllPos: boolean = true;
    public enableCrossbar: boolean = true;
    public annotationDis: boolean = true;

    constructor(
        private readonly translate: TranslateService,
        private readonly dialog: MatDialog,
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly planogramService: PlanogramService,
        private readonly planogramHelper: PlanogramHelperService,
        private readonly planogram2dService: Planogram_2DService,
        private readonly sappClipBoardService: ClipBoardService,
        private readonly log: ConsoleLogService,
        private readonly notifyService: NotifyService, private readonly PogSideNavStateService: PogSideNavStateService,
        private readonly render2d: Render2dService,
        private contextMenuService: ContextMenuService,
        private readonly annotationService: AnnotationService,
    ) { }



    public ngOnChanges(): void {
        this.resetFlag();
        this.checkMenudisplay();
        this.annotationDis = !this.planogramHelper.isPOGLive(this.data.$sectionID, true);
    }

    private resetFlag(): void {
        this.enablePaste = true;
        this.enableCrunchMode = true;
        this.enableCrossbar = true;
        this.enableCopy = true;
        this.enableFlip = true;
        this.enableClearAllPos = true;
    }

    private checkMenudisplay(): void {
        const sectionID = this.sharedService.getActiveSectionId();
        const isNiciMode = this.parentApp.isNiciMode;
        let selectedObjPosList = [];
        if (isNiciMode) {
            const selectedObjsList: SelectableList[] = this.planogramService.getSelectedObject(sectionID);
            selectedObjsList.forEach((ele) => { selectedObjPosList.push(ele); });
        }
        const objectDerivedType = this.planogramService.getLastSelectedObjectDerivedType(sectionID);
        if (objectDerivedType === AppConstantSpace.MODULAR) {
            if (isNiciMode) {
                this.enablePaste = false;
                this.enableCopy = false;
            } else if (this.planogramService.rootFlags[sectionID].isFixtureCopied || (this.planogramService.rootFlags[this.sappClipBoardService.lastCopiedObjSectionId] || {}).isFixtureCopied) {
                this.enablePaste = true;
            } else {
                this.enablePaste = false;
            }
            this.enableFlip = !this.sharedService.isNiciFeatureNotAllowed('FLIP', selectedObjPosList);
            this.enableCrunchMode = false;
        }
        if (objectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
            if (isNiciMode) {
                this.enablePaste = false;
                this.enableCrunchMode = false;
                this.enableCrossbar = false;
                this.enableCopy = false;
            }
            if (this.sharedService.isNiciFeatureNotAllowed('FLIP', selectedObjPosList)) {
                this.enableFlip = false;
            } else if (isNiciMode) {
                this.enableFlip = true;
            }
        }
        if (objectDerivedType === AppConstantSpace.PEGBOARDOBJ ||
            objectDerivedType === AppConstantSpace.SLOTWALLOBJ ||
            objectDerivedType === AppConstantSpace.CROSSBAROBJ ||
            objectDerivedType === AppConstantSpace.BLOCK_FIXTURE) {
            this.enableCrunchMode = false;
            if (isNiciMode) {
                this.enablePaste = false;
            } else {
                this.enablePaste = this.planogramService.rootFlags[sectionID].isFixtureCopied || (this.planogramService.rootFlags[this.sappClipBoardService.lastCopiedObjSectionId] || {}).isFixtureCopied;
                if (objectDerivedType !== AppConstantSpace.BLOCK_FIXTURE) {
                    this.enablePaste = this.enablePaste || this.planogramService.rootFlags[this.data.$sectionID].isItemCopied || (this.planogramService.rootFlags[this.sappClipBoardService.lastCopiedObjSectionId] || {}).isItemCopied;
                }
            }
            if (objectDerivedType === AppConstantSpace.CROSSBAROBJ) {
                this.enableCrossbar = !this.sharedService.isNiciFeatureNotAllowed('CROSSBAR_CRUNCH', selectedObjPosList)
            } else {
                this.enableCrossbar = false;
            }
        } else {
            this.enableCrossbar = false;
        }
        if (objectDerivedType === AppConstantSpace.COFFINCASEOBJ ||
            objectDerivedType === AppConstantSpace.BASKETOBJ) {
            if (isNiciMode) {
                this.enablePaste = false;
            } else {
                this.enablePaste = this.planogramService.rootFlags[sectionID].isFixtureCopied || (this.planogramService.rootFlags[this.sappClipBoardService.lastCopiedObjSectionId] || {}).isFixtureCopied;
            }
        }
        if (objectDerivedType === AppConstantSpace.BLOCK_FIXTURE) {
            this.enableCrunchMode = false;
            this.enableFlip = false;
            this.enableClearAllPos = false;
            if (isNiciMode) {
                this.enablePaste = false;
            } else {
                this.enablePaste = this.planogramService.rootFlags[sectionID].isFixtureCopied || (this.planogramService.rootFlags[this.sappClipBoardService.lastCopiedObjSectionId] || {}).isFixtureCopied;
            }
        }
    }

    public openCrunchMode(data: CrunchModeFixtures, event: MouseEvent): void {
        this.planogram2dService.objectClicked(data, event);
        this.dialog.open(ContextModelComponent, {
            height: 'auto',
            width: '300px',
            data: { data, property: PropertyType.FixtureCrunchMode },
            panelClass: 'mat-dialog-move-cursor',
            autoFocus: false
        });
        this.removeContextMenu();
    }

    public clearPosition(event: MouseEvent): void {
        this.planogram2dService.objectClicked(this.data, event);
        this.selectAllPosition();
        this.delete();
        this.removeContextMenu();
    }

    private delete(): void {
        if (this.planogramHelper.isPOGLive(this.data.$sectionID, true)) {
            this.removeContextMenu();
            return;
        }
        const sectionObj = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID) as Section;
        this.planogramService.rootFlags[this.data.$sectionID].isActionPerformed++;
        if (this.planogramService.rootFlags[this.data.$sectionID].isModularView) {
          let object = this.planogramService.getSelectedObject(this.data.$sectionID)[0];
          if (Utils.checkIfBay(object)) {
            let lockFlag = object?._CalcField.Fixture.PositionDesc1;
            !lockFlag?.flag && this.planogram2dService.dismissBay(object);
          }
        }
        this.planogramHelper.deleteObject(sectionObj);
        this.planogramService.updateSectionObjectIntoStore(sectionObj.IDPOG, sectionObj);
        this.planogramService.updateSectionFromTool.next(sectionObj)
        this.planogramService.updateNestedStyleDirty = true;;
        this.removeContextMenu();
    }

    private selectAllPosition(): void {
        const objectDerivedType = this.sharedService.lastSelectedObjectDerivedType[this.data.$sectionID];
        if (objectDerivedType === AppConstantSpace.SECTIONOBJ || objectDerivedType === AppConstantSpace.POSITIONOBJECT) {
            this.planogramService.removeAllSelection(this.data.$sectionID);
            const rootObject = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID) as Section;
            const positions = rootObject.getAllPositions();
            positions.forEach(item => {
                if (item.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                    this.planogramService.addToSelectionByObject(item, this.data.$sectionID);
                }
            });
        }
        if (objectDerivedType === AppConstantSpace.STANDARDSHELFOBJ ||
            objectDerivedType === AppConstantSpace.PEGBOARDOBJ ||
            objectDerivedType === AppConstantSpace.CROSSBAROBJ ||
            objectDerivedType === AppConstantSpace.SLOTWALLOBJ ||
            objectDerivedType === AppConstantSpace.MODULAR ||
            objectDerivedType === AppConstantSpace.COFFINCASEOBJ ||
            objectDerivedType === AppConstantSpace.BASKETOBJ) {
            const selectedFixtureIdArr = this.planogramService.getSelectedId(this.data.$sectionID);
            this.planogramService.removeAllSelection(this.data.$sectionID);
            for (const selFixId of selectedFixtureIdArr) {
                const standardShelf = this.sharedService.getObject(selFixId, this.data.$sectionID) as MerchandisableList;
                const positions = standardShelf.getAllPosition();
                positions.forEach(item => {
                    if (item.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                        this.planogramService.addToSelectionByObject(item, this.data.$sectionID);
                    }
                });
            }
        }
    }

    public flipFixturecxt($event: MouseEvent): void {
        this.planogram2dService.objectClicked(this.data, $event);
        const sectionObj = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID) as Section;
        this.planogram2dService.doFlip(sectionObj);
        this.planogramService.updateNestedStyleDirty = true;;
        this.removeContextMenu();
    }

    public openSectionInfo($event: MouseEvent) {
        const sectionObj = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID);
        this.planogram2dService.objectClicked(sectionObj, $event);
        this.planogramService.removeAllSelection(this.data.$sectionID);
        this.removeContextMenu();
        this.objectPropertyGrid($event);
    }

    public copyFixtureCxt($event): void {
        this.planogram2dService.objectClicked(this.data, $event);
        this.planogram2dService.copyObjects('Copy', this.data.$sectionID);
        this.removeContextMenu();
        if(!this.dialog.openDialogs.length){
            if (this.sappClipBoardService.showClipboardIfApplicable('Copy')) {
                this.sharedService.changeInGridHeight.next(false);
                this.sappClipBoardService.openDialog(false,"collapse");
            }
        }
    }

    public pasteFixtureCxt($event): void {
        this.planogram2dService.objectClicked(this.data, $event);
        this.removeContextMenu();
        if ((!this.planogramService.rootFlags[this.data.$sectionID].isItemCopied && !this.planogramService.rootFlags[this.data.$sectionID].isFixtureCopied && !(this.planogramService.rootFlags[this.sappClipBoardService.lastCopiedObjSectionId] || {}).isItemCopied && !(this.planogramService.rootFlags[this.sappClipBoardService.lastCopiedObjSectionId] || {}).isFixtureCopied) || !this.enablePaste) {
            return;
        } else if (this.sappClipBoardService.showClipboardIfApplicable('Paste')) {
            this.sharedService.changeInGridHeight.next(true);
            this.sappClipBoardService.openDialog(true,"openInBottom");
            return;
        }
        this.planogram2dService.pasteObjects(this.data.$sectionID);
        this.planogramService.rootFlags[this.data.$sectionID].isActionPerformed++;
        const sectionObj = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID);
        this.planogramService.UpdatedSectionObject.next(sectionObj);
        this.render2d.isDirty = true,
        this.planogramService.updateNestedStyleDirty = true;;
    }

    public objectPropertyGrid($event: MouseEvent): void {
        this.sharedService.fixtureTypeMultiple = false;
        if (this.PogSideNavStateService.propertiesView.isPinned && this.PogSideNavStateService.activeVeiw != PogSideNaveView.PROPERTYGRID) {
            this.sharedService.openSelectedComponentInSideNav.next({ activeScreen: 'PG', isPin: true });
        } else if (!this.PogSideNavStateService.propertiesView.isPinned) {
            const dialogRef = this.dialog.open(PropertyGridComponent, {
                height: 'fit-content',
                width: '55%',
                panelClass: 'mat-dialog-move-cursor',
                id: 'property-grid-dialog'
            });
            dialogRef.afterClosed().subscribe(result => {
                this.log.info(`Dialog result: ${result}`);
            });
            $event.stopPropagation();
        } else {
            this.removeContextMenu();
            $event.stopPropagation();
            return;
        }
        this.removeContextMenu();
    }

    public deleteFixtureCxt($event: MouseEvent): void {
        if (this.parentApp.isNiciMode) {
            this.removeContextMenu();
            this.notifyService.warn('Operation can"t be done in NICI mode');
            return;
        } else {
            this.planogram2dService.objectClicked(this.data, $event);
            this.delete();
            this.sharedService.deleteSubscription.next([this.data]);
        }
        this.removeContextMenu();
    }

    public addEditAnnotation($event: MouseEvent): void {
        this.planogram2dService.objectClicked(this.data, $event);
        this.annotationService.refreshAnnotationDialog(false, this.data);
        this.removeContextMenu();
    }

    public crossbarPositionChange(event: MouseEvent, id: string, notifyMsg: string): void {
        event.stopPropagation();
        const selectedObj = this.planogramService.getSelectedObject(this.sharedService.getActiveSectionId()) as Crossbar[];
        const lastSelectedObj = selectedObj[selectedObj.length - 1];
        this.subscriptions.add(this.planogramService.doCrossbarPackNSpread(lastSelectedObj.prepareSpreadNPackData(), id).subscribe((res) => {
            lastSelectedObj.applySpreadNPackData(res)
            this.render2d.isDirty = true;
            this.planogramService.updateNestedStyleDirty = true;
            this.removeContextMenu();
        }, (error) => {
            this.notifyService.error(`${this.translate.instant('CROSSBAR_ERROR')} ${this.translate.instant(notifyMsg)}`);
            this.log.error(`${this.translate.instant('CROSSBAR_ERROR')} ${this.translate.instant(notifyMsg)}`);
            this.removeContextMenu();
        }));

    }

    public ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    private removeContextMenu(): void{
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
