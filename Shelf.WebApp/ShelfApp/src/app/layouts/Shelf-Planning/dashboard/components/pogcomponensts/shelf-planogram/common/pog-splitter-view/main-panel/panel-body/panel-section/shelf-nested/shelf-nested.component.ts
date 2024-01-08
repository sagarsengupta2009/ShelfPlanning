import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Observable, of, Subscription } from 'rxjs';
import { CoffinTypes, FixtureList, ObjectListItem, SelectableList } from 'src/app/shared/services/common/shared/shared.service';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { PogSideNaveView } from 'src/app/shared/models'
import {
  IntersectionChooserHandlerService, PlanogramService, SharedService,
  LocalSearchService, Planogram_2DService, PlanogramStoreService,
  BlockHelperService, PanelService, PogSideNavStateService,
  ParentApplicationService,
  ContextMenuService,
  MoveService,HighlightService
} from 'src/app/shared/services';
import { DragOrigins, IDragDrop } from 'src/app/shared/drag-drop.module';
import { Block, Position, Section } from 'src/app/shared/classes';
import { StyleRecursiveObj } from 'src/app/shared/models/planogram/planogram';
export interface ClassObj {
  [key: string]: boolean
}

@Component({
  selector: 'sp-shelf-nested',
  templateUrl: './shelf-nested.component.html',
  styleUrls: ['./shelf-nested.component.scss'],
})
export class ShelfNestedComponent implements OnChanges, OnInit, OnDestroy {
  @Input() hightLightOptions;
  @Input() panelID: string;
  @Input() items: ObjectListItem[] = [];
  @Input() nestedItemKey; //= 'Children';
  @Input() offsetX: number = 0;
  @Input() offsetY: number = 0;
  @Input() offsetZ: number = 0;
  @Input() flip: number = 0;
  @Input() id: any;
  @Input() bycoordinate: boolean = true;
  private prevElementIndex: number = -1;
  public data$: Observable<ObjectListItem[]>;
  private subscriptions = new Subscription();
  public sectionID: string;

  constructor(
    private readonly sharedService: SharedService,
    private readonly parentApp: ParentApplicationService,
    private readonly planogramService: PlanogramService,
    public readonly localSearch: LocalSearchService,
    private readonly planogram2dService: Planogram_2DService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly cd: ChangeDetectorRef,
    private readonly intersectionChooserHandlerService: IntersectionChooserHandlerService,
    private readonly panelService: PanelService,
    private readonly blockHelperService: BlockHelperService,
    private readonly PogSideNavStateService: PogSideNavStateService,
    private contextMenuService: ContextMenuService,
    private readonly moveService: MoveService,
    private readonly highlightService:HighlightService
  ) {

   }

