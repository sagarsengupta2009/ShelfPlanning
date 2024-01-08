import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    ViewChild,
    EventEmitter,
    Output,
    OnInit,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { fromEvent, Observable, Subject, Subscription } from 'rxjs';
import { map } from 'rxjs/internal/operators/map';
import { ConsoleLogService } from 'src/app/framework.module';
import { Section } from 'src/app/shared/classes';
import { AppConstantSpace } from 'src/app/shared/constants';
import { Planograms, PogSideNaveView, modifierKeyboardEvent, PanelIds, PogActionTypes } from 'src/app/shared/models';
import {
    SharedService,
    AllocateService,
    BlockEditorComponent,
    BlockHelperService,
    PanelService,
    PlanogramService,
    Planogram_2DService,
    PogSideNavStateService,
    ParentApplicationService,
    NotifyService,
    PlanogramHelperService,
    PlanogramStoreService,
    ThreedPlanogramService,
    ContextMenuService,
    HistoryService,
    UserPermissionsService,
    PlanogramLoaderService,
    PlanogramLibraryService,
    MoveService,
} from 'src/app/shared/services';
import { OnlineOfflineService } from 'src/app/shared/services/common/onlineoffline/online-offline.service';
import { SelectableList } from 'src/app/shared/services/common/shared/shared.service';
import { PropertyGridComponent } from '../../../../childcomponents';

