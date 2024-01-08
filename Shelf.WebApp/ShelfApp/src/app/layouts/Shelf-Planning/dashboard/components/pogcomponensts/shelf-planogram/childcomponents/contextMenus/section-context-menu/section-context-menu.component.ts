import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { Section } from 'src/app/shared/classes';
import {
  PropertyType,
  PogSideNaveView,
  Split,
  FixtureObjectResponse,
  SplitPreference
} from 'src/app/shared/models';
import { ContextModelComponent } from '../context-model/context-model.component';
import { PropertyGridComponent } from '../../property-grid/property-grid.component';
import {
  SharedService, PlanogramService, ClipBoardService, Render2dService,
  PlanogramHelperService, HistoryService, Planogram_2DService,
  UserPermissionsService, NotifyService, PogSideNavStateService, ContextMenuService, PlanogramStoreService, PlanogramCommonService, UprightService, AnnotationService,
} from 'src/app/shared/services';
import { TranslateService } from '@ngx-translate/core';
import { ConsoleLogService } from 'src/app/framework.module';
import { Context } from 'src/app/shared/classes/context';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';

@Component({
  selector: 'sp-section-context-menu',
  templateUrl: './section-context-menu.component.html',
  styleUrls: ['./section-context-menu.component.scss']
})
export class SectionContextMenuComponent implements OnChanges, OnDestroy {
  private subscriptions = new Subscription();
  @Input() data: Section;
  @Input() saveAsTemplatePermission: boolean;
  @Output() closeMenu: EventEmitter<void> = new EventEmitter();
  public annotationDis: boolean = true;
  public pogContainsAnnotation: boolean = false;
  public split: Split = {
    isMerge: false,
    noBays: false,
    width: 0
  };

  private get modularTemplate(): FixtureObjectResponse {
    return this.planogramStore.modularTemplate;
  }
  @ViewChild('templateSaveTrigger', { static: false }) templateSaveTrigger: MatMenuTrigger;
  @ViewChild('saveTemplateMenu', {static: false}) saveTemplateMenu:MatMenu;
  @ViewChild('annotationTrigger', { static: false }) annotationTrigger: MatMenuTrigger;
  @ViewChild('annotationMenu', {static: false}) annotationMenu:MatMenu;