  ngOnInit(): void {


    /**
     * TODO @karthik
     * The problem is, shelf-nested is a child component of panel-section and panel-section has onPush change detection.
     * This results in data updates triggered due to events/action outside shelf-nested will not be detected.
     * hence this manual mark for check.
     * This can be eliminated by elimniating onPush for panel-section,
     * update the trackby on shelf-nested to factor in some addtional factors to track by if necessary.
     * Need to test on consequences.
     */
    this.subscriptions.add(this.planogramService.updateNestedStyle.subscribe((res) => {
        this.cd.detectChanges();
    }));
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.data$ = of(this.items);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  //Added this code for resolved grill and divider issue
  public itemclicked(item: SelectableList, $event: MouseEvent): void {
    if (this.moveService.isDragging) {
      return;
    }
    if (this.sharedService.freeFlowOn.panelOne || this.sharedService.freeFlowOn.panelTwo) return;
    this.updatePanel(item.$sectionID);
    let rootObj = this.sharedService.getObject(item.$sectionID, item.$sectionID) as Section;
    this.getObjectBasedOnView($event, this.bycoordinate, rootObj, item);
    this.sharedService.fixtureTypeMultiple = false;
    if (document.activeElement instanceof HTMLElement && !this.sharedService.isItemScanning) { //itemscan is on copypaste of products cannot be done becuse focus will be on the search input
      document.activeElement.blur();
    }
    $event.stopPropagation();
  }

  public ctrlSelectObject(object: ObjectListItem): void {
    let lastSelectedType = this.planogramService.getLastSelectedObjectDerivedType(object.$sectionID); //Find last selected type
    let parentObj = this.sharedService.getObject(object.$idParent, object.$sectionID); //Find parent of object
    if (this.planogramService.rootFlags[object.$sectionID].selectionCount > 1 &&
      this.planogramService.checkSelectedByObject(object, object.$sectionID) != -1) {
      this.planogramService.removeFromSelectionByObject(object, object.$sectionID);
      this.sharedService.itemSelection.next({
        pogObject: object,
        view: 'removeSelection',
      });
      return;
    }
    if ((lastSelectedType != '' && object.ObjectDerivedType != lastSelectedType) ||
      (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
        this.sharedService.getLastSelectedParentDerievedType(object.$sectionID) == AppConstantSpace.SHOPPINGCARTOBJ &&
        parentObj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ)
    ) {
      //if different object clicked
      return;
    }
    if (this.planogramService.rootFlags[object.$sectionID].isModularView) {
      this.planogramService.removeAllSelection(object.$sectionID);
      this.sharedService.RemoveSelectedItemsInWS.next({
        view: 'removeSelectionInWS',
      });
    }
    this.planogramService.addToSelectionByObject(object, object.$sectionID);
    this.sharedService.itemSelection.next({
      pogObject: object,
      view: 'ctrl',
    });
  };

  public shiftSelectObject(object: ObjectListItem): void {
    let lastSelectedType = this.planogramService.getLastSelectedObjectDerivedType(object.$sectionID); //Find last selected type
    let parentObj = this.sharedService.getObject(object.$idParent, object.$sectionID); //Find parent of object

    if (this.planogramService.rootFlags[object.$sectionID].selectionCount > 1 &&
      this.planogramService.checkSelectedByObject(object, object.$sectionID) != -1 ) {
      this.planogramService.removeFromSelectionByObject(object, object.$sectionID);
      this.sharedService.itemSelection.next({
        pogObject: object,
        view: 'removeSelection',
      });
      return;

    }

    if ((object.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT) ||
      (lastSelectedType != '' && object.ObjectDerivedType != lastSelectedType) ||
      (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
        this.sharedService.getLastSelectedParentDerievedType(object.$sectionID) ==
        AppConstantSpace.SHOPPINGCARTOBJ && parentObj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ)
    ) {
      //if different object clicked
      return;
    }

    this.planogram2dService.selectItemsWithShiftKey(object);
  };


  public getDragDropData(itemData: IDragDrop): IDragDrop {
    // This method is used to remove all additional properties and make the obj light weight
    return {
      $id: itemData.$id,
      ObjectDerivedType: itemData.ObjectDerivedType,
      $sectionID: itemData.$sectionID,
      dragOriginatedFrom: DragOrigins.Planogram,
      dragDropSettings: itemData.dragDropSettings,
    };
  }

  public updatePanel(sectionId: string): void {
    this.panelService.updatePanel(this.panelID, sectionId);
    this.planogramService.setSelectedIDPOGPanelID(this.panelID);
  }

  public onRightClick(event: MouseEvent, child: SelectableList): boolean {
    //check if you right clicked on already selected items
    if (this.planogramService.rootFlags[child.$sectionID].selectionCount <= 1) {
      //updating Active panel ID
      this.sharedService.fixtureTypeMultiple = false;
      this.updatePanel(child.$sectionID);
      if (this.planogramService.rootFlags[child.$sectionID].isModularView) {
        this.planogramService.removeAllSelection(this.sharedService.activeSectionID);
        child.selected = true;
        this.planogramService.addToSelectionByObject(child, this.sharedService.activeSectionID);

      } else if (!this.sharedService.rubberBandOn) {
        this.intersectionChooserHandlerService.initiate(child.$sectionID, event, child.$sectionID);
        let objectsIntersect = this.intersectionChooserHandlerService.rootFlags[child.$sectionID].objectIntersecting;
        if (objectsIntersect.length == 1 && objectsIntersect[0].ObjectDerivedType === AppConstantSpace.FIXTUREOBJ) {
          child = this.sharedService.getObject(objectsIntersect[0].id, child.$sectionID) as FixtureList;
        }
        this.planogramService.removeAllSelection(this.sharedService.activeSectionID);
        this.planogramService.addToSelectionByObject(child, this.sharedService.activeSectionID);
      }
      if (this.sharedService.rubberBandOn) return;
      this.itemclicked(child, event);
      let selectedItem = this.planogramService.getSelectedObject(child.$sectionID);
      this.contextMenuService.rightClick.next({event: event, data: selectedItem[selectedItem.length - 1] || child})
    }
    event.stopPropagation();
    return false;
  };

  public styleIt(itemData: ObjectListItem): StyleRecursiveObj {
    if (this.panelService.panelPointer[this.panelID]['sectionID'] === itemData.$sectionID) {
      let style: any = {};
      let parentObj = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID);
      if (parentObj === null) {
        return;
      }
      let dims = itemData.Dimension;
      let frontLocation: any = itemData.Location;
      if ('getFrontLocation' in itemData) {
        if (!Utils.isNullOrEmpty(itemData.getFrontLocation)) {
          frontLocation = itemData.getFrontLocation();
        }
      }

      //by-co-ordinate tells whether its a 2D recusrive renderer OR intersection popup renderer
      if (this.bycoordinate != undefined && !this.bycoordinate) {
        if ('getIntersectingPopLocation' in itemData) {
          frontLocation = itemData.getIntersectingPopLocation();
          if (frontLocation.X == 0) { frontLocation.X = 0.001; }
        }
        //This tweak is to show the item at correct location, in stylearea method if left is zero it is removing the left property
        style.left = this.planogramService.convertToPixel(frontLocation.X, itemData.$sectionID) + 'px';
      } else {
        style.left = this.planogramService.convertToPixel(this.getOffsetX(itemData, false), itemData.$sectionID) + 'px';
      }
      style.width = this.planogramService.convertToPixel(dims.Width, itemData.$sectionID) + 'px';
      let height: number = 0;
      //below if condition added due to basket is not showing property after changing depth dimension
      if (itemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
        itemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ) {
        if (itemData.Fixture.DisplayViews) {
          height = dims.Depth
        }
        else {
          height = dims.Height
        }
      }
      else {
        if (this.isYZSwapped(parentObj)) {
          height = this.getFlip(parentObj) ? dims.Height : dims.Depth;
        } else {
          height = this.getFlip(parentObj) ? dims.Depth : dims.Height;
        }
      }
      style.height = this.planogramService.convertToPixel(height, itemData.$sectionID) + 'px';
      style.bottom =
        this.planogramService.convertToPixel(this.getOffsetY(itemData, false), itemData.$sectionID) + 'px';
      if (!(itemData.ObjectDerivedType == AppConstantSpace.MODULAR &&
        this.planogramService.rootFlags[itemData.$sectionID].isModularView)) {
        style.zIndex = Math.ceil(this.getOffsetZ(itemData, false) * 100);
      }
      // Added due to grill is showing in back of position
      // if (parentObj.ObjectDerivedType == "StandardShelf" && this.bycoordinate) {
      //   itemData.ObjectDerivedType == 'Position' ? style.zIndex = -1 : '';
      // }

      //DC-TODO make the highlight more generic
      var sectionId = this.sharedService.getActiveSectionId();
      var settingsBySection = this.planogramService.getSettingsBySectionId(sectionId);
      var isStandardShelfWithForegroundImage = parentObj.ObjectDerivedType == 'StandardShelf' && parentObj.Fixture.ForegroundImage?.Url;
      if (settingsBySection.isEnabled && itemData.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT && !isStandardShelfWithForegroundImage) {
        if (itemData.hasAbilityForLocalSearch && this.localSearch.localSearchStatus) {
          if (itemData.localSearchFlag) {
            style.backgroundColor = itemData.highlightColor(this.planogramService.templateRangeModel, itemData);
          }
        } else {
          style.backgroundColor = itemData.highlightColor(this.planogramService.templateRangeModel, itemData, this.highlightService.options);
        }
      }

      itemData = itemData as Position;
      style.opacity = itemData.getOpacity();
      style.idPogObject = itemData.IDPOGObject;
      if(itemData.selected){
        const sectionID = itemData.$sectionID;
        const scaleF = this.planogramService.rootFlags[sectionID].scaleFactor;
        const sizeReductionF = this.planogramService.rootFlags[sectionID].sizeReductionFactor;
        style.strokeWidth = (0.3 * sizeReductionF) / (5 * scaleF);
      }
      // Only set the overrides over the style class recursiveObj & recursiveChild. Do not duplicate styles.
      if (style.left == 0) { delete style.left; }
      if (style.width == 0) { delete style.width; }
      if (style.height == 0) { delete style.height; }
      if (style.bottom == 0) { delete style.bottom; }
      if (style.zIndex == 1) { delete style.zIndex; }
      return style;
    }
  }