declare const window: any;
@Component({
    selector: 'shelf-panel-body',
    templateUrl: './panel-body.component.html',
    styleUrls: ['./panel-body.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelBodyComponent implements OnInit {
    @Input() displayView: string;
    @Input() panelID: string;
    @Input() selectedPogObject: string;
    @Input() sectionObject: Planograms;
    @Input() isPogDownloaded: boolean;
    @Output() closeStore = new EventEmitter();
    @ViewChild(MatMenuTrigger)
    public sectionContextMenu: MatMenuTrigger;
    public contextMenuPosition = { x: '0px', y: '0px' }
    private subscription: Subscription = new Subscription();
    private preventSimpleClick: boolean;
    private timer: any;
    public contextMenuData: SelectableList;
    public sectionSelected: Subject<boolean> = new Subject();
    private menuClosedSubscription: Subscription = new Subscription();
    private menuCloseEvTrigger: boolean = false;
    constructor(
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly cd: ChangeDetectorRef,
        private readonly planogram2DService: Planogram_2DService,
        private readonly dialog: MatDialog,
        public readonly planogramService: PlanogramService,
        public readonly panelService: PanelService,
        private readonly blockHelperService: BlockHelperService,
        private readonly allocateService: AllocateService,
        private readonly PogSideNavStateService: PogSideNavStateService,
        private readonly notifyService: NotifyService,
        private readonly planogramHelperService: PlanogramHelperService,
        private readonly planogramStoreService : PlanogramStoreService,
        private readonly threedPlanogramService: ThreedPlanogramService,
        private readonly historyService: HistoryService,
        private readonly userPermissions: UserPermissionsService,
        private readonly planogramLoaderService: PlanogramLoaderService,
        private readonly planogramLibraryService: PlanogramLibraryService,
        private readonly log: ConsoleLogService,
        private contextMenuService: ContextMenuService,
        private readonly onlineOfflineService: OnlineOfflineService,
        private readonly moveService: MoveService
    ) {}


  ngOnInit(): void {
    this.initilizeKeyboardEvent();
    this.subscription.add(
      this.contextMenuService.rightClick.subscribe((res) => {
        this.onRightClick(res.event, res.data)
      })
    );
    this.subscription.add(
      this.contextMenuService.closeContextMenu.subscribe(() => {
        if (this.sectionContextMenu && this.sectionContextMenu.menuOpen) {
          this.menuCloseEvTrigger = true;
          this.sectionContextMenu.closeMenu();
        }
      })
    );
    this.subscription.add(
      this.planogramService.saveDirtyFlag.subscribe((res: {[key: string]: any}) => {
        if (res != null && this.sharedService.getActiveSectionId() != '' && this.panelService.activePanelID == this.panelID || res?.sectionID) {
          if (this.historyService.historyStack[res?.sectionID || this.sharedService.activeSectionID].length > 0)
            this.bindWatchForCheckout(res?.sectionID);
        }
      }),
    );
    this.subscription.add(
      this.onlineOfflineService.connectionChanged.subscribe(res => {
        if (!res) {
          this.planogramHelperService.checkSaveStatusDuringOffline();
        }
      })
    );
  }

  private bindWatchForCheckout(sectionID?: string): boolean {
    let activeSectionID: string = sectionID || this.sharedService.getActiveSectionId();
    const rootFlags = this.planogramService.rootFlags[activeSectionID];
    if (rootFlags.isSaveDirtyFlag) {
      const rootObject = this.sharedService.getObject(activeSectionID, activeSectionID) as Section;
      const oldMapperObj = this.planogramStoreService.mappers.find(it => it.IDPOG === rootObject.IDPOG);

      if (!oldMapperObj.checkedoutManually) {
        // For all the actions we are verifying if the pog is editable or not, in any action
        // if we miss the check that action can be reverted back here.
        if (!this.userPermissions.checkUserPermissionBySectionID(activeSectionID, PogActionTypes.UPDATE)
          || oldMapperObj.IsReadOnly
        ) {
          this.historyService.abandonLastCapturedActionInHistory(this.historyService.unqHistoryID[activeSectionID], activeSectionID);
          if (oldMapperObj.IsReadOnly) {
            this.notifyService.warn('UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM');
          } else {
            this.notifyService.warn('User is not authorised to update the current Planogram');
          }

          this.planogramService.rootFlags[activeSectionID].isSaveDirtyFlag = false;
          this.planogramService.updateSaveDirtyFlag(
            this.planogramService.rootFlags[activeSectionID].isSaveDirtyFlag,
          );
          return false;
        }

        //   indicatorStart('Please wait Check out planogram is in progress...');
        oldMapperObj.PogVersion = rootObject.Version;
        this.planogramService.markRequestToCheckout([oldMapperObj]).subscribe(
          (response) => {
            if (response.Data != null) {
              for (const rData of response.Data) {
                if (rData.idPog === oldMapperObj.IDPOG) {
                  if (rData.canEdit) {
                    this.planogramService.markPogObjCheckedout([oldMapperObj]);
                  } else {
                    this.planogramService.rootFlags[activeSectionID].isSaveDirtyFlag = false;
                    this.notifyService.warn(rData.message);
                    this.planogramService.updateSaveDirtyFlag(
                      this.planogramService.rootFlags[activeSectionID].isSaveDirtyFlag,
                    );
                    if (rData.canReload) {
                      oldMapperObj.isLoaded = false;
                      oldMapperObj.IsAutoSaved = false;
                      this.planogramLoaderService.reloadPlanogram.next(true);
                    } else {
                      this.subscription.add(
                        this.planogramLibraryService
                          .updateMapperObject([oldMapperObj], false, false)
                          .subscribe(),
                      );
                      this.historyService.abandonLastCapturedActionInHistory(this.historyService.unqHistoryID[activeSectionID], activeSectionID);
                    }
                  }
                }
              }
            }
          },
          (error) => {
            this.historyService.abandonLastCapturedActionInHistory(this.historyService.unqHistoryID[activeSectionID], activeSectionID);
            this.planogramService.rootFlags[activeSectionID].isSaveDirtyFlag = false;
            this.planogramService.updateSaveDirtyFlag(
              this.planogramService.rootFlags[activeSectionID].isSaveDirtyFlag,
            );
            this.log.error('Error while checkout planogram:' + oldMapperObj.IDPOG);
            this.notifyService.warn('An Error Occurred while Checking out the planogram');
          },
        );
      }
    }
  }

    public initilizeKeyboardEvent(): void {
      const keybordEvents$ = this.initializeKeyboardEventListeners();
      this.subscription.add(
        keybordEvents$.subscribe(({ event, isCtrl, isShift, isCtrlAndShift }) => {
          try {
            if (this.panelID === this.panelService.activePanelID) {
              this.handleKeyUp(event, isCtrl, isShift, isCtrlAndShift);
            }
          } catch (err) {
            this.panelService.handleKeyboardEventErrors(err, event, isCtrl, isShift, isCtrlAndShift);
          }
        }),
      );
    }

    private initializeKeyboardEventListeners(): Observable<modifierKeyboardEvent> {
      return fromEvent(document, 'keyup').pipe(
        map((event: KeyboardEvent) => {
          return {
            event,
            isCtrl: event.ctrlKey,
            isShift: event.shiftKey,
            isCtrlAndShift: event.ctrlKey && event.shiftKey,
          };
        }),
      );
    }
    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public onRightClick(event: MouseEvent, child: SelectableList): boolean {
        this.contextMenuData = null;
      if (this.sectionContextMenu && this.sectionContextMenu.menuOpen && !this.menuCloseEvTrigger) { 
          // Need to close menu before open it so we have correct location every time rather than previous one
          this.sectionContextMenu.closeMenu();          
        }
        this.menuCloseEvTrigger = false;
        event.preventDefault();
        if (child.$sectionID && this.sharedService.activeSectionID != child.$sectionID) {
          const panelId: string = (this.panelService.panelPointer.panelOne.sectionID === child.$sectionID) ? PanelIds.One : PanelIds.Two;
          this.panelService.updatePanel(panelId, child.$sectionID)
        }
        if (this.panelID === this.panelService.activePanelID) {
          if (this.sharedService.rubberBandOn) return;
            this.planogram2DService.objectClicked(child, event);
            //check if you right clicked on already selected items
          if (this.planogramService.rootFlags[this.sectionObject.$sectionID].selectionCount <= 1) {
            this.contextMenuPosition.x = event.clientX + 'px';
            this.contextMenuPosition.y = event.clientY + 'px';
            window.dispatchEvent(new Event('resize'));
            this.sectionContextMenu.menuData = { 'item': child };
            this.contextMenuData = child;
            this.contextMenuService.addContextMenu();
            if (this.sectionContextMenu && this.sectionContextMenu.menuOpen) {
              // Need to wait until current menu closed
              this.menuClosedSubscription = this.sectionContextMenu.menuClosed.subscribe(() => {
                this.sectionContextMenu.openMenu();
                this.menuClosedSubscription.unsubscribe();
              });
            } else {
              this.sectionContextMenu.openMenu();
            }

          }
        }
        return false;
    }

    public get contextMenuOpened(): boolean {
      return this.contextMenuService.contextMenuOpened;
    }


    public closeStoreView(event): void {
        this.closeStore.emit();
    }

    public objectPropertyGrid(event: Event): void {
        this.preventSimpleClick = true;
        clearTimeout(this.timer);
        this.sharedService.fixtureTypeMultiple = false;
        this.sharedService.setActiveSectionId(this.sectionObject.$sectionID);
        if (!this.PogSideNavStateService.propertiesView.isPinned) {
            const items = this.planogramService.getSelectedObject(this.sectionObject.$sectionID);
            if (this.parentApp.isAllocateApp) {
            this.allocateService.resizeParentWindow(true);
          } else if (this.parentApp.isAssortAppInIAssortNiciMode && items[0].ObjectDerivedType  === AppConstantSpace.POSITIONOBJECT) {
              window.parent.postMessage(`invokePaceFunc:openPropertyGrid:["${this.planogramStoreService.loadPogId}","${items[0].Position.Product.IDProduct}"]`, '*');
              event.stopPropagation();
              return;
            }
            // propery pane
            const dialogRef = this.dialog.open(PropertyGridComponent, {
                height: 'fit-content',
                width: '55%',
                panelClass: 'mat-dialog-move-cursor',
                id: 'property-grid-dialog'
            });
            this.subscription.add(
                dialogRef.beforeClosed().subscribe((result) => {
                    this.allocateService.resizeParentWindow(false);
                }),
            );
        }
        else if (this.PogSideNavStateService.propertiesView.isPinned && this.PogSideNavStateService.activeVeiw != PogSideNaveView.PROPERTYGRID) {
            this.sharedService.openSelectedComponentInSideNav.next({ activeScreen: 'PG', isPin: true });
        }
        event.stopPropagation();
    }

    public outSideClick(): void {
        if (this.moveService.isDragging || this.sharedService.freeFlowOn.panelOne || this.sharedService.freeFlowOn.panelTwo) {
          return;
        }
        this.sharedService.setActiveSectionId(this.sectionObject.$sectionID);
        if (this.planogramService.getSelectionCount(this.sectionObject.$sectionID) <= 1) {
            this.planogramService.removeAllSelection(this.sectionObject.$sectionID);
            //need this code to remove all selection in position
            //this.sharedService.RemoveSelectedItemsInWS.next({ view: `removeSelectionInWS` });
            this.planogramService.addToSelectionById(this.sectionObject.$sectionID, this.sectionObject.$sectionID);
        }
        // remove all annotation if selected
        this.planogramService.updateAnnotationSelection.next(true);

        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.selectionEmit.next(true);
        if (
            this.PogSideNavStateService.propertiesView.isPinned &&
            !this.PogSideNavStateService.activeVeiw == (PogSideNaveView.PROPERTYGRID as any)
        ) {
            this.sharedService.openSelectedComponentInSideNav.next({
                activeScreen: PogSideNaveView.PROPERTYGRID,
                isPin: true,
            });
        }
        //Remove context menu
        this.contextMenuService.removeContextMenu();
        //set active panel id-- Required for header color
        this.planogramService.setSelectedIDPOGPanelID(this.panelID);
        this.sectionSelected.next(true);
    }

    public selectPogObject(event): void {
        this.sharedService.fixtureTypeMultiple = false;
        //Remove context menu
        this.contextMenuService.removeContextMenu();
    }

    public stopCalling(event): void {
        event.stopPropagation();
        event.preventDefault();
    }
    public handleKeyUp(event: KeyboardEvent, isCtrl: boolean, isShift: boolean, isCtrlAndShift: boolean): void {
      const key = event.key.toLowerCase();
      const threeDPlanogramKeysToPreventDefault = ['F8', 'r', 'k', 'h', 'd', 'g', 's'];
      if (event.ctrlKey) {
        if (key === 's') {
          if (event.shiftKey) {
            this.planogramHelperService.saveAllPlanograms();
          }
          else {
            this.savePlanogram();
          }
          event.preventDefault();
        }
        if (this.displayView === 'threeDPlanoViewer') {
          if (threeDPlanogramKeysToPreventDefault.some((x) => x == event.key)) {
            event.preventDefault();
            if (event.key === 'r') {
              this.threedPlanogramService.threedResetZoomChanger.next(true);
              this.threedPlanogramService.threedResetZoomChanger.next(false);
            }
          }
          this.threedPlanogramService.threedModeChanger.next(event.key === 'm');
          this.threedPlanogramService.threedLabelChanger.next(event.key === 'l');
          if (event.key === 'd') {
            this.threedPlanogramService.threedAnnotationChanger.next(true);
            this.threedPlanogramService.threedAnnotationChanger.next(false);
            event.stopPropagation();
          }
        }
      } else if (event.key === 'r' && this.displayView === 'threeDPlanoViewer') {
        this.threedPlanogramService.threedHeightZoomChanger.next(true);
        this.threedPlanogramService.threedHeightZoomChanger.next(false);
      }
    }

  private savePlanogram(): void {
    const sectionId = this.sharedService.getActiveSectionId();
    if (this.sharedService.isSaveAllInProgress && this.sharedService.allPogsToSaveInSaveAll.some(id => id === sectionId)) {
      this.notifyService.warn('SAVE_ALREADY_IN_PROGRESS', 'undo');
      return; //this cannot be moved to planogram save service as we cannot differentiate save all processing against save
    }
    if (sectionId) {
      let section = this.sharedService.getObject(
        sectionId,
        sectionId,
      ) as Section;
      /** @karthik DO NOT ADD this to subscriptions, even if component is destroyed, save should not be cancelled. */
      if (section) {
        this.planogramHelperService.savePlanogramDatasource(section).subscribe(response => {
          if (this.sharedService.isSaveAllInProgress) {
            this.planogramHelperService.processSaveSectionIdsInQueue();
          }
      });
      } else {
        console.log(`Section details could not be retrieved for section id - ${sectionId}`);
      }
    }
  }
}