  constructor(
    private readonly sharedService: SharedService,
    private readonly dialog: MatDialog,
    private readonly planogramService: PlanogramService,
    private readonly planogramHelper: PlanogramHelperService,
    private readonly sappClipBoardService: ClipBoardService,
    private readonly planogram2dService: Planogram_2DService,
    private readonly historyService: HistoryService,
    private readonly userPermissions: UserPermissionsService,
    private readonly notifyService: NotifyService,
    private readonly PogSideNavStateService: PogSideNavStateService,
    private readonly render2d: Render2dService,
    private contextMenuService: ContextMenuService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly translate: TranslateService,
    private readonly log: ConsoleLogService,
    private readonly cd: ChangeDetectorRef,
    private planogramCommonService: PlanogramCommonService,
    private uprightService: UprightService,
    private readonly annotationService: AnnotationService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    this.annotationDis = !this.planogramHelper.isPOGLive(this.data.$sectionID, true);
    this.saveAsTemplatePermission = this.userPermissions.hasCreatePermission('POGTEMPLATE');
    const selectedObj = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID) as Section;
    this.pogContainsAnnotation = selectedObj.annotations.length > 0?true:false;
  }
  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public resetBaysToUpright(event: MouseEvent): void {
    this.applySplitShelf(SplitPreference.resetBaysToUpright);
  };

  public applySplitShelf(splitPreference: number): void {
    //Get the details get the rootscope object
    //if bay is present take appropriate bay
    //clone it make it's id and id parent as null
    //add mixins of modulars
    //take the width of the bay and add it to the width of the planogram
    //add the location x to the bay
    //make all the shelfs id's and id parents null,
    //if positons are copying make those id and id parents null
    //location xs' of the all the shelfs should be changed

    const activeSectionID = this.sharedService.getActiveSectionId();
    if (this.planogramHelper.isPOGLive(activeSectionID, true) || this.sharedService.isNiciFeatureNotAllowed('SPLITSECTION')) {
      this.notifyService.warn('SPLITING_SECTION_CANT_BE_DONE');
      return;
    }
    const rootObject = this.sharedService.getObject(activeSectionID, activeSectionID) as  Section;
    this.uprightService.uprightObj = {
      uprightType: rootObject.uprightType,
      uprightValues: rootObject.Upright.split(',').map(num => Number(num))
    }
    //@Sagar: will remove the below commented code after testing
    // const minWidth = this.sharedService.measurementUnit == 'IMPERIAL' ? 2 : 5;
    // if (!this.split.width || this.split.width < minWidth) {
    //   this.notifyService.warn(`${this.translate.instant('THE_SPECIFIED_SPLIT_INTERVAL_IS_NOT_VALID')} ${minWidth}`, 'ok');
    //   return;
    // }

    if (this.split.width > rootObject.Dimension.Width) {
      this.notifyService.warn('THE_SPECIFIED_SPLIT_INTERVAL_IS_NOT_VALID_SECTION_WIDTH', 'ok');
      return;
    }

    if (parseFloat(rootObject.Upright) && Math.floor(Math.abs(parseFloat(rootObject.Upright) - this.uprightService.uprightObj.uprightValues[0])) !== 0) {
      this.notifyService.warn('UPRIGHT_MISMATCH_MESSAGE', 'ok');
      return;
    }

    this.modularTemplate.Fixture.IsMovable = true;
    this.modularTemplate.Fixture.IsMerchandisable = false;
    this.sharedService.splitChangePOGId.push(rootObject.IDPOG);
    this.log.info(String(this.sharedService.splitChangePOGId), '$rootthis.splitChangePOGId');
    rootObject.splitShelf(this.modularTemplate, splitPreference, this.split);
    const ctx = new Context(rootObject);
    rootObject.computeMerchHeight(ctx, { 'reassignFlag': null, 'recFlag': true });
    this.planogramService.updateSectionObjectIntoStore(rootObject.IDPOG, rootObject);
    this.planogramService.updateSectionFromTool.next(rootObject)
    this.render2d.isDirty = true,
    this.planogramService.updateNestedStyleDirty = true;;
    this.cd.detectChanges();
  }

  public objectPropertyGrid = (event: MouseEvent): void => {
    this.sharedService.fixtureTypeMultiple = false;
    this.planogram2dService.objectClicked(this.data, event);
    this.openGrid(event, false);
  };

  private openGrid(event: MouseEvent, multiple: boolean): void {
    //TODO perf update, update only if assort grid is dirty or remove completely on updating data source.
    if (this.PogSideNavStateService.propertiesView.isPinned && this.PogSideNavStateService.activeVeiw != PogSideNaveView.PROPERTYGRID) {
      this.sharedService.openSelectedComponentInSideNav.next({ activeScreen: 'PG', isPin: true });
    }
    //if property screen not pinned open pop up
    else if (!this.PogSideNavStateService.propertiesView.isPinned) {
      this.dialog.open(PropertyGridComponent, {
        height: 'fit-content',
        width: '55%',
        data: multiple,
        panelClass: 'mat-dialog-move-cursor',
        id: 'property-grid-dialog'
      });
      event.stopPropagation();
    } else {
      this.removeContextMenu();
      event.stopPropagation();
      return;
    }
    this.removeContextMenu();
  }


  public showSectionDetailCxt($event: MouseEvent): void {
    this.sharedService.fixtureTypeMultiple = true;
    this.planogram2dService.objectClicked(this.data, $event);
    this.openGrid($event, true);
  }

  public sectionSelectAll($event: MouseEvent): void {
    this.planogram2dService.objectClicked(this.data, $event);
    this.planogram2dService.selectAllPosition(this.data.$sectionID);
    this.planogramService.selectionEmit.next(true);
    this.planogramService.updateNestedStyleDirty = true;
    this.removeContextMenu();
  }

  public checkFixturePasteStatus(): boolean {
    if (this.sharedService.getActiveSectionId() !== '') {
      if (!this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isFixtureCopied) {
        return false;
      }
      else {
        return true;
      }
    }
  }

  public handleSectionFlip(): void {
    if (this.planogramHelper.isPOGLive(this.data.$sectionID, true)) {
      this.removeContextMenu();
      return;
    }
    const currObj = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID) as Section;
    const modulars = this.sharedService.getAllModulars(currObj);
    const unqHistoryID = this.historyService.startRecording();
    if (modulars.length) {
      this.planogramHelper.sectionFlipWithModulars(currObj);
    } else if (currObj.getAllStandardShelfs().length > 0 || currObj.getAllPegboards().length > 0 || currObj.getAllCrobars().length > 0 || currObj.getAllSlotwalls().length > 0) {
      this.planogramHelper.sectionFlipWithoutModulars(currObj);
    }
    this.sharedService.updateAnnotationPosition.next(true);
    this.render2d.isDirty = true,
    this.planogramService.updateNestedStyleDirty = true;;
    this.sharedService.gridReloadSubscription.next(true);
    this.planogramService.rootFlags[this.data.$sectionID].isSaveDirtyFlag = true;
    this.planogramService.updateSaveDirtyFlag(this.planogramService.rootFlags[this.data.$sectionID].isSaveDirtyFlag);
    this.removeContextMenu();
    this.historyService.stopRecording(undefined, undefined, unqHistoryID);
  }

  public addEditAnnotation($event: MouseEvent, type = 'section'): void {
    this.planogram2dService.objectClicked(this.data, $event);
    const isFreeFlow = type == 'freeFlow';
    this.annotationService.refreshAnnotationDialog(isFreeFlow, this.data);
    this.removeContextMenu();
  }

  public openCrunchMode(data: Section): void {
    this.dialog.open(ContextModelComponent, {
      height: 'auto',
      width: '300px',
      data: { data, property: PropertyType.SectionCrunchMode },
      panelClass: 'mat-dialog-move-cursor',
      autoFocus: false
    });
    this.removeContextMenu();
  }

  public pasteFixtureCxt($event: MouseEvent): boolean {
    this.planogram2dService.objectClicked(this.data, $event);
    if (!this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isFixtureCopied) {
      return false;
    } else {
      if (this.sappClipBoardService.showClipboardIfApplicable('Paste')) {
        this.sappClipBoardService.openDialog(true,"openInBottom");
        return false;
      }
    }
    this.planogramService.updateNestedStyleDirty = true;
    this.removeContextMenu();
  }

  public savePlanogramTemplate(event: MouseEvent, includeAnnotations?: boolean): void {
    event.stopPropagation();
    const selectedObj = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID) as Section;
    const currObj = this.planogramService.getCurrentObject(selectedObj.globalUniqueID);
    if (!this.planogramService.checkIfObjectDirty(currObj)) {
      this.subscriptions.add(this.planogramHelper.savePlanogramTemplate(this.data.$sectionID, includeAnnotations).subscribe(()=>{
        this.removeContextMenu();
        this.closeMenu.emit();
      }));
    } else {
      this.removeContextMenu();
      this.notifyService.success('SAVE_TEMP_DIRTY_CHECK', 'Ok')
    }
  }

  private removeContextMenu(): void{
    this.contextMenuService.removeContextMenu();
  }

  public openResourceMenu(menuType): void {
    if (menuType == 'saveTemplateMenu') {
      this.templateSaveTrigger.openMenu();
    }
    if (menuType == 'annotationMenu') {
      this.annotationTrigger.openMenu();
    }
  }
  public closeResourceMenu(): void {
    if (this.templateSaveTrigger) {
      this.templateSaveTrigger.closeMenu();
    }
    if (this.annotationTrigger) {
      this.annotationTrigger.closeMenu();
    }
  }
}
