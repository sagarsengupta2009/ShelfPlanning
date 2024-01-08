import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { isEmpty } from 'lodash-es';
import { fromEvent, Observable, Subject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConsoleLogService } from 'src/app/framework.module';
import { Section } from 'src/app/shared/classes';
import { Context } from 'src/app/shared/classes/context';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import {
    AllSettings,
    IApiResponse,
    StoreAppSettings,
    ZoomType, PogSideNaveView, BlockDisplayType,
} from 'src/app/shared/models';
import {
    AvailableWSConfColService,
    ClipBoardService,
    IntersectionChooserHandlerService,
    NotifyService,
    PanelService,
    ParentApplicationService,
    PlanogramSaveService,
    PlanogramService,
    PlanogramStoreService as PlanogramStore,
    PlanogramStoreService,
    Planogram_2DService,
    Render2dService,
    SharedService,
    PogSideNavStateService,
    AllocateEventService,
    PlanogramHelperService,
    PlanogramInfoService,
    ShoppingCartService,
    HighlightService,
    AnnotationService
} from 'src/app/shared/services';
import { ObjectListItem, SelectableList } from 'src/app/shared/services/common/shared/shared.service';
import { ClipboardComponent } from '../../../../../childcomponents';
import { ShelfNestedComponent } from './shelf-nested/shelf-nested.component';
import { AllocateUtilitiesService } from 'src/app/shared/services/layouts/allocate/utilities/allocate-utilities.service';
declare const window: any;
interface IStyleForPog {
    position: string;
    width: string;
    height: string;
}

interface IInitializeKeyboardEvent {
    event: KeyboardEvent;
    isCtrl: boolean;
    isShift: boolean;
    isCtrlAndShift: boolean;
}