  private getFlip(itemData: ObjectListItem): number {
    //   return this.flip > 0 ? this.flip : (itemData.Fixture && itemData.Fixture.DisplayViews) ? itemData.Fixture.DisplayViews : 0;
    if (
      itemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
      itemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ
    ) {
      return itemData.Fixture && itemData.Fixture.DisplayViews ? itemData.Fixture.DisplayViews : 0;
    }
    return 0;
  }

  private isYZSwapped(itemData: ObjectListItem): boolean {
    try {
      return (
        itemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
        itemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ
      );
    } catch (e) {
      return false;
    }
  }

  public getOffsetX(itemData: ObjectListItem, useChild: boolean = true): number {
    let childOffset: number = useChild ? itemData.ChildOffset.X : 0;
    return itemData.Location ? itemData.Location.X + childOffset + this.offsetX : this.offsetX;
  }

  public getOffsetY(itemData, useChild: boolean = true): number {

    let childOffset: number;
    let pos: number;
    let locationYZswapValue : number;
    if (this.getFlip(itemData)) {
      childOffset = useChild ? (this.isYZSwapped(itemData) ? itemData.ChildOffset.Y : itemData.ChildOffset.Z) : 0;
      pos = itemData.Location
        ? itemData.Location.Y +
        itemData.Dimension.Height -
        itemData.Dimension.Depth +
        childOffset +
        this.offsetY
        : this.offsetY;
    } else {
      childOffset = useChild ? (this.isYZSwapped(itemData) ? itemData.ChildOffset.Z : itemData.ChildOffset.Y) : 0;
      let parentObj = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID) as CoffinTypes;
      if (parentObj && [AppConstantSpace.BASKETOBJ, AppConstantSpace.COFFINCASEOBJ].includes(parentObj.ObjectDerivedType) && !parentObj.Fixture.DisplayViews) {
        locationYZswapValue = itemData.Location.Z; //for front view z is considered
      } else {
        locationYZswapValue = itemData.Location.Y;
      }
      pos = itemData.Location? locationYZswapValue + childOffset + this.offsetY + itemData.Dimension.Depth * Math.sin(Utils.degToRad(itemData.Rotation.X)) : this.offsetY;
    }
    return pos;
  }

  public getOffsetZ(itemData: ObjectListItem, useChild: boolean = true): number {
    //TODO: Really need each POGObject to return their Z offset
    let childOffset: number = useChild ? itemData.ChildOffset.Z : 0;
    let Zfront: number = 0;
    switch (itemData.ObjectDerivedType) {
      case AppConstantSpace.STANDARDSHELFOBJ:
        Zfront = itemData.Dimension.Depth;
        childOffset = (itemData.Fixture.HasGrills && childOffset > 0) ? childOffset : 0;
        break;
      case AppConstantSpace.BLOCKOBJECT:
        let block = itemData as Block;
        // for non std fixtures, have it sync with positions.
        //TODO @karthik Need to calculate based on parent zfront?
        if(block.parent.ObjectDerivedType !== AppConstantSpace.STANDARDSHELFOBJ) {
          return 0.02;
        }
        return 10;
      case AppConstantSpace.POSITIONOBJECT:
        //move the position slightly in front of the Shelf
        Zfront = .01 - itemData.Location.Z;
        if(itemData.hasBackItem){
          Zfront+= 2;
        }
        break;
      case AppConstantSpace.GRILLOBJ:
        //move the Grill slightly in front of the Position
        Zfront = .03;
        break;
      case AppConstantSpace.MODULAR:
        Zfront = .01;
        break;
      default:
        Zfront = itemData.ObjectType == AppConstantSpace.FIXTUREOBJ ? .01 : 0;
        break
    }
    let locZ = itemData.Location.Z;
    itemData.ObjectDerivedType === 'Modular' && locZ > 0 ? locZ = 0 : '';
    let offsetZ = (locZ + Zfront + childOffset + this.offsetZ);
    offsetZ = offsetZ > 0 ? offsetZ : 0.01;
    return itemData.Location ? offsetZ : this.offsetZ;
  }

  public trackByFun(index, item: ObjectListItem): string {
    return item.$id;
  };

  private getObjectBasedOnView(event: MouseEvent, bycoordinate: boolean, rootObj: Section, selectedObj?: SelectableList): { 'objectType': string, 'object': ObjectListItem } {
    let selectionObj: SelectableList=rootObj;
    let objectType = null;
    let positionsIntersect = null;
    let objectsIntersect = null;
    const activeSectionId = this.sharedService.activeSectionID;

    /* If is modular View > We will disable Position and Standardshelf and Blockfixture Selection    */
    if (this.planogramService.rootFlags[activeSectionId].isModularView) {
      this.objectClicked(selectedObj, event);
    } else {
      //  this.IntersectionChooserHandler.closePop(that.$sectionID);
      if (bycoordinate) {
        //window.TempSelectByIntersect) {
        this.intersectionChooserHandlerService.initiate(activeSectionId, event, activeSectionId);
        objectsIntersect = this.intersectionChooserHandlerService.rootFlags[activeSectionId].objectIntersecting;
        if (objectsIntersect.length > 1) {
          positionsIntersect = this.intersectionChooserHandlerService.rootFlags[activeSectionId].storage.Position;
          if (positionsIntersect.length > 1) {
            /*show dialog*/
            this.intersectionChooserHandlerService.openPop(activeSectionId);
          } else {
            if (positionsIntersect.length != 0) {
              //one fixtureType and one position
              //then select position
              selectionObj = this.sharedService.getObject(positionsIntersect[0].$id, activeSectionId) as Position;
              objectType = Utils.getFullObjectType(selectionObj);
              this.objectClicked(selectionObj, event);
            } else {
              const intersectionArray = ['StandardShelf', 'Basket', 'CoffinCase', 'Crossbar', 'Pegboard', 'Slotwall', 'BlockFixture', 'Nested', 'Block', 'Modular', 'Section'];
              for (const kind of intersectionArray) {
                const fixtures = this.intersectionChooserHandlerService.rootFlags[activeSectionId].storage[kind];
                /*Fixture count if it is more than one select that object*/
                if (fixtures.length > 0) {
                  selectionObj = this.sharedService.getObject(fixtures[0].$id, activeSectionId) as  Position;
                  objectType = Utils.getFullObjectType(selectionObj);
                  break;
                }
              }
              this.objectClicked(selectionObj, event);
            }

          }
        } else if (objectsIntersect.length == 1) {
          /*only when one object is clicked*/
          selectionObj = this.sharedService.getObject(objectsIntersect[0].id, activeSectionId) as SelectableList ;
          objectType = Utils.getFullObjectType(selectionObj);
          this.objectClicked(selectionObj, event);
        } else if (objectsIntersect.length == 0) {
          // If object is a standard shelf and coordinates don't find it use the object
          var thatObjectType = Utils.getFullObjectType(selectedObj);
          if (thatObjectType == "standardshelf") {
            selectionObj = selectedObj;
            objectType = thatObjectType;
            this.objectClicked(selectedObj, event);
          }
        }
      } else {
        this.objectClicked(selectedObj, event);
      }
    }
    this.sharedService.selectedObject(selectionObj);
    return { 'objectType': objectType, 'object': selectionObj };
  }

  private objectClicked(item: ObjectListItem, $event: MouseEvent): void {
    this.sharedService.isItemClickedOnPlanogram = true;
    switch (true) {
      case $event.ctrlKey:
        //add to selctionobject
        this.ctrlSelectObject(item);
        this.planogramService.selectionEmit.next(true);
        break;
      case $event.shiftKey:
        //add to selctionobject
        this.shiftSelectObject(item);
        this.planogramService.selectionEmit.next(true);
        break;
      case this.prevElementIndex === Number(item.$id):
        this.prevElementIndex = -1;
        break;
      default:
        //remove context menu if available
        this.sharedService.setActiveSectionId(item.$sectionID);
        if (this.sharedService.isItemScanning) {
          // item scanning search space to be focused on click
          let ele = document.getElementById('search') as HTMLInputElement;
          if (ele) {
            ele.focus();
            ele.select();
          }
        }
        this.planogramService.setSelectedIDPOGPanelID(this.panelID); //set active panel id
        this.contextMenuService.removeContextMenu();
        this.prevElementIndex = Number(item.$id);

        // one sec delay to check for double clicks.
        setTimeout(() => {
          this.prevElementIndex = -1;
        }, 1000);

        // remove all annotation if selected
        this.planogramService.updateAnnotationSelection.next(true);


        //remove all selctions
        this.planogramService.removeAllSelection(this.sharedService.activeSectionID);

        if (item.ObjectDerivedType == AppConstantSpace.BLOCKOBJECT) {
          item = item as Block;
          this.blockHelperService.selectBlocks(item.attributeValue);
        }
        else if ((this.planogramService.rootFlags[item.$sectionID].isModularView && item.ObjectDerivedType == "Modular") || (item.ObjectDerivedType != "Modular")) { // if not modular then show selection for others type
          item.selected = true;
          //add selected item
          this.planogramService.addToSelectionByObject(item, this.sharedService.activeSectionID);
        }
        else {
          item.selected = false;
        }
        if (this.PogSideNavStateService.propertiesView.isPinned && (!this.PogSideNavStateService.activeVeiw == PogSideNaveView.PROPERTYGRID as any)) {
          this.sharedService.openSelectedComponentInSideNav.next({ activeScreen: 'PG', isPin: true });
        }
        this.sharedService.propertyGridUpdateData.next(true);
        const storedMode = this.planogramStore.splitterViewMode;
        if (this.panelService.panelPointer.panelOne.IDPOG === this.panelService.panelPointer.panelTwo.IDPOG && ((storedMode.displayMode === 1 || storedMode.displayMode === 2))
          || this.parentApp.isAllocateApp
          || this.parentApp.isAssortAppInIAssortNiciMode
        ) {
          {
            this.sharedService.itemSelection.next({
              pogObject: item,
              view: 'panalView',
            });
          }
        }
        //Added for modular stylying
        this.sharedService.styleModuleSelect.next(true);

        break;
    }
  }
}