@Component({
    selector: 'shelf-panel-section',
    templateUrl: './panel-section.component.html',
    styleUrls: ['./panel-section.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSectionComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
    @Input() panelID: string;
    @Input() sectionObject: Section;
    @ViewChild('panalBodySection', { read: ElementRef }) panalBodySection;
    @ViewChild('shelfNested') shelfNested: ShelfNestedComponent;
    @Input() selectSection: Subject<boolean>;
    public nestedChild: ObjectListItem[];
    public styleS1: IStyleForPog | {};
    public get AppSettingsSvc(): StoreAppSettings {
        return this.planogramStore.appSettings;
    }
    public sectionID: string;
    public selectedObjsList: SelectableList[];
    public displayBlockMode: string = 'BlockDisplayMode0';
    public highlightClass : string = 'highlightOff';
    private subscriptions: Subscription = new Subscription();

    constructor(
        private readonly planogramService: PlanogramService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly store: PlanogramStore,
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly planogram2DService: Planogram_2DService,
        private readonly availableWSConfColService: AvailableWSConfColService,
        private readonly notifyService: NotifyService,
        private readonly cd: ChangeDetectorRef,
        private readonly sappClipBoardService: ClipBoardService,
        private readonly dialog: MatDialog,
        private readonly panelService: PanelService,
        private readonly intersectionChooserHandler: IntersectionChooserHandlerService,
        private readonly log: ConsoleLogService,
        private readonly planogramSaveService: PlanogramSaveService,
        private readonly render2d: Render2dService,
        private readonly PogSideNavStateService: PogSideNavStateService,
        private readonly allocateEvent: AllocateEventService,
        private readonly planogramHelperService : PlanogramHelperService,
        private readonly planogramInfoService: PlanogramInfoService,
        private readonly shoppingCartService: ShoppingCartService,
        private readonly highlightService: HighlightService,
        private readonly allocateUtils: AllocateUtilitiesService,
        private readonly annotationService: AnnotationService,
    ) { }

    public ngOnInit(): void {
        this.store.loadPogId = this.sectionObject.IDPOG;

        this.subscriptions.add(this.allocateEvent.savePlanogram.subscribe((res: boolean) => {
            this.savePlanogram();
        }));
        this.subscriptions.add(this.selectSection.subscribe(response => {
          this.cd.markForCheck();
        }));
        //Forcefully update sectionObj - Added due to sectionObj change is not detected from tools screen
        this.subscriptions.add(this.planogramService.updateSectionFromTool.subscribe((res: Section) => {
          if (res && res.IDPOG == this.sectionObject.IDPOG && this.sectionObject) {
              this.nestedChild = this.sectionObject.Children;
              this.styleS1 = this.getStyleS1(this.sectionObject);
              this.cd.markForCheck();
          }
        }));
  }

    public ngOnChanges(): void {
        if (!isEmpty(this.sectionObject)) {
            this.nestedChild = this.sectionObject['Children'];
            this.styleS1 = this.getStyleS1(this.sectionObject);
            if(this.parentApp.isAllocateApp) {
              this.updateBlockView();
            }
        }
        this.removeAnotherPogAnnotation();
        this.cd.markForCheck();
    }

    public ngAfterViewInit(): void {
        this.initilizeKeyboardEvent();
        this.quadTreeInitTimeout(this.sectionObject);
        /** This subscription needs to be triggered only when there are changes at modular level. Not sure why its triggered at many different places.
         * TODO clean up on this sub updates.
         * */
        this.subscriptions.add(
            this.planogramService.UpdatedSectionObject.subscribe((res) => {
                // TODO check why nestedChild is not updated automatically, without this modulars are not updated on dnd
                this.nestedChild = this.sectionObject['Children'];
                this.cd.markForCheck();
            }),
        );
        this.subscriptions.add(
          this.planogramService.refreshModularView.subscribe((res) => {
              let activePanelInfo = this.panelService.ActivePanelInfo;
              if (activePanelInfo?.view == 'panelView' && this.planogramService.rootFlags[this.sharedService.getActiveSectionId()]?.isModularView) {
                setTimeout(() => {
                this.planogram2DService.modularView(this.panelService.activePanelID);
              });
              }
          }),
        );
        this.subscriptions.add(
            this.planogramService.highlightPositionEmit.subscribe((res) => {
                this.highlightClass = this.planogramService.getSettingsBySectionId(this.sectionObject.$id).isEnabled ? 'highlightOn' : 'highlightOff';
                this.cd.markForCheck();
            })
        );

        this.subscriptions.add(this.sharedService.addProductAfterDrag.subscribe((res: boolean) => {
            if (res) {
              this.highlightService.updateRangeModel();
            }
        }));
        this.sharedService.updateAnnotationPosition.next(true);
        this.planogramService.refreshModularView.next(true);
    }

    public getSectionStyle(datasource: Section): IStyleForPog {
        if (this.panelService.panelPointer[this.panelID]['sectionID'] === datasource.$id) {
            let style = {
                position: 'absolute',
                width:
                    Math.round(
                        this.planogramService.convertToPixel(
                            Number(this.getWidth(datasource)) + Number(datasource.overflowLength),
                            datasource.$id,
                        ),
                    ) + 'px',
                height:
                    Math.round(
                        this.planogramService.convertToPixel(Number(this.getHeight(datasource)), datasource.$id),
                    ) + 'px',
            };
            return style;
        }
        return;
    }

    private get isDialogOpen(): boolean {
        return this.PogSideNavStateService.shoppingCartView.id === PogSideNaveView.SHOPPING_CART &&
            !this.PogSideNavStateService.shoppingCartView.isPinned &&
            this.PogSideNavStateService.shoppingCartView.pos === 'top'
            ? false
            : this.dialog.openDialogs.length > 0 && !this.planogramInfoService.isPogInfoOpened && !this.annotationService.isAnnotationDialogOpen();
    }

    private getWidth(sectionObj: Section): number {
        return sectionObj.showAnnotation
            ? sectionObj.Dimension.Width + sectionObj.anDimension.left + sectionObj.anDimension.right
            : sectionObj.Dimension.Width;
    }

    private getHeight(sectionObj: Section): number {
        return sectionObj.showAnnotation
            ? sectionObj.Dimension.Height + sectionObj.anDimension.top + sectionObj.anDimension.bottom
            : sectionObj.Dimension.Height;
    }

    // TODO: @malu this shouldn't be public, method binding in html to be removed
    public getDisplayMode(): string {
        let displayModeCls = 'planoDrawMode0';
        let customLabelCls = 'customizedLabel-off';
        let imageModeLabelCls = 'imageModeLabel-on';
        let positionNumLabelCls = 'positionLabel-off';
        let shelfLabelCls = 'shelfLabel-off';

        if (!this.planogramStore.appSettings.showLabelIfNoPackageImage) {
            imageModeLabelCls = 'imageModeLabel-off';
        }

        if (this.planogramService.rootFlags[this.sectionObject.$id]) {
            // temp fix need to remove
            displayModeCls = 'planoDrawMode' + this.planogramService.rootFlags[this.sectionObject.$id].mode;
        }

        if (this.planogramService.labelOn) {
            //this.LabelCss.labelOn
            customLabelCls = 'customizedLabel-on';
        }
        const clOn = $('div.customizedLabel-on');
        if(!this.planogramService.labelOn && clOn?.length > 0){
            customLabelCls = 'customizedLabel-off';
            clOn?.removeClass('customizedLabel-on')?.addClass('customizedLabel-off');
        }

        if (this.planogramStore.appSettings.shelfLabelOn) {
            shelfLabelCls = 'shelfLabel-on';
        }
        return `${displayModeCls} ${customLabelCls} ${positionNumLabelCls} ${shelfLabelCls} ${imageModeLabelCls}`;
    }

    // TODO @karthik move to pure pipe
    public getStyleS1(datasource: Section): IStyleForPog | {} {
        if (datasource && this.panelService.panelPointer[this.panelID]['sectionID'] === datasource.$id) {
            datasource.showAnnotation = this.planogramService.rootFlags[datasource.$id].isAnnotationView;
            let styleForPOG = {
                position: 'absolute',
                width: this.planogramService.convertToPixel(datasource.Dimension.Width, datasource.$id) + 'px',
                height: this.planogramService.convertToPixel(datasource.Dimension.Height, datasource.$id) + 'px',
            };
            if (datasource.showAnnotation) {
                styleForPOG['left'] =
                    this.planogramService.convertToPixel(datasource.anDimension.left, datasource.$id) + 'px';
                styleForPOG['top'] =
                    this.planogramService.convertToPixel(datasource.anDimension.top, datasource.$id) + 'px';
            } else {
                styleForPOG['left'] = '0px';
                styleForPOG['top'] = '0px';
            }
            let borderW = this.planogramService.getBorderWidth(
                this.planogramService.rootFlags[datasource.$id].scaleFactor,
            );
            styleForPOG['z-index'] = '10001';
            if (datasource.selected) {
                styleForPOG['border'] = borderW + 'px solid';
                styleForPOG['border-image'] =
                    'url("/SEyc.Applications.OSAS/SEyc.Apps/Areas/iShelf/ClientApplication/appMaterial/css/themes/default/img/ants.gif") 1 repeat';
                styleForPOG['-webkit-border-image'] =
                    'url("/Areas/iShelf/ClientApplication/appMaterial/css/themes/default/img/ants.gif") 1 repeat';
            } else {
                styleForPOG['border'] = `${borderW}px dotted grey`;
            }
            styleForPOG['box-sizing'] = 'content-box';
            this.cd.markForCheck();
            return styleForPOG;
        }
        return {};
    }

    private initilizeKeyboardEvent(): void {
        if (this.panalBodySection?.nativeElement) {
            const keybordEvents$ = this.initializeKeyboardEventListeners('keyup');
            this.subscriptions.add(
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
            const keybordEventsDown$ = this.initializeKeyboardEventListeners('keydown');
            this.subscriptions.add(
              keybordEventsDown$.subscribe(({ event, isCtrl, isShift, isCtrlAndShift }) => {
                  try {
                      if (this.panelID === this.panelService.activePanelID) {
                          this.handleKeyDown(event, isCtrl, isShift, isCtrlAndShift);
                      }
                  } catch (err) {
                      this.panelService.handleKeyboardEventErrors(err, event, isCtrl, isShift, isCtrlAndShift);
                  }
                }),
            );
        }
    }

    private initializeKeyboardEventListeners(eventType: string): Observable<IInitializeKeyboardEvent> {
        return fromEvent(document, eventType).pipe(
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

    private handleKeyDown(event: KeyboardEvent, isCtrl: boolean, isShift: boolean, isCtrlAndShift: boolean): boolean {
      const name = event.target as HTMLElement;
      let element = <HTMLElement>event.target;
      let preventEvent: boolean = true;
      const key = event.key.toLocaleLowerCase();
      //@Sagar: to prevent panning the pog, when typing specially W A S D from any of the input or textarea across the app
      if (element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
          const highlightDiv: Element = document.querySelector('sp-highlight');
          //We allow the keydown event incase of shortcut in highlight only.
          if(key == 'f9'){
            preventEvent = highlightDiv === null || highlightDiv.querySelector('input#' + element.id) === null;
          }
          if (preventEvent) {
              event.stopPropagation();
              return;
          }
      }
      /* Ignore caps */

      const typeName = name['type']; //event.type; //typeName should end up being things like 'text', 'textarea', 'radio', 'undefined' etc.
      this.sectionID = this.sharedService.getActiveSectionId();
      this.sectionObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
      const ctx = new Context(this.sectionObject);
      this.selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
      if (Utils.isNullOrEmpty(this.sectionID)) {
          return;
      }
    let skipPanRepeat = function () {
        return true; //window.skipPan; // temporary @naren 30 AUG 2021
    };
    if (
        !event.shiftKey &&
        !event.ctrlKey &&
        typeName != 'textarea' &&
        element.tagName.toUpperCase() != 'SPAN' &&
        !(element.classList.contains('textarea') && element.tagName.toUpperCase() == 'DIV')
    ) {
      // + : ZoomIn// - : ZoomOut// d : Pan Right              // s : Pan Down              // a : Pan Left              // w : Pan Up
      if (key == '=' || key == '+' || key == '-' || key == '_' || key == 'w' || key == 'a' || key == 's' || key == 'd') {
        this.sharedService.twoDPanning.next(event);
        event.stopPropagation();
        event.preventDefault();
        return false;
      }
      this.planogramService.updateNestedStyleDirty = true;;
    }

  }
    //TODO: User story already created for creating new KeyBoard Event Service.
    private handleKeyUp(event: KeyboardEvent, isCtrl: boolean, isShift: boolean, isCtrlAndShift: boolean): boolean {
        const name = event.target as HTMLElement;
        // prevent key actions when any dialog is popped up
        const clipboardDialog = this.dialog.openDialogs.some((ele) => ele.id === 'clipBoard-bottom-view' || ele.id === 'clipBoard-top-view');
        const propertyGridDialog = this.dialog.openDialogs.some((ele) => ele.id === 'property-grid-dialog');
        const planograginfodialog = this.dialog.openDialogs.some((ele) => ele.id === 'planogram-info-dialog');
        const scTopViewdialog = this.dialog.openDialogs.some((ele) => ele.id === 'shoppingcart-top-view');
        let element = <HTMLElement>event.target;
        let preventEvent: boolean = true;
        //@Sagar: to prevent panning the pog, when typing specially W A S D from any of the input or textarea across the app
        if (element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
            const highlightDiv: Element = document.querySelector('sp-highlight');
            preventEvent = highlightDiv === null || highlightDiv.querySelector('input#' + element.id) === null;
            if (preventEvent) {
                return;
            }
        }
        /* Ignore caps */
        const key = event.key.toLocaleLowerCase();
        const typeName = name['type']; //event.type; //typeName should end up being things like 'text', 'textarea', 'radio', 'undefined' etc.
        let keysByCode = [49, 50, 51, 52, 53, 54, 55, 56, 57];
        let numpadKeyCode = [97, 98, 99, 100, 101, 102, 103, 104, 105];
        this.sectionID = this.sharedService.getActiveSectionId();
        this.sectionObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        const ctx = new Context(this.sectionObject);
        this.selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
        if (Utils.isNullOrEmpty(this.sectionID)) {
            return;
        }

        const propertyGridEle = element.tagName.toLowerCase() == 'mat-sidenav' && element.contains(document.querySelector('shelf-property-grid'));
        //Note: To prevent fixture/position object shortcut action while having dialog
        if ((element.id === 'property-grid-dialog' || propertyGridEle) && window.ctrlPressed && !window.shiftPressed && (key == 'c' || key == 'x' || key == 'v')) {
            return;
        }

        if (window.ctrlPressed && !window.shiftPressed) {
            //I : Toggle Item Scanning Mode
            if (key == 'k') {
                this.planogramService.rootFlags[this.sectionID].isItemScanning = !this.sharedService.isItemScanning;
                this.sharedService.itemScanSubcription.next(true);
                event.preventDefault();
                return false;
            }

            //R : Fit to window
            if (key == 'r') {
                if (this.panelService.activePanelID === this.panelID) {
                    let cartView = document.getElementsByClassName('shoppingcart-topview') as HTMLCollectionOf<HTMLElement>;
                    if(cartView.length > 0){
                        this.sharedService.changeZoomView.next(2);
                    }
                    else{
                        this.sharedService.changeZoomView.next(1);
                    }
                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                }
            }

            if (key == 'm') {
                this.planogram2DService.toggleDisplayMode();
                this.planogramService.updateNestedStyleDirty = true;
                this.cd.markForCheck();
                event.preventDefault();
                return false;
            }

            //B : show Modular (Bay)
            if (key == 'b') {
              this.planogram2DService.showModular();
              event.preventDefault();
              return false;
            }

            //I : movePreviousPositionWithCtrl
            if (key == 'i') {
                this.planogram2DService.doFlip(this.sectionObject);
                event.stopPropagation();
                return false;
            }

            //R : Center View
            if (isCtrlAndShift && key == 'r') {
                this.sharedService.changeZoomView.next(2);
                this.sharedService.changeZoomView.next(null);
                event.stopPropagation();
                event.preventDefault();
                return false;
            }

            //F9 run toggle between templates
            if (key == 'f9') {
                this.planogramService.toggleForwardBetweenTemplate.next();
                event.stopPropagation();
                return false;
            }
            this.resetCtrlState(isCtrl);
        }

        if (
            (event.target['tagName'].toUpperCase() == 'INPUT' && preventEvent) ||
            (this.dialog.openDialogs.length > 0 && !scTopViewdialog && !planograginfodialog && !clipboardDialog)
        ) {
            if (window.ctrlPressed) {
                // Undo/Redo should work on top of dialog model too

                if (!this.isDialogOpen || clipboardDialog) {
                    if (window.shiftPressed) {
                        //r : center zoom view
                        if (key == 'r') {
                            this.sharedService.changeZoomView.next(ZoomType.CENTER_ZOOM);
                            event.preventDefault();
                            return false;
                        }
                        this.resetShiftState(isShift);
                    }
                //    // V : Paste
                if (key == 'v') {
                    if (this.sappClipBoardService.showClipboardIfApplicable('Paste')) {
                        this.sharedService.changeInGridHeight.next(true);
                        this.sappClipBoardService.openDialog(true,"openInBottom");
                    }
                    this.planogram2DService.pasteObjects(this.sharedService.getActiveSectionId());
                    this.planogramService.updateNestedStyleDirty = true;;
                    return;
                }
                // C : Copy
                if (key == 'c') {
                    this.planogram2DService.copyObjects('Copy', this.sharedService.getActiveSectionId());
                    event.preventDefault();
                    if(!this.dialog.openDialogs.length){
                        if (this.sappClipBoardService.showClipboardIfApplicable('Copy')) {
                            this.sharedService.changeInGridHeight.next(false);
                            this.sappClipBoardService.openDialog(false,"collapse");
                        }
                    }
                    return;
                }
                // A (Select All)
                if (key == 'a') {
                    this.planogram2DService.selectAllPosition(this.sharedService.getActiveSectionId());
                    this.planogramService.selectionEmit.next(true);
                    this.planogramService.updateNestedStyleDirty = true;;
                    event.preventDefault();
                    return false;
                }
                }
                // Redo :
                if (key == 'y') {
                    this.planogram2DService.doRedo();
                    event.stopPropagation();
                    return false;
                }

                // Undo :
                if (key == 'z') {
                    this.planogram2DService.doUndo();
                    event.stopPropagation();
                    return false;
                }

                // X : CUT
                if (key == 'x') {
                    this.planogram2DService.copyObjects('Cut', this.sharedService.getActiveSectionId());
                    if(!this.dialog.openDialogs.length){
                        if (this.sappClipBoardService.showClipboardIfApplicable('Cut')) {
                            this.sharedService.changeInGridHeight.next(false);
                            this.sappClipBoardService.openDialog(false,"collapse");
                        }
                    }
                    event.preventDefault();
                    return false;
                }

                //H : Toggle Highlight
                if (key == 'h') {
                    if (this.planogramService.rootFlags[this.sectionID] != undefined) {
                        this.planogramService.rootFlags[this.sectionID].isEnabled =
                            !this.planogramService.rootFlags[this.sectionID].isEnabled;
                            if(!this.planogramService.rootFlags[this.sectionID].isEnabled){
                                this.highlightService.disableHighLightForActiveSectionIDs();
                            }else { //turned on
                                this.highlightService.enableHighLightForActiveSectionIDs();
                                if(this.PogSideNavStateService.activeVeiw != "HL"){
                                    this.highlightService.updateRangeModel();
                                }

                            }
                        this.showHideHighlight();
                        this.cd.detectChanges();
                    }
                    event.stopPropagation();
                    return false;
                }
                //G : Toggle Grid View
                if (key == 'g') {
                    if (this.planogramService.rootFlags[this.sectionID] != undefined) {
                        this.planogramService.rootFlags[this.sectionID].isGrillView =
                            !this.planogramService.rootFlags[this.sectionID].isGrillView;
                        this.sharedService.updateGrillOnFieldChange.next(true);
                    }
                    event.stopPropagation();
                    return false;
                }
                //D : Toggle Annotations
                if (key == 'd') {
                    const currentAnnotationViewMode =
                        this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView;
                    this.planogram2DService.toggleAnnotations(this.sectionObject).subscribe();
                    this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView =
                        this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView < 3 &&
                            currentAnnotationViewMode !== 3
                            ? ++this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView
                            : 0;
                    this.sectionObject.showAnnotation =
                        this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView;
                    this.sharedService.updateAnnotationPosition.next(true);
                    event.preventDefault();
                    return false;
                }

                //right arrow : moveNextPositionWithCtrl
                if (key == 'arrowright') {
                    this.planogram2DService.moveNextPositionWithCtrl(ctx, this.sectionObject,AppConstantSpace.POSITION_MOVEMENT_TYPE.STEP_BY_STEP);
                    this.planogramService.updateNestedStyleDirty = true;;
                    event.stopPropagation();
                    return false;
                }

                //left arrow : movePreviousPositionWithCtrl
                if (key == 'arrowleft') {
                    this.planogram2DService.movePreviousPositionWithCtrl(ctx, this.sectionObject,AppConstantSpace.POSITION_MOVEMENT_TYPE.STEP_BY_STEP);
                    this.planogramService.updateNestedStyleDirty = true;;
                    event.stopPropagation();
                    return false;
                }
                this.resetCtrlState(isCtrl);
            } else if (window.shiftPressed && (!this.isDialogOpen || clipboardDialog || propertyGridDialog)) {
                //> : increament facings
                if (key == '>' || event.which == 190) {
                    this.planogram2DService.incrementFacingsByOne(ctx, this.sectionObject);
                    this.updateInPlanoWs();
                    this.planogramService.updateNestedStyleDirty = true;;
                }

                //< : decrement facings
                if (key == '<' || event.which == 188) {
                    this.planogram2DService.decrementFacingsByOne(ctx, this.sectionObject);
                    this.updateInPlanoWs();
                    this.planogramService.updateNestedStyleDirty = true;;
                }

                //down arrow : rollDown
                if (key == 'arrowdown') {
                    this.planogram2DService.rollDown(ctx, this.sectionObject);
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
                    this.sharedService.changeInCartItems.next(true); // update orientation value in shopping cart
                    event.stopPropagation();
                    return false;
                }

                //up arrow : rollUp
                if (key == 'arrowup') {
                    this.planogram2DService.rollUp(ctx, this.sectionObject);
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
                    this.sharedService.changeInCartItems.next(true); // update orientation value in shopping cart
                    event.stopPropagation();
                    return false;
                }

                //right arrow : selectNextPositionWithShift
                if (key == 'arrowright') {
                    this.planogram2DService.selectNextPositionWithShift();
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.planogramService.selectionEmit.next(true);
                    event.stopPropagation();
                    return false;
                }

                //left arrow : selectPreviousPositionWithShift
                if (key == 'arrowleft') {
                    this.planogram2DService.selectPreviousPositionWithShift();
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.planogramService.selectionEmit.next(true);
                    event.stopPropagation();
                    return false;
                }

                //End : selectItemsTillEnd
                if (key == 'end') {
                    this.planogram2DService.selectItemsTillEnd(this.sectionObject);
                    this.planogramService.updateNestedStyleDirty = true;
                    this.planogramService.selectionEmit.next(true);
                    event.stopPropagation();
                    return false;
                }

                //home : selectItemsTillHome
                if (key == 'home') {
                    this.planogram2DService.selectItemsTillHome(this.sectionObject);
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.planogramService.selectionEmit.next(true);
                    event.stopPropagation();
                    return false;
                }
                this.resetShiftState(isShift);
            }



            // ESC - remove All Selction
            else if (key == 'escape' && (!this.isDialogOpen || clipboardDialog)) {
                this.planogramService.removeAllSelection(this.sectionID);
                this.planogramService.updateNestedStyleDirty = true;
                this.sharedService.updateFooterNotification.next(true);

                event.stopPropagation();
                return false;
            }

            //left arrow : selectPreviousPosition. selects position if user click on position in planogram and even if clipboard dialog is open
            else if (key == 'arrowleft' && this.sharedService.isItemClickedOnPlanogram) {
                const isModularValue = this.planogramService.rootFlags[this.sectionID].isModularView;
                if (isModularValue) {
                    this.sharedService.isNiciFeatureNotAllowed('MOVEMODULAR')
                        ? ''
                        : this.planogram2DService.moveModular(ctx, key);
                } else if (
                    this.planogramService.getLastSelectedObjectType(this.sectionID) == 'Position' &&
                    this.planogramService.getSelectionCount(this.sectionID) == 1
                ) {
                    this.planogram2DService.selectPreviousPosition();
                } else if (
                    this.planogramService.getLastSelectedObjectType(this.sectionID) == 'Fixture' &&
                    this.planogramService.getSelectionCount(this.sectionID) == 1
                ) {
                    this.planogram2DService.selectPreviousFixture();
                }
                this.sharedService.propertyGridUpdateData.next(true);
            }
            // clipboard item selection
            else if (key == 'arrowleft' && this.isDialogOpen && this.dialog.openDialogs.length && this.dialog.openDialogs.some((ele) => ele.id === 'clipBoard-top-view'
                && !this.sharedService.isItemClickedOnPlanogram)) {
                this.sappClipBoardService.keyDown(key)
            }
            //right arrow : selectNextPosition, selects position if user click on position in planogram and even if clipboard dialog is open
            else if (key == 'arrowright' && this.sharedService.isItemClickedOnPlanogram) {
                const isModularValue = this.planogramService.rootFlags[this.sectionID].isModularView;
                if (isModularValue) {
                    if (!this.sharedService.isNiciFeatureNotAllowed('MOVEMODULAR')) {
                        this.planogram2DService.moveModular(ctx, key);
                    }
                } else if (
                    this.planogramService.getLastSelectedObjectType(this.sectionID) == 'Position' &&
                    this.planogramService.getSelectionCount(this.sharedService.getActiveSectionId()) == 1
                ) {
                    this.planogram2DService.selectNextPosition();
                } else if (
                    this.planogramService.getLastSelectedObjectType(this.sectionID) == 'Fixture' &&
                    this.planogramService.getSelectionCount(this.sectionID) == 1
                ) {
                    this.planogram2DService.selectNextFixture();
                }
                this.sharedService.propertyGridUpdateData.next(true);
            }
            // clipboard item selection
            else if (key == 'arrowright' && this.isDialogOpen && this.dialog.openDialogs.length && this.dialog.openDialogs.some((ele) => ele.id === 'clipBoard-top-view')
                && !this.sharedService.isItemClickedOnPlanogram) {
                this.sappClipBoardService.keyDown(key)
            }

            //r : fit to height zoom
            if (key == 'r' && (!this.isDialogOpen || clipboardDialog)) {
                this.sharedService.changeZoomView.next(ZoomType.FIT_TO_HIGHT_ZOOM);
                event.preventDefault();
                return false;
            }

              //L : Toggle Position Labels
            else if (key === 'l' && (!this.isDialogOpen || clipboardDialog)) {
                event.stopPropagation();
                event.preventDefault();
                this.planogram2DService.toggleLabelMode();
                return false;
            }
            //down arrow : rollDown
            else if (key === 'arrowdown' && (!this.isDialogOpen || clipboardDialog || propertyGridDialog) && element.tagName != 'MAT-SELECT') {
                this.planogram2DService.selectDirectionWiseObject(ctx, AppConstantSpace.DOWN);
                this.planogramService.updateNestedStyleDirty = true;
                event.stopPropagation();
                return false;
            }
            //up arrow : rollUp
            else if (key === 'arrowup' && (!this.isDialogOpen || clipboardDialog || propertyGridDialog) && element.tagName != 'MAT-SELECT') {
                this.planogram2DService.selectDirectionWiseObject(ctx, AppConstantSpace.UP);
                this.planogramService.updateNestedStyleDirty = true;
                event.stopPropagation();
                return false;
            }


            //Q : Toggle will-change
            if (key == 'q') {
                // Invert value
                this.AppSettingsSvc.useWillChange = this.AppSettingsSvc.useWillChange == true ? false : true;
                // Create the request structure
                const request: AllSettings[] = [
                    {
                        List: false,
                        KeyName: 'USE_WILL_CHANGE',
                        KeyValue: false,
                        KeyGroup: 'POG',
                        Type: 'boolean',
                        KeyType: 'boolean',
                        UIType: null,
                        Readonly: false,
                        LkUp: null,
                        Name: 'Use will-change',
                        Values: null,
                        SelectedValue: {
                            text: 'Use will-change',
                            value: this.AppSettingsSvc.useWillChange,
                        },
                    },
                ];
                // Save the changed value to the DB
                this.availableWSConfColService.savePogSettings(request).subscribe(
                    (res: IApiResponse<void>) => {
                        this.log.info('Saved USE_WILL_CHANGE', res);
                    },
                    (err) => {
                        this.log.error('Failed to save USE_WILL_CHANGE', err);
                    },
                );

                event.preventDefault();
                return false;
            }


            // Delete -
            else if (key === 'delete' && (!this.isDialogOpen || clipboardDialog)) {
                this.planogram2DService.delete();
                this.render2d.isDirty = true;
                this.planogramService.updateNestedStyleDirty = true;;
                event.stopPropagation();
                return false;
            }

            // increaseFacing with Number Key (1 to 9)
            else if (!this.isDialogOpen || clipboardDialog) {
                let facingNo;
                if (keysByCode.indexOf(event.which) != -1) {
                    facingNo = keysByCode.indexOf(event.which);
                } else if (numpadKeyCode.indexOf(event.which) != -1) {
                    facingNo = numpadKeyCode.indexOf(event.which);
                }

                const element = event.target as HTMLInputElement;
                if (event.target['tagName'].toUpperCase() == 'INPUT') {
                    if (facingNo >= 0 && element.closest('kendo-numerictextbox').getAttribute('id') == '394') {
                        //as this is specific to only facing no need to call for each numeric input element
                        this.planogram2DService.increaseFacing(facingNo + 1, this.sectionObject);
                        this.updateInPlanoWs();
                        this.planogramService.updateSectionObjectIntoStore(
                            this.sectionObject.IDPOG,
                            this.sectionObject,
                        );
                        this.planogramService.updateNestedStyleDirty = true;;
                    }
                } else {
                    if (facingNo >= 0) {
                        this.planogram2DService.increaseFacing(facingNo + 1, this.sectionObject);
                        this.updateInPlanoWs();
                        this.planogramService.updateSectionObjectIntoStore(
                            this.sectionObject.IDPOG,
                            this.sectionObject,
                        );
                        this.planogramService.updateNestedStyleDirty = true;;
                    }
                }
            }

            event.stopPropagation();
            return;
        } else {
            //  //CTRL+
            if (window.ctrlPressed) {
                const featureName = AppConstantSpace.CTRLKEYDOWNEVENTJSON[key];
                const isDisabled = this.sharedService.isNiciFeatureNotAllowed(featureName, this.selectedObjsList);
                if (isDisabled) {
                    event.stopPropagation();
                    return;
                }
                // ctrl+ shift+
                if (window.shiftPressed) {
                    //r : center view
                    if (key == 'r') {
                        this.sharedService.changeZoomView.next(ZoomType.CENTER_ZOOM);
                        event.preventDefault();
                        return false;
                    }

                    if (key == 'f9') {
                        this.planogramService.toggleBackwardBetweenTemplate.next();
                        event.preventDefault();
                        return false;
                    }

                    if (key == 'arrowright') {
                        this.planogram2DService.moveNextPositionWithCtrl(ctx, this.sectionObject,AppConstantSpace.POSITION_MOVEMENT_TYPE.DIRECT);
                        this.planogramService.updateNestedStyleDirty = true;;
                        event.stopPropagation();
                        return false;
                    }

                    if (key == 'arrowleft') {
                        this.planogram2DService.movePreviousPositionWithCtrl(ctx, this.sectionObject,AppConstantSpace.POSITION_MOVEMENT_TYPE.DIRECT);
                        this.planogramService.updateNestedStyleDirty = true;;
                        event.stopPropagation();
                        return false;
                    }

                    if (key == 'arrowup' || key == 'arrowdown') {
                        if (this.sectionObject['LKFixtureMovement'] != 2) {
                            this.planogram2DService.moveByNotch(ctx, event.which,AppConstantSpace.POSITION_MOVEMENT_TYPE.DIRECT);
                        }
                        event.stopPropagation();
                        return false;
                    }

                    this.resetShiftState(isShift);
                }
                //    // V : Paste
                if (key == 'v') {
                    if (this.sappClipBoardService.showClipboardIfApplicable('Paste')) {
                        this.sharedService.changeInGridHeight.next(true);
                        this.sappClipBoardService.openDialog(true,"openInBottom");
                        return false;
                    }

                    this.planogram2DService.pasteObjects(this.sharedService.getActiveSectionId());

                    //this.sectionObject = cloneDeep(this.sharedService.getObject(this.sectionID, this.sectionID));
                    this.planogramService.updateNestedStyleDirty = true;;
                    // event.preventDefault();

                    return;
                }
                // C : Copy
                if (key == 'c') {
                    this.planogram2DService.copyObjects('Copy', this.sharedService.getActiveSectionId());
                    if(!this.dialog.openDialogs.length || planograginfodialog || scTopViewdialog){
                        if (this.sappClipBoardService.showClipboardIfApplicable('Copy')) {
                            this.sharedService.changeInGridHeight.next(true);
                            this.sappClipBoardService.openDialog(false,"collapse");
                        }
                    }
                    event.preventDefault();
                    return;
                }
                // X : CUT
                if (key == 'x') {
                    this.planogram2DService.copyObjects('Cut', this.sharedService.getActiveSectionId());
                    if(!this.dialog.openDialogs.length){
                        if (this.sappClipBoardService.showClipboardIfApplicable('Cut')) {
                            this.sharedService.changeInGridHeight.next(true);
                            this.sappClipBoardService.openDialog(false,"collapse");
                        }
                    }
                    event.preventDefault();
                    return false;
                }

                //    //A (Select All)
                if (key == 'a') {
                    this.planogram2DService.selectAllPosition(this.sharedService.getActiveSectionId());
                    this.planogramService.selectionEmit.next(true);
                    this.planogramService.updateNestedStyleDirty = true;;
                    event.preventDefault();
                    return false;
                }

                //B : show Modular (Bay)
                if (key == 'b') {
                  this.planogram2DService.showModular();
                  event.preventDefault();
                  return false;
                }

                //g : toggle grid view
                if (key == 'g') {
                    if (this.planogramService.rootFlags[this.sectionID] != undefined) {
                        this.planogramService.rootFlags[this.sectionID].isGrillView =
                            !this.planogramService.rootFlags[this.sectionID].isGrillView;
                        this.sharedService.updateGrillOnFieldChange.next(true);
                    }
                    event.stopPropagation();
                    return false;
                }

                //H : Toggle Highlight
                if (key == 'h') {
                    if (this.planogramService.rootFlags[this.sectionID]) {
                        this.planogramService.rootFlags[this.sectionID].isEnabled =
                            !this.planogramService.rootFlags[this.sectionID].isEnabled;
                            if(!this.planogramService.rootFlags[this.sectionID].isEnabled){
                                this.highlightService.disableHighLightForActiveSectionIDs();
                            }else { //turned on
                                this.highlightService.enableHighLightForActiveSectionIDs();
                                if(this.PogSideNavStateService.activeVeiw != "HL"){
                                this.highlightService.updateRangeModel();
                                }
                            }
                        this.showHideHighlight();
                        this.cd.detectChanges();
                    }
                    event.stopPropagation();
                    return false;
                }

                //I : movePreviousPositionWithCtrl
                if (key == 'i') {
                    this.planogram2DService.doFlip(this.sectionObject);
                    event.stopPropagation();
                    return false;
                }

                //L : Toggle Position Labels
                if (key == 'l') {
                    event.stopPropagation();
                    event.preventDefault();
                    this.planogram2DService.toggleLabelMode();
                    return false;
                }

                //M : Toggle (Box/Image/SKU)
                if (key == 'm') {
                    this.planogram2DService.toggleDisplayMode();
                    this.planogramService.updateNestedStyleDirty = true;
                    this.cd.markForCheck();
                    event.preventDefault();
                    return false;
                }

                //D : Toggle Annotations
                if (key == 'd') {
                    const currentAnnotationViewMode =
                        this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView;
                    this.planogram2DService.toggleAnnotations(this.sectionObject).subscribe();
                    this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView =
                        this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView < 3 &&
                            currentAnnotationViewMode !== 3
                            ? ++this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView
                            : 0;
                    this.sectionObject.showAnnotation =
                        this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView;
                    this.sharedService.updateAnnotationPosition.next(true);
                    event.preventDefault();
                    return false;
                }

                //I : Toggle Item Scanning Mode
                if (key == 'i') {
                    this.planogram2DService.toggleItemScanning();
                    event.preventDefault();
                    return false;
                }

                //Q : Toggle will-change
                if (key == 'q') {
                    // Invert value
                    this.AppSettingsSvc.useWillChange = this.AppSettingsSvc.useWillChange == true ? false : true;
                    // Create the request structure
                    let request: AllSettings[] = [
                        {
                            List: false,
                            KeyName: 'USE_WILL_CHANGE',
                            KeyValue: false,
                            KeyGroup: 'POG',
                            Type: 'boolean',
                            KeyType: 'boolean',
                            UIType: null,
                            Readonly: false,
                            LkUp: null,
                            Name: 'Use will-change',
                            Values: null,
                            SelectedValue: {
                                text: 'Use will-change',
                                value: this.AppSettingsSvc.useWillChange,
                            },
                        },
                    ];
                    // Save the changed value to the DB
                    this.availableWSConfColService.savePogSettings(request).subscribe(
                        (res: any) => {
                            this.log.info('Saved USE_WILL_CHANGE', res);
                        },
                        (err) => {
                            this.log.error('Failed to save USE_WILL_CHANGE', err);
                        },
                    );
                    event.preventDefault();
                    return false;
                }

                //R : Fit to window
                if (key == 'r') {
                    this.planogram2DService.fitToWindowPanZoom();
                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                }

                //right arrow : moveNextPositionWithCtrl
                if (key == 'arrowright' && this.sharedService.isItemClickedOnPlanogram) {
                    this.planogram2DService.moveNextPositionWithCtrl(ctx, this.sectionObject,AppConstantSpace.POSITION_MOVEMENT_TYPE.STEP_BY_STEP);
                    this.planogramService.updateNestedStyleDirty = true;;

                    event.stopPropagation();
                    return false;
                }
                // clipboard item selection
                else if (key == 'arrowright' && this.isDialogOpen && this.dialog.openDialogs.length && this.dialog.openDialogs.some((ele) => ele.id === 'clipBoard-top-view')
                    && !this.sharedService.isItemClickedOnPlanogram) {
                    this.sappClipBoardService.keyDown(key)
                }
                //left arrow : movePreviousPositionWithCtrl
                if (key == 'arrowleft' && this.sharedService.isItemClickedOnPlanogram) {
                    this.planogram2DService.movePreviousPositionWithCtrl(ctx, this.sectionObject,AppConstantSpace.POSITION_MOVEMENT_TYPE.STEP_BY_STEP);
                    this.planogramService.updateNestedStyleDirty = true;;
                    event.stopPropagation();
                    return false;
                }
                // clipboard item selection
                else if (key == 'arrowleft' && this.isDialogOpen && this.dialog.openDialogs.length && this.dialog.openDialogs.some((ele) => ele.id === 'clipBoard-top-view'
                    && !this.sharedService.isItemClickedOnPlanogram)) {
                    this.sappClipBoardService.keyDown(key)
                }
                // Move By Notch (up arrow or down arow) with Ctrl
                if (key == 'arrowdown' || key == 'arrowup') {
                    if (this.sectionObject['LKFixtureMovement'] != 2) {
                        this.planogram2DService.moveByNotch(ctx, event.which,AppConstantSpace.POSITION_MOVEMENT_TYPE.STEP_BY_STEP);
                    }
                    event.stopPropagation();
                    return false;
                }
                // End : Section End item
                if (key == 'end') {
                    this.planogram2DService.selectSectionLastItem();
                    event.stopPropagation();
                    return false;
                }
                // Home : Section First item
                if (key == 'home') {
                    this.planogram2DService.selectSectionFirstItem();
                    event.stopPropagation();
                    return false;
                }

                if (key == 'f3') {
                    event.preventDefault();
                    return false;
                }

                // Redo :
                if (key == 'y') {
                    this.planogram2DService.doRedo();
                    event.stopPropagation();
                    return false;
                }

                // Undo :
                if (key == 'z') {
                    this.planogram2DService.doUndo();
                    event.stopPropagation();
                    return false;
                }
                this.resetCtrlState(isCtrl);
            }

            //  //SHIFT+
            if (window.shiftPressed) {
                if (
                    this.sharedService.isNiciFeatureNotAllowed(
                        AppConstantSpace.SHIFTKEYDOWNEVENTJSON[
                        ((key == '>' || key == '<') && key) || event.which.toString()
                        ],
                        this.selectedObjsList,
                    )
                ) {
                    event.stopPropagation();
                    return;
                }
                //> : increament facings
                if (key == '>' || event.which == 190) {
                    this.planogram2DService.incrementFacingsByOne(ctx, this.sectionObject);
                    this.updateInPlanoWs();
                    this.planogramService.updateNestedStyleDirty = true;;
                }
                //< : decrement facings
                if (key == '<' || event.which == 188) {
                    this.planogram2DService.decrementFacingsByOne(ctx, this.sectionObject);
                    this.updateInPlanoWs();
                    this.planogramService.updateNestedStyleDirty = true;;
                }
                //End : selectItemsTillEnd
                if (key == 'end') {
                    this.planogram2DService.selectItemsTillEnd(this.sectionObject);
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.planogramService.selectionEmit.next(true);
                    event.stopPropagation();
                    return false;
                }
                //home : selectItemsTillHome
                if (key == 'home') {
                    this.planogram2DService.selectItemsTillHome(this.sectionObject);
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.planogramService.selectionEmit.next(true);
                    event.stopPropagation();
                    return false;
                }
                //left arrow : selectPreviousPositionWithShift
                if (key == 'arrowleft') {
                    this.planogram2DService.selectPreviousPositionWithShift();
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.planogramService.selectionEmit.next(true);
                    event.stopPropagation();
                    return false;
                }
                //up arrow : rollUp
                if (key == 'arrowup') {
                    this.planogram2DService.rollUp(ctx, this.sectionObject);
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
                    this.sharedService.changeInCartItems.next(true); // update orientation value in shopping cart
                    event.stopPropagation();
                    return false;
                }
                //right arrow : selectNextPositionWithShift
                if (key == 'arrowright') {
                    this.planogram2DService.selectNextPositionWithShift();
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.planogramService.selectionEmit.next(true);
                    event.stopPropagation();
                    return false;
                }
                //down arrow : rollDown
                if (key == 'arrowdown') {
                    this.planogram2DService.rollDown(ctx, this.sectionObject);
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
                    this.sharedService.changeInCartItems.next(true); // update orientation value in shopping cart
                    event.stopPropagation();
                    return false;
                }

                //B : Block display mode
                if (key == 'b' && $(document.activeElement).filter('input,textarea').length == 0) {
                    if (this.parentApp.isAllocateApp) {
                      this.planogram2DService.switchBlockDisplayMode();
                      this.updateBlockView();
                    }
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.cd.markForCheck();
                    event.preventDefault();
                    return false;
                }
                this.resetShiftState(isShift);
            }

            let skipPanRepeat = function () {
                return true; //window.skipPan; // temporary @naren 30 AUG 2021
            };
            let element = event.target as HTMLElement;
            if (
                !event.shiftKey &&
                !event.ctrlKey &&
                typeName != 'textarea' &&
                element.tagName.toUpperCase() != 'SPAN' &&
                !(element.classList.contains('textarea') && element.tagName.toUpperCase() == 'DIV')
            ) {
                if (
                    this.sharedService.isNiciFeatureNotAllowed(
                        AppConstantSpace.KEYDOWNEVENTJSON[
                        ((key == '>' || key == '<') && key) || event.which.toString()
                        ],
                        this.selectedObjsList,
                    )
                ) {
                    event.stopPropagation();
                    return;
                }


                // r : Fit to Height
                if (key == 'r') {
                    this.sharedService.changeZoomView.next(ZoomType.FIT_TO_HIGHT_ZOOM);
                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                }



                // End : selectEndItem
                if (key == 'end') {
                    this.planogram2DService.selectEndItem();
                    event.stopPropagation();
                    return false;
                }
                // Home : selectHomeItem
                if (key == 'home') {
                    this.planogram2DService.selectHomeItem();
                    event.stopPropagation();
                    return false;
                }
                //up arrow : selectUpObject
                if (key == 'arrowup' && element.tagName != 'MAT-SELECT') {
                    this.planogram2DService.selectDirectionWiseObject(ctx, AppConstantSpace.UP);
                    this.planogramService.updateNestedStyleDirty = true;
                    event.stopPropagation();
                    return false;
                }
                //down arrow : selectDownObject
                if (key == 'arrowdown' && element.tagName != 'MAT-SELECT') {
                    this.planogram2DService.selectDirectionWiseObject(ctx, AppConstantSpace.DOWN);
                    this.planogramService.updateNestedStyleDirty = true;
                    event.stopPropagation();
                    return false;
                }
                //right arrow : selectNextPosition
                if (key == 'arrowright') {
                    const isModularValue = this.planogramService.rootFlags[this.sectionID].isModularView;
                    if (isModularValue) {
                        if (!this.sharedService.isNiciFeatureNotAllowed('MOVEMODULAR')) {
                            this.planogram2DService.moveModular(ctx, key);
                        }
                    } else if (
                        this.planogramService.getLastSelectedObjectType(this.sectionID) == 'Position' &&
                        this.planogramService.getSelectionCount(this.sharedService.getActiveSectionId()) == 1
                    ) {
                        this.planogram2DService.selectNextPosition();
                    } else if (
                        this.planogramService.getLastSelectedObjectType(this.sectionID) == 'Fixture' &&
                        this.planogramService.getSelectionCount(this.sectionID) == 1
                    ) {
                        this.planogram2DService.selectNextFixture();
                    }
                    this.sharedService.propertyGridUpdateData.next(true);
                }
                //left arrow : selectPreviousPosition
                if (key == 'arrowleft') {
                    const isModularValue = this.planogramService.rootFlags[this.sectionID].isModularView;
                    if (isModularValue) {
                        this.sharedService.isNiciFeatureNotAllowed('MOVEMODULAR')
                            ? ''
                            : this.planogram2DService.moveModular(ctx, key);
                    } else if (
                        this.planogramService.getLastSelectedObjectType(this.sectionID) == 'Position' &&
                        this.planogramService.getSelectionCount(this.sectionID) == 1
                    ) {
                        this.planogram2DService.selectPreviousPosition();
                    } else if (
                        this.planogramService.getLastSelectedObjectType(this.sectionID) == 'Fixture' &&
                        this.planogramService.getSelectionCount(this.sectionID) == 1
                    ) {
                        this.planogram2DService.selectPreviousFixture();
                    }
                    this.sharedService.propertyGridUpdateData.next(true);
                }
                if (key == '>') {
                    this.planogram2DService.incrementFacingsByOne(ctx, this.sectionObject);
                    this.updateInPlanoWs();
                    this.planogramService.updateNestedStyleDirty = true;;
                }
                //< : decrement facings
                if (key == '<') {
                    this.planogram2DService.decrementFacingsByOne(ctx, this.sectionObject);
                    this.updateInPlanoWs();
                    this.planogramService.updateNestedStyleDirty = true;;
                }

                if (keysByCode.indexOf(event.which) != -1) {
                    //@pratik need to check actual use case
                    var facingNo = keysByCode.indexOf(event.which); // uses as glboal Scope
                } else if (numpadKeyCode.indexOf(event.which) != -1) {
                    facingNo = numpadKeyCode.indexOf(event.which);
                }

                if (facingNo >= 0) {
                    this.planogram2DService.increaseFacing(facingNo + 1, this.sectionObject);
                    this.updateInPlanoWs();
                    setTimeout(() => {
                        this.sharedService.renderPositionAgainEvent.next(true);
                        this.sharedService.updateGrillOnFieldChange.next(true);
                        this.planogramService.updateSectionObjectIntoStore(this.sectionObject.IDPOG, this.sectionObject);
                    })
                }
                // ESC - remove All Selction
                if (key == 'escape') {
                    this.planogramService.removeAllSelection(this.sectionID);
                    this.planogramService.updateNestedStyleDirty = true;
                    this.sharedService.updateFooterNotification.next(true);

                    event.stopPropagation();
                    return false;
                }
                // Delete -
                if (key == 'delete') {
                    this.planogram2DService.delete();
                    this.render2d.isDirty = true;
                    this.planogramService.updateNestedStyleDirty = true;;
                    event.stopPropagation();
                    return false;
                }

                this.planogramService.updateNestedStyleDirty = true;;
            }
        }
    }

    /**
     * When the user uses combination of keys, with the keyup as the driver to handle shortcut actions,
     * the system expects the user to leave the ctrl/shift key at the end or both keys together. This will result
     * in inconsistant capture of events since the user can leave the ctrl/shift key, where even 0.1 sec early will result
     * in event not captured.
     * Hence the ctrl/shift key is considered on keydown event and used in combination with keyup of other keys,
     * This methods reset the ctrl/shift key pressed, but with a certain delay to ensure the user can leave any key first.
     */
    private resetCtrlState(isCtrlStillPressed: boolean): void {
        if (isCtrlStillPressed) {
            return;
        }
        setTimeout(() => {
            window.ctrlPressed = false;
        },600);
    }

    private resetShiftState(isShiftStillPressed: boolean): void {
        if (isShiftStillPressed) {
            return;
        }
        setTimeout(() => {
            window.shiftPressed = false;
        }, 600);
    }

    private showHideHighlight() {
        this.planogramService.highlightPositionEmit.next(true);
        this.shoppingCartService.checkForChangeInCart.next(false); // To apply the highlights in shopping cart items
        this.highlightService.highlightInitialized && !this.highlightService.highlightDestroyed ? this.sharedService.showHighlight.next(true) : '';
    }

    private updateInPlanoWs(): void {
        //Facing related changes
        let pos: ObjectListItem[] = this.planogramService.getSelectedObject(this.sectionID);
        pos.forEach((element) => {
            if (element.ObjectDerivedType == 'Position') {
                const dObj = {
                    field: 'Position.FacingsX',
                    newValue: element.Position.FacingsX,
                    IDPOGObject: element.IDPOGObject,
                    gridType: 'Position',
                    tab: '',
                    products: pos,
                };
                this.sharedService.workSheetEvent.next(dObj); //update in worksheet
                this.render2d.setDirty(dObj);
                this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
                this.planogramService.updateNestedStyleDirty = true;
            }
        });
    }

    private savePlanogram(): void {
        const sectionId = this.sharedService.getActiveSectionId();
        if (sectionId) {
            if (this.sharedService.isSaveAllInProgress && this.sharedService.allPogsToSaveInSaveAll.some(id => id === sectionId)) {
                this.notifyService.warn('SAVE_ALREADY_IN_PROGRESS', 'undo');
                return; //this cannot be moved to planogram save service as we cannot differentiate save all processing against save
            }
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

    public onSectionClick(event: MouseEvent, sectionId: number): void {
        if (
            (event.target as HTMLElement).id != `intersectingPosition-holder-id-${this.sharedService.activeSectionID}`
        ) {
            this.intersectionChooserHandler.closePop(sectionId);
            if ((event.target as HTMLElement).id == '') {
                event.stopPropagation();
            }
        } else {
            event.stopPropagation();
        }
    }

    private removeAnotherPogAnnotation(): void {
        document.querySelectorAll(`.removeline_${this.panelID}`).forEach((element: Element) => {
            if (element.id != `removelineforPog_${this.sectionObject.IDPOG}`) {
                element.parentNode.removeChild(element);
            }
        });
        this.cd.detectChanges();
    }

    //To check intersections while loading the planogram to turn fitcheck on/off
    public quadTreeInitTimeout(datasource: Section): void {
        let sectionID = datasource.$id;

        try {
            //This check is needed if user changed the active pog after dowloading the pog and before creating the quad tree it will be recursive loop
            if (this.sharedService.getActiveSectionId() == sectionID) {
                datasource.checkInitFitCheckErrors();
            }
        } catch (e) {
            this.quadTreeInitTimeout(datasource);
        }
    }

    private updateBlockView(): void {
      this.displayBlockMode = `displayBlockMode${this.planogramService.rootFlags[this.sectionObject.$id].blockview}`;
      if(this.planogramService.rootFlags[this.sectionObject.$id].blockview === BlockDisplayType.POSITIONS_WITHOUT_BLOCKS) {
        const sectionId = this.sharedService.getActiveSectionId()
        const positions = this.sharedService.getAllPositionFromSection(sectionId);
        this.allocateUtils.showItemsWithoutBlock(positions, sectionId);
      } else {
        this.allocateUtils.resetItemsWithoutBlock();
      }
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}
