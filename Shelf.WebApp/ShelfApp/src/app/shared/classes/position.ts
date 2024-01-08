import { AppConstantSpace } from '../constants/appConstantSpace';
import { Orientation } from './orientation';
import * as _ from 'lodash';
import { TranslateService } from '@ngx-translate/core';
import { PlanogramObject } from './planogram-object';
import { Utils } from '../constants/utils';
import { IDragDropSettings } from '../drag-drop.module';
import { BlockFixture } from './block-fixture';
import { FixtureList, MerchandisableList, PositionParentList } from '../services/common/shared/shared.service';
import { ShoppingCart } from './shopping-cart';
import { Modular } from './modular';
import { StandardShelf } from './standard-shelf';
import {
  PositionResponse, InventoryConstraints,
  LabelCustomizedObject, PegInfo, PositionPosition, Size3, RefreshParams, PositionObjectResponse, DividerInfo, AssortRecADRI, UnitPackageItemInfos, LookUpChildOptions
} from '../models';

import { NotifyService, SharedService, PlanogramService, HistoryService, PlanogramStoreService, DataValidationService, ColorService, ParentApplicationService, PegLibraryService, CrunchMode } from '../services';
import { FourDirectionValues } from '../models';
import { PegBoard, Section } from '.';
import { Context } from './context';
import { Coffincase } from './coffincase';
import { DividerTypes } from '../constants/fixtureCrunchModes';
import { isEmpty } from 'lodash';
import { PegLibrary } from '../models/peg-library';
import { AllocateUtilitiesService } from '../services/layouts/allocate/utilities/allocate-utilities.service';

declare const window: any;

export class Position extends PlanogramObject implements Partial<PositionObjectResponse> {

  /** used only by coffincase, set as true when .addPosition is called */
  public justmod?: boolean;
  public pegOffsetX: number = 0;
  public pegOffsetY: number;
  ObjectDerivedType: 'Position';
  readonly ObjectType: 'Position';
  backgroundColor: string;
  // @og added by planogram-save.updateSVGWithIdPogObject
  IdPogObject?: string;
  Guid?: string;
  imageFailed = false;
  config;
  selected = false;
  isPosition = true;
  upc = 0;
  spreadSpanPosNo = null;
  localSearchFlag = false;
  hasAbilityForLocalSearch = true;

  minMerchHeight = 0;
  dragDropSettings: IDragDropSettings = { drag: true, drop: false };
  public spredSpanPositionProperties = { xSpread: 0, isSpreadPosition: false };

  $packageBlocks: any = new Array();// TODO: @salma An interface property cannot have an initializer
  positoinLockFlag = false;
  prevOrinetation: { value: number; } = { value: 0 };
  defaultOrinetation: { value: number; XPegHole: number; YPegHole: number, ProductPegHole2X: number } = { value: 0, XPegHole: 0, YPegHole: 0, ProductPegHole2X: 0 };
  baseItem = '';
  hasBackItem = false;
  hasAboveItem = false;

  OrientNS = new Orientation();

  Position: PositionPosition;
  minMerchIntersectFlag: boolean;
  Key: string;

  // TODO @og doesn't contain a value on runtime
  Communicator: any;
  // doesn't exist initial on position but added by coffincase
  ParentKey?: string;
  // doesn't exist initially on position
  number?: Number;

  // added by intersection-chooser-handler.service.ts - setObjectIntersected()
  public IntersectionLocation: { X: number; Y: number; };

  /** when section.computeMerch is called, this is set to undefined */
  public cachedShrinkWidth: number;
  public unitTopCapFacingsX: number = 0;
  public unitTopCapFacingsY: number = 0;
  public unitTopCapFacingsZ: number = 0;
  public unitBackCapFacingsY: number = 0;
  public unitBackCapFacingsZ: number = 0;
  public unitBackCapCapacity: number = 0;
  public unitTopCapCapacity: number = 0;
  public unitDimensions:{ unitHeight: number, unitWidth: number, unitDepth: number };
  public unitPackageItemInfos: UnitPackageItemInfos;  // used for stopping facing increment for cloned position while filling the basket/coffincase
  public calculatedShrinkValues: { [key: string]: number } = {};
  
  constructor(
    data: PositionResponse,
    public notifyService: NotifyService,
    public translate: TranslateService,
    public sharedService: SharedService,
    public planogramService: PlanogramService,
    public historyService: HistoryService,
    public planogramStore: PlanogramStoreService,
    private readonly dataValidation: DataValidationService,
    private readonly colorService: ColorService,
    private readonly parentApp: ParentApplicationService,
    public pegLibraryService:PegLibraryService,
    private readonly allocateUtils: AllocateUtilitiesService
  ) {
    super(sharedService, data);
  }

  // all except section grill and dividier
  get parent(): PositionParentList {
    return super.parent as PositionParentList;
  }

  public getLabelCustomizedObject(params: any, labelFields: string[], currentLabel): LabelCustomizedObject {

    const asNumber = (value: number | string) => typeof value == 'number' ? value : parseInt(value);
    // const currentLabel = this.planogramService.labelItem['POSITION_LABEL']['LABEL_'+ label];
    //for text
    return {
      text: labelFields.map(labelField => {
        let tempword: Position | number | string = this;
        try {
          for (const element of labelField.split('.')) {
            tempword = tempword[element];
          }
          if (tempword === undefined) {
            return labelField.replaceAll('\\n', '\n').replaceAll('\xB7', '.');
          }
          tempword = tempword === null ? "" : tempword;
          if (typeof tempword === 'number' && Math.floor(tempword) !== tempword) {
            return tempword = currentLabel.DECIMALS != -1 ? tempword.toFixed(currentLabel.DECIMALS) : tempword;
          }
          return tempword;
        } catch (e) {
          console.log(`${labelField} could not be found in ${this.ObjectDerivedType}`);
        }
      }).filter(it => it).join(' '),
      //for font

      fontsize: currentLabel.FONT_SIZE ? currentLabel.FONT_SIZE : "12px",
      fontcolor: currentLabel.FONT_COLOR ? currentLabel.FONT_COLOR : "#000",
      fontfamily: currentLabel.FONT_FAMILY ? currentLabel.FONT_FAMILY : "Roboto",
      backgroundcolor: currentLabel.BACKGROUND_COLOR ? currentLabel.BACKGROUND_COLOR : "#FFF",
      fontStyle: currentLabel.FONT_STYLE ? currentLabel.FONT_STYLE : "normal",
      opacity: currentLabel.TRANSPARENCY / 100,
      strokecolor: currentLabel.STROKE_COLOR,
      //orientation
      orientation: currentLabel.LABEL_ORIENTATION,
      //alignments
      alignment: 'bottom-left',
      yAlignment: currentLabel.HORIZONTAL_ALIGNMENT ? currentLabel.HORIZONTAL_ALIGNMENT : 0, // horizontal and vertical are mixed up in the DB and configuration, so need to assign to something logical here
      xAlignment: currentLabel.VERTICAL_ALIGNMENT ? currentLabel.VERTICAL_ALIGNMENT : 0, // horizontal and vertical are mixed up in the DB and configuration, so need to assign to something logical here
      //decimals
      decimals: currentLabel.DECIMALS || -1,
      //word wrap
      wordwrap: currentLabel.WORD_WRAP,
      //shrink to fit
      shrinkToFit: currentLabel.SHRINK_TO_FIT,
      stretchToFacing:currentLabel.STRECH_TO_FACING,
      //character width calc mchanism
      calcMechanism: 'canvas',
      ...params,
    };
  }

  public getAuthCodeForView(): string {
    if (this.planogramService.ruleSets || this.planogramService.isReviewMode) {
      if (window.parent.currentProjectType != 'NICI') {
        return 'auth-code-pattern0';
      }
    }
    if (this.Position.Product.ProdAuth == undefined) return "";
    if (Utils.isNullOrEmpty(this.Position.Product.ProdAuth.AuthFlag) || JSON.stringify(this.Position.Product?.ProdAuth?.AuthFlag) == '{}') return '';
    return 'auth-code-pattern' + this.Position.Product.ProdAuth.AuthFlag;
  }

  public getColorForView(): string {
    return this.Position.attributeObject.Color_color;
  }

  public getPegholeYLocConsideringPegYOffset(): number {
    if (this.Position.HeightSlope != 0) {
      let pegOffsetY = this.Position._X05_PEGLENGTH.ValData * Math.sin(Utils.degToRad(this.Position.HeightSlope));
      return this.Location.Y + this.Position.ProductPegHoleY - pegOffsetY;
    } else {
      return this.Location.Y + (this.linearHeight() - (this.computeHeight() - this.getPegInfo().OffsetY));
    }
  }

  public getXPosToPog(): number {
    const parentObj = this.parent;
    if (Utils.checkIfstandardShelf(parentObj)) {
      let overhangXLeft = 0;
      if (parentObj.spreadSpanProperties.isSpreadSpan && parentObj.spreadSpanProperties.isLeftMostShelf) {
        overhangXLeft = parentObj.Fixture.OverhangXLeft;
      }
      if (!parentObj.spreadSpanProperties.isSpreadSpan) {
        overhangXLeft = parentObj.Fixture.OverhangXLeft;
      }
      return (
        parentObj.getXPosToPog() +
        parentObj.getSideThickness() +
        this.Location.X -
        overhangXLeft
      );
    }
    return parentObj.getXPosToPog() + parentObj.getSideThickness() + this.Location.X;
  }

  public getChildOffsetX(): number {
    return this.parent.getChildOffsetX();
  }

  public getYPosToPog(ignoreView?: boolean): number {
    try {
      let parentObj = this.parent as MerchandisableList;
      let locY = this.Location.Y;
      if (Utils.checkIfCoffincase(parentObj) || Utils.checkIfBasket(parentObj)) {
        locY = this.Location.Z;
      }
      return parentObj.getYPosToPog(ignoreView) + parentObj.getBottomThickness() + locY;
    } catch (ex) { }
  }

  public getZPosToPog(): number {
    const parentObj = this.parent;
    if (Utils.checkIfCoffincase(parentObj) || Utils.checkIfBasket(parentObj)) {
      return parentObj.getZPosToPog() + parentObj.getSideThickness() + this.Location.Y;
    }
    return parentObj.getZPosToPog() + this.Location.Z;
  }

  public getFrontYToPog(ignoreView?: boolean): number {
    const parentObj = this.parent as MerchandisableList;
    if (Utils.checkIfCoffincase(parentObj) || Utils.checkIfBasket(parentObj)) {
      return parentObj.getYPosToPog(ignoreView) + parentObj.getBottomThickness() + this.Location.Z;
    }
    return parentObj.getSelectFrontYToPog() + parentObj.getBottomThickness() + this.Location.Y;
  }

  public getSelectFrontYToPog(): number {

    let parentObj = this.parent
    if (Utils.checkIfCoffincase(parentObj) || Utils.checkIfBasket(parentObj)) {
      let locY = 0;
      if (!parentObj.Fixture.DisplayViews) {
        locY = this.Location.Z;
      } else {
        locY = this.Location.Y;
      }
      return parentObj.getSelectFrontYToPog() + parentObj.getBottomThickness() + locY;
    }
    return parentObj.getSelectFrontYToPog() + parentObj.getBottomThickness() + this.Location.Y;
  }

  public get12CoordernatesToPog(): { x: number; y: number }[] {
    const coordinateArr: { x: number; y: number }[] = [];
    const absYToPog = this.getYPosToPog();
    const absXToPog = this.getXPosToPog();
    const lh = this.linearHeight();
    const lw = this.linearWidth();
    const numberOfPoints = 20;
    const lhQ3 = lh / numberOfPoints;
    const lwQ3 = lw / numberOfPoints;

    const LB = { x: absXToPog, y: absYToPog };
    const RB = { x: absXToPog + lw, y: absYToPog };
    const LT = { x: absXToPog, y: absYToPog + lh };
    const RT = { x: absXToPog + lw, y: absYToPog + lh };
    let i = 0;
    //going anticlock wise from LB and getting 12 coorridates
    coordinateArr.push(LB);
    for (i = 1; i < numberOfPoints; i++) {
      coordinateArr.push({ x: LB.x + lwQ3 * i, y: LB.y });
    }
    coordinateArr.push(RB);
    for (i = 1; i < numberOfPoints; i++) {
      coordinateArr.push({ x: RB.x, y: RB.y + lhQ3 * i });
    }
    coordinateArr.push(RT);
    for (i = 1; i < numberOfPoints; i++) {
      coordinateArr.push({ x: LT.x + lwQ3 * i, y: LB.y });
    }
    coordinateArr.push(LT);
    for (i = 1; i < numberOfPoints; i++) {
      coordinateArr.push({ x: LB.x, y: LB.y + lhQ3 * i });
    }
    return coordinateArr;
  }

  public doesIntersectWithBox(boxCoord: { xstart: number; xend: number; ystart: number; yend: number; }) {
    return this.get12CoordernatesToPog().some(it => it.x > boxCoord.xstart && it.x < boxCoord.xend
      && it.y > boxCoord.ystart && it.y < boxCoord.yend);
  }

  public getStringColor(): string {
    const itemColor: string | number = this.Position.attributeObject.Color || this.Position.Product.Color || '#FFFFFF';
    return this.colorService.validateItemColor(itemColor);
  }

  public getInventoryConstraints(): InventoryConstraints {
    return {
      MaxFacingsX: this.Position.inventoryObject.FacingsMax,
      MinFacingsX: this.Position.inventoryObject.FacingsMin,
      MaxUnits: this.Position.inventoryObject.UnitsMax,
      MinUnits: this.Position.inventoryObject.UnitsMin,
      MaxCases: this.Position.inventoryObject.CasesMax,
      MinCases: this.Position.inventoryObject.CasesMin,
      MaxDOS: this.Position.inventoryObject.DOSMax,
      MinDOS: this.Position.inventoryObject.DOSMin,
    };
  }

  public getOrientation(): number {
    return this.Position.IDOrientation & 0x1f;
    // Temporary fix because IDOrientation is 1 based in the DB and need to be changed to 0 based
    //if (orientation > 0) {
    //    orientation -= 1;
    //orientation = Orientation.Orientation.Front_Bottom;
    //}
  }

  public setOrientation(orientation: number, data?: { oldVal: number }): void {
    /*feature undo-redo: dt. 13th Aug, 2104 by Abhishek */
    orientation = orientation == -1 ? this.getDefaultOrientation() : orientation;
    const oldValue = data && !isNaN(data.oldVal) ? data.oldVal : this.Position.IDOrientation;
    const original = ((that, v) => {
      return () => {
        this.setOrientation(v);
      };
    })(this, orientation);
    const revert = ((that, v) => {
      return () => {
        this.setOrientation(v);
      };
    })(this, oldValue);
    this.historyService.captureActionExec({
      funoriginal: original,
      funRevert: revert,
      funName: 'OrientationChange',
    });
    /*ends here*/
    const parentFixture = this.parent;
    if (Utils.checkIfPegType(parentFixture)) {
      // Calculate location x and y based on the old orientation
      this.Position.IDOrientation = oldValue & 0x1f;
      let pegInfo = this.getPegInfo();
      const prevLocX = this.Location.X + pegInfo.OffsetX;
      const prevLocY = this.Location.Y + this.linearHeight() - (this.computeHeight() - pegInfo.OffsetY);
      // Calculate location x and y based on the new orientation
      this.Position.IDOrientation = orientation & 0x1f;
      pegInfo = this.getPegInfo();
      const presLocX = this.Location.X + pegInfo.OffsetX;
      const presLocY = this.Location.Y + this.linearHeight() - (this.computeHeight() - pegInfo.OffsetY);
      this.Location.X = this.Location.X + (prevLocX - presLocX);
      this.Location.Y = this.Location.Y + (prevLocY - presLocY);
    } else {
      // Temporary fix because IDOrientation is 1 based in the DB and need to be changed to 0 based
      //this.Position.IDOrientation = (orientation & 0x1f) + 1;
      this.Position.IDOrientation = orientation & 0x1f;
    }
    // for Kendo grid
    this.Position.IDOrientationtext = Utils.findObjectKey(
      this.planogramStore.lookUpHolder.Orientation.options,
      this.Position.IDOrientation,
    );
    this.Position.IDOrientation = orientation & 0x1f;
    //updating in Position Worksheet
    const dObj = {
      field: 'Position.IDOrientation',
      newValue: this.Position.IDOrientation,
      IDPOGObject: this.IDPOGObject,
      gridType: 'Position',
      tab: null,
    };
    this.sharedService.workSheetEvent.next(dObj);
    if (this.sharedService.link == 'iAssort') {
      window.parent.postMessage(
        'invokePaceFunc:updateOrientation:["' +
        this.Position.IDProduct +
        '","' +
        this.Position.IDOrientationtext +
        '","' +
        this.Position.UsedLinear +
        '"]',
        '*',
      );
    }
  }

  public incrementOrientation(): void {
    this.setOrientation(this.getNextOrientation());
  }

  public decrementOrientation(): void {
    this.setOrientation(this.getPreviousOrientation());
  }

  public getNextOrientation(): number {
    let nextOrientation = 0;
    const currentOrientation = this.getOrientation();
    const allowedOrientations = this.planogramService.getAvailableOrientations([this]).orientationsList.map(it => it.value);
    const currentOriIndex = allowedOrientations.indexOf(currentOrientation);
    if (currentOriIndex == -1) {
      nextOrientation = currentOrientation;
      const orientationValues = Object.values(AppConstantSpace.ORIENTATION);
      let matchFound = false;
      while (!matchFound) {
        nextOrientation += 1;
        nextOrientation > Math.max(...orientationValues) ? nextOrientation = 0 : '';
        if (allowedOrientations.includes(nextOrientation)) {
          matchFound = true;
        }
      }
    } else {
      let tempIndex = currentOriIndex + 1;
      tempIndex >= allowedOrientations.length ? tempIndex = tempIndex - allowedOrientations.length : '';
      nextOrientation = allowedOrientations[tempIndex];
    }
    return nextOrientation;
  }

  public getPreviousOrientation(): number {
    let previousOrientation = 0;
    const allowedOrientations = this.planogramService.getAvailableOrientations([this]).orientationsList.map(it => it.value);
    const currentOriIndex = allowedOrientations.indexOf(this.getOrientation());
    if (currentOriIndex -1) {
      previousOrientation = this.getOrientation();
      const orientationValues = Object.values(AppConstantSpace.ORIENTATION);
      let matchFound = false;
      while (!matchFound) {
        previousOrientation -= 1;
        previousOrientation < 0 ? previousOrientation = Math.max(...orientationValues) : '';
        if (allowedOrientations.includes(previousOrientation)) {
          matchFound = true;
        }
      }
    } else {
      let tempIndex = currentOriIndex - 1;
      tempIndex < 0 ? tempIndex = tempIndex + allowedOrientations.length : '';
      previousOrientation = allowedOrientations[tempIndex];
    }
    return previousOrientation;
  }

  public getPegInfo(): PegInfo {
    let PegOffsetX, PegOffset2X;
    let orinetation = this.Position.IDOrientation;
      if (
        this.Position.ProductPackage.hasOwnProperty('XPegHole') &&
      (this.defaultOrinetation.value == orinetation || this.prevOrinetation.value == orinetation) &&
        this.defaultOrinetation.XPegHole != 0 &&
        this.Position.ProductPackage.XPegHole != 0 &&
        !Utils.isNullOrEmpty(this.Position.ProductPackage.XPegHole) &&
        !Utils.isNullOrEmpty(this.defaultOrinetation.XPegHole) &&
        (Utils.isNullOrEmpty(this.Position.ProductPegHole1X) ||
        this.Position.ProductPegHole1X == 0)
      ) {
        if(this.defaultOrinetation.value == orinetation){
          this.Position.ProductPackage.XPegHole = this.defaultOrinetation.XPegHole;
          PegOffsetX = parseFloat(this.Position.ProductPackage.XPegHole.toString());
        } else {
          PegOffsetX = parseFloat(this.Position.ProductPackage.XPegHole.toString());
        }
      } else if(this.prevOrinetation.value == orinetation && !Utils.isNullOrEmpty(this.Position.ProductPegHole1X) && this.Position.ProductPegHole1X != 0){
        PegOffsetX = this.Position.ProductPackage.XPegHole =  this.Position.ProductPegHole1X;
      } else {
        this.Position.ProductPegHole1X = this.Position.ProductPackage.XPegHole = PegOffsetX = (parseFloat(this.computeWidth().toString()) - (this.Position.FrontSpacing || 0)) / 2;
      }
    //check for peghole2X
      if (
        this.Position.ProductPackage.hasOwnProperty('ProductPegHole2X') &&
      (this.defaultOrinetation.value == orinetation || this.prevOrinetation.value == orinetation) &&
        !Utils.isNullOrEmpty(this.Position.ProductPackage.ProductPegHole2X) &&
        this.Position.ProductPackage.ProductPegHole2X != 0 &&
        this.defaultOrinetation.ProductPegHole2X != 0 &&
        !Utils.isNullOrEmpty(this.defaultOrinetation.ProductPegHole2X) &&
        (Utils.isNullOrEmpty(this.Position.ProductPegHole2X) || this.Position.ProductPegHole2X ==0)
      ) {
        if(this.defaultOrinetation.value == orinetation){
          this.Position.ProductPackage.ProductPegHole2X = this.defaultOrinetation.ProductPegHole2X;
          PegOffset2X = parseFloat(this.Position.ProductPackage.ProductPegHole2X.toString());
        } else {
          PegOffset2X = parseFloat(this.Position.ProductPackage.ProductPegHole2X.toString());
        }
      } else if(this.prevOrinetation.value == orinetation && !Utils.isNullOrEmpty(this.Position.ProductPegHole2X) && this.Position.ProductPegHole2X != 0 && this.Position.ProductPegHole1X != this.Position.ProductPegHole2X) {
        PegOffset2X = this.Position.ProductPackage.ProductPegHole2X =  this.Position.ProductPegHole2X;
      } else {
        this.Position.ProductPegHole2X = this.Position.ProductPackage.ProductPegHole2X = PegOffset2X = this.Position.ProductPegHole1X + parseFloat((this.Position.FrontSpacing?this.Position.FrontSpacing:0).toString());
      }
    let pegYDefaultOffset = 0.25;
    if (this.sharedService.measurementUnit == 'METRIC') {
      //metric
      pegYDefaultOffset = 0.25 * 2.54;
    }
    let PegOffsetY;
      if (
        this.Position.ProductPackage.hasOwnProperty('YPegHole') &&
      (this.defaultOrinetation.value == orinetation || this.prevOrinetation.value == orinetation) &&
        this.Position.ProductPackage.YPegHole != 0 &&
        this.defaultOrinetation.YPegHole != 0 &&
        !Utils.isNullOrEmpty(this.Position.ProductPackage.YPegHole) &&
        !Utils.isNullOrEmpty(this.defaultOrinetation.YPegHole) &&
        (Utils.isNullOrEmpty(this.Position.ProductPegHoleY) || this.Position.ProductPegHoleY ==0)
      ) {
        if(this.defaultOrinetation.value == orinetation){
          this.Position.ProductPackage.YPegHole = this.defaultOrinetation.YPegHole;
          PegOffsetY = parseFloat(this.Position.ProductPackage.YPegHole.toString());
        } else {
          PegOffsetY = parseFloat(this.Position.ProductPackage.YPegHole.toString());
        }
      } else if(this.prevOrinetation.value == orinetation && !Utils.isNullOrEmpty(this.Position.ProductPegHoleY) && this.Position.ProductPegHoleY != 0){
        PegOffsetY =  this.Position.ProductPegHoleY;
      } else {
        this.Position.ProductPegHoleY = this.Position.ProductPackage.YPegHole = PegOffsetY =
          parseFloat(this.computeHeight().toString()) - pegYDefaultOffset;
      }
    this.prevOrinetation.value = orinetation;

    let offsetXMedian = PegOffsetX;
    if (this.Position.FrontBars > 1) {
      offsetXMedian = (PegOffsetX + PegOffset2X) / 2;
    }

    return {
      OffsetX: PegOffsetX,
      Offset2X: PegOffset2X,
      OffsetY: PegOffsetY,
      Length: this.Position._X05_PEGLENGTH.ValData,
      Type: this.Position.PegType,
      HeightSlope: this.Position.HeightSlope,
      BackHooks: this.Position.BackHooks,
      BackSpacing: this.Position.BackSpacing,
      BackYOffset: this.Position.BackYOffset,
      FrontBars : this.Position.FrontBars,
      FrontSpacing: this.Position.FrontSpacing,
      IsPegTag: this.Position.IsPegTag,
      TagHeight: this.Position.TagHeight,
      TagWidth: this.Position.TagWidth,
      TagYOffset: this.Position.TagYOffset,
      TagXOffset: this.Position.TagXOffset,
      MaxPegWeight: this.Position.MaxPegWeight,
      PegPartID: this.Position.PegPartID,
      PegWeight: this.Position.PegWeight,
      IDPegLibrary: this.Position.IDPegLibrary,
      OffsetXMedian: offsetXMedian
    };
  }


  public computeHeight(toValue: any = '', toField: any = '', skipShrink?: boolean): number {
    // view will need to change based on the POV of this POG for now it is just from the Front
    let view = this.OrientNS.View.Front;
    let orientation = this.getOrientation();
    if (toValue != undefined) {
      if (toField == 'Position.IDOrientation') {
        orientation = toValue & 0x1f;
      }
    }
    //let dimensions = this.OrientNS.GetDimensions(orientation, false, view, this.Position.ProductPackage.Width, this.Position.ProductPackage.Height, this.Position.ProductPackage.Depth);
    //let height = dimensions.Height + this.getShrinkZ();
    let dimensions = this.OrientNS.GetDimensions(
      orientation,
      false,
      view,
      this.Position.ProductPackage.Width,
      this.Position.ProductPackage.Height,
      this.Position.ProductPackage.Depth,
    );
    let height = dimensions.Height + this.getShrinkHeight(skipShrink, false, false, true);
    return height;
  }

  public computeMaxSqueezedHeight(): number {
    let dimension = this.getDimByOrientation(this.Position.ProductPackage.Width, this.Position.ProductPackage.Height, this.Position.ProductPackage.Depth);
    const height = dimension.Height;
    dimension = this.getDimByOrientation(this.Position.ProductPackage.ShrinkPctX, this.Position.ProductPackage.ShrinkPctY, this.Position.ProductPackage.ShrinkPctZ);
    const shrinkPctY = dimension.Height;
    const shrinkY = Math.round((shrinkPctY * height * 100) / 100) / 100;
    return height - shrinkY;
  }

  public computeWidth(toValue: any = '', toField: any = ''): number {
    // view will need to change based on the POV of this POG for now it is just from the Front
    let view = this.OrientNS.View.Front;
    let orientation = this.getOrientation();
    if (toValue != undefined) {
      if (toField == 'Position.IDOrientation') {
        orientation = toValue & 0x1f;
      }
    }
    //let dimensions = this.OrientNS.GetDimensions(orientation, false, view, this.Position.ProductPackage.Width, this.Position.ProductPackage.Height, this.Position.ProductPackage.Depth);
    //let width = dimensions.Width + this.getShrinkWidth();
    let dimensions = this.OrientNS.GetDimensions(
      orientation,
      false,
      view,
      this.Position.ProductPackage.Width,
      this.Position.ProductPackage.Height,
      this.Position.ProductPackage.Depth,
    );
    let width = dimensions.Width + this.getShrinkWidth() + this.getSKUGap(true, dimensions.Width + this.getShrinkWidth()); //Need to add negXgap
    return width;
  }

  public computeDepth(toValue: any = '', toField: any = '', skipShrink?: boolean): number {
    // view will need to change based on the POV of this POG for now it is just from the Front

    let view = this.OrientNS.View.Front;
    let orientation = this.getOrientation();
    if (toValue != undefined) {
      if (toField == 'Position.IDOrientation') {
        orientation = toValue & 0x1f;
      }
    }
    let dimensions = this.OrientNS.GetDimensions(
      orientation,
      false,
      view,
      this.Position.ProductPackage.Width,
      this.Position.ProductPackage.Height,
      this.Position.ProductPackage.Depth,
    );
    let depth = dimensions.Depth + this.getShrinkDepth(skipShrink, false, false, true);
    return depth;
  }

  private linearWidthRootData: string = '';

  get calculateLinearWidthRootData() { //make sure to keep this up to date with the fields that will impact linear width calculation
    return `${this.Position.IDOrientation}${this.Position.FacingsX}${this.Position.LKDividerType}${this.Position.SpreadFacingsFactor}`
    +`${this.Position.SKUGapX}${this.Position.GapX}`;
  }

  public linearWidth(skipShrink?: boolean, skipUnits?: boolean): number {
    // Call the parent fixture's Position method
    if (!this.$idParent) {
      return Number(this.Position.ProductPackage.Width);
    } else {
      let cachedLinearWidth = Context.linearWidth[this.$id];
      if (!cachedLinearWidth || this.Position.ProductPackage.ShrinkPctX || skipUnits || this.linearWidthRootData != this.calculateLinearWidthRootData) {
        cachedLinearWidth = Context.linearWidth[this.$id] = this.parent.linearWidthPosition(this, undefined, undefined, skipShrink as any, skipUnits);
        this.linearWidthRootData = this.calculateLinearWidthRootData;
      }
      skipUnits && (delete Context.linearWidth[this.$id]);
      return cachedLinearWidth;
    }
  }


  private linearHeightRootData: string = '';

  get calculateLinearHeightRootData() { //make sure to keep this up to date with the fields that will impact linear height calculation
    return `${this.Position.IDOrientation}${this.Position.FacingsY}${this.Position.LayoversY}${this.Position.LayundersY}`
    +`${this.Position.GapY}`;
  }

  public linearHeight(skipShrink?: boolean, skipUnits?: boolean): number {
    // Call the parent fixture's Position method
    if (!this.$idParent) {
      return Number(this.Position.ProductPackage.Height);
    } else {
      let cachedLinearHeight = undefined;
      //Context.linearHeight[this.$id] =;
      if (!cachedLinearHeight || this.Position.ProductPackage.ShrinkPctY || skipUnits || this.linearHeightRootData != this.calculateLinearHeightRootData) {
        cachedLinearHeight = Context.linearHeight[this.$id] = this.parent.linearHeightPosition(this, undefined, undefined, skipShrink, skipUnits);
        this.linearHeightRootData = this.calculateLinearHeightRootData;
      }
      skipUnits && (delete Context.linearHeight[this.$id]);
      return cachedLinearHeight;
    }
  }

  public setAboveBehindLoc(merchDepth: number): void {
    const baseItem = this.sharedService.getObject(this.baseItem, this.$sectionID) as Position;
    if (this.Position.IDMerchStyle == AppConstantSpace.MERCH_ABOVE) {
      baseItem ? ((this.Location.Y = baseItem.linearHeight()), (this.Location.X = baseItem.Location.X)) : '';
    } else this.Location.Y = 0;
    if (this.Position.IDMerchStyle == AppConstantSpace.MERCH_BEHIND) {
      merchDepth
        ? (merchDepth = this.parent.getChildDimensionDepth())
        : '';
      baseItem
        ? ((this.Location.X = baseItem.Location.X),
          (this.Location.Z = baseItem.Location.Z - this.linearDepth()))
        : '';
    } else this.Location.Z = merchDepth > this.linearDepth() ? merchDepth - this.linearDepth() : 0;
  }

  public linearDepth(skipShrink?: boolean, skipUnits?: boolean, baseItem?: boolean): number {
    // Call the parent fixture's Position method
    if (!this.$idParent) {
      return Number(this.Position.ProductPackage.Height);
    } else {
      return this.parent.linearDepthPosition(this, undefined, undefined, skipShrink, skipUnits, baseItem);
    }
  }

  public layoversLinearDeep(): number {
    // view will need to change based on the POV of this POG for now it is just from the Front

    let view = this.OrientNS.View.Front;
    let orientation = this.getOrientation();

    let dimensions = this.OrientNS.GetDimensions(
      orientation,
      true,
      view,
      this.Position.ProductPackage.Width + this.Position.ShrinkWidth,
      this.Position.ProductPackage.Height,
      this.Position.ProductPackage.Depth,
    );
    let nesting = this.OrientNS.GetDimensions(
      orientation,
      true,
      view,
      this.Position.ProductPackage.NestingX,
      this.Position.ProductPackage.NestingY,
      this.Position.ProductPackage.NestingZ,
    );
    // Nesting should not be greater than the product dimension
    nesting.Width = nesting.Width > dimensions.Width ? 0 : nesting.Width;
    nesting.Height = nesting.Height > dimensions.Height ? 0 : nesting.Height;
    nesting.Depth = nesting.Depth > dimensions.Depth ? 0 : nesting.Depth;
    let depth = dimensions.Depth;

    let dl = 0;
    if (this.Position.LayoversZ > 0) {
      dl = depth * this.Position.LayoversZ;
      dl += (this.Position.LayoversZ - 1) * (this.Position.GapZ - nesting.Depth);
    }

    return dl;
  }

  public getIntersectingPopLocation() {
    /** This is setup from the intersection handler*/
    // throw new Error('Most likely never used, previously was: return this.IntersectionLocation;');

    return this.IntersectionLocation;
  }

  public setCases(): void {
    if (this.Position.ProductPackage.CasePack == 0) {
      this.Position.Cases = 0;
      return;
    }
    this.Position.Cases = this.Position.Capacity / this.Position.ProductPackage.CasePack;
    this.Position.Cases = Math.round(this.Position.Cases * 100) / 100;
  }

  public calculateDistribution(ctx: Context, fixture: PositionParentList, refresh?: RefreshParams, spanShelfsArry?, merchHeight?: number): boolean | number {
    let removedPosition: boolean | number = false;

    if (refresh && refresh.reassignFlag) {
      //commented For Adjacent shelves having span left is considered as a single shelf.
      //if (rootObj._IsSpanAcrossShelf.FlagData) {
      let ContainerObj = this.parent as MerchandisableList;
      if (
        Utils.checkIfstandardShelf(ContainerObj) &&
        ContainerObj.spreadSpanProperties.isSpreadSpan &&
        this.baseItem == ''
      ) {
        removedPosition = this.reassignFixture(ctx, spanShelfsArry, refresh);
      }
      // }
    }
    if (!removedPosition) {
      if ('calculatePositionDistribution' in fixture) {
        fixture.calculatePositionDistribution(ctx, this, merchHeight); // TODO :@salma need to check with @og

        this.calculatePackageBlockHash();
      }
    }
    return removedPosition;
  }

  public calculatePackageBlockHash() {
    this.$packageBlocks.hash = '';
    this.$packageBlocks.hash = this.hashCode(JSON.stringify(this.$packageBlocks));
    this.$packageBlocks.hashFix && (this.$packageBlocks.hash += this.$packageBlocks.hashFix);
  }

  hashCode(str) {
    let hash = 5381,
      i = str.length;
    while (i) {
      hash = (hash * 33) ^ str.charCodeAt(--i);
    }
    return hash >>> 0;
  }

  public highlightLabel(templateRangeModel, Posobj) {

    templateRangeModel = this.planogramService.templateRangeModel;
    let fieldOption = this.planogramService.getFieldOption();
    if (templateRangeModel.highlightType != 'Top Bottom Analysis') {
      if (!(templateRangeModel.rangeModel.length > 0)) {
        return templateRangeModel.defaultLabel;
      }
    }
    let type: string = typeof templateRangeModel.highlightType;
    if (type == '') {
      return templateRangeModel.defaultLabel;
    }
    let objRef = Posobj;
    let value;
    if (templateRangeModel.highlightType == 'String Match') {
      if (fieldOption.field) {
        value = String(this.findHighlightPropertyValue(objRef, fieldOption.field));
      }

      for (const rangeModel of templateRangeModel.rangeModel) {
        if (value === rangeModel.value) {
          if (rangeModel.label === undefined) {
            return templateRangeModel.defaultLabel;
          } else {
            return rangeModel.label;
          }
        }
      }
    }

    if (templateRangeModel.highlightType == 'Numeric Range') {
      if (fieldOption.field) {
        value = this.findHighlightPropertyValue(objRef, fieldOption.field);
      }
      if (value == null) {
        value = 0;
      }
      for (let i = 1; i < templateRangeModel.rangeModel.length; i++) {
        if (
          value.toFixed(2) >= templateRangeModel.rangeModel[i - 1].num &&
          value.toFixed(2) <= templateRangeModel.rangeModel[i].num
        ) {
          if (templateRangeModel.rangeModel[i - 1].label == undefined) {
            return templateRangeModel.defaultLabel;
          } else {
            return templateRangeModel.rangeModel[i - 1].label;
          }
        }
      }
    }

    if (templateRangeModel.highlightType === 'Color Scale') {
      if (fieldOption.field) {
        value = this.findHighlightPropertyValue(objRef, fieldOption.field);
      }
      if (value == null) {
        // value = 0;
      }
      for (const rangeModel of templateRangeModel.rangeModel) {
        if (value.toFixed(2) >= rangeModel.num && value.toFixed(2) <= rangeModel.num) {
          if (rangeModel.label === undefined) {
            return templateRangeModel.defaultLabel;
          } else {
            return rangeModel.label;
          }
        }
      }
    }

    if (templateRangeModel.highlightType === 'Top Bottom Analysis') {
      if (templateRangeModel.rangeModel.isNoHighlight) {
        return templateRangeModel.defaultLabel;
      }

      if (
        this.planogramService.rangeValues.maxArr &&
        this.planogramService.rangeValues.maxArr.indexOf(objRef.IDPOGObject) > -1
      ) {
        templateRangeModel.defaultLabel =
          this.planogramService.templateRangeModel.rangeModel.rangeValues[2].label;
      } else if (
        this.planogramService.rangeValues.minArr &&
        this.planogramService.rangeValues.minArr.indexOf(objRef.IDPOGObject) > -1
      ) {
        templateRangeModel.defaultLabel =
          this.planogramService.templateRangeModel.rangeModel.rangeValues[0].label;
      } else {
        templateRangeModel.defaultLabel =
          this.planogramService.templateRangeModel.rangeModel.rangeValues[1].label;
      }
    }

    if (templateRangeModel.highlightType === 'Quadrant Analysis') {
      if (templateRangeModel.rangeModel.isNoHighlight) {
        return templateRangeModel.defaultLabel;
      }
      if (
        this.planogramService.rangeValues.ll &&
        this.planogramService.rangeValues.ll.indexOf(objRef.IDPOGObject) > -1
      ) {
        templateRangeModel.defaultLabel = templateRangeModel.rangeModel[3].label; //this.planogramService.templateRangeModel.rangeModel.rangeValues[2].color;
      } else if (
        this.planogramService.rangeValues.hh &&
        this.planogramService.rangeValues.hh.indexOf(objRef.IDPOGObject) > -1
      ) {
        templateRangeModel.defaultLabel = templateRangeModel.rangeModel[0].label; //this.planogramService.templateRangeModel.rangeModel.rangeValues[0].color;
      } else if (
        this.planogramService.rangeValues.lh &&
        this.planogramService.rangeValues.lh.indexOf(objRef.IDPOGObject) > -1
      ) {
        templateRangeModel.defaultLabel = templateRangeModel.rangeModel[2].label; //this.planogramService.templateRangeModel.rangeModel.rangeValues[0].color;
      } else if (
        this.planogramService.rangeValues.hl &&
        this.planogramService.rangeValues.hl.indexOf(objRef.IDPOGObject) > -1
      ) {
        templateRangeModel.defaultLabel = templateRangeModel.rangeModel[1].label; //this.planogramService.templateRangeModel.rangeModel.rangeValues[0].color;
      }
    }

    return templateRangeModel.defaultLabel;
  }

  private findHighlightPropertyValue(obj, key, keyValue?) {
    var keyValue = keyValue || '';
    var that = obj;
    if (obj && typeof obj != 'undefined' && key && typeof key != 'undefined') {
      var fieldsArray = key.split('.');
      if (fieldsArray.length > 1) {
        for (var i = 0; i < fieldsArray.length - 1; i++) {
          that = that[fieldsArray[i]];
        }
        keyValue = that[fieldsArray[fieldsArray.length - 1]];
      } else {
        keyValue = that[key];
      }
    }

    return keyValue;
  };

  public highlightColor(templateRangeModel, Posobj?, defaultModelHL?) {
    let value;
    if(this.planogramService?.templateRangeModel?.rangeModel == undefined){
      this.planogramService.templateRangeModel.rangeModel =[];
    }

        templateRangeModel = this.planogramService?.templateRangeModel?.rangeModel && this.planogramService?.templateRangeModel?.rangeModel.length == 0 && defaultModelHL && Object.keys(defaultModelHL).length != 0 ? defaultModelHL:this.planogramService.templateRangeModel;

    if (
      templateRangeModel.highlightType === this.translate.instant('STRING_MATCH') ||
      templateRangeModel.highlightType === 'STRING_MATCH'
    ) {
      templateRangeModel.highlightType = 'String Match';
    } else if (
      templateRangeModel.highlightType === this.translate.instant('NUMERIC_RANGE') ||
      templateRangeModel.highlightType === 'NUMERIC_RANGE'
    ) {
      templateRangeModel.highlightType = 'Numeric Range';
    } else if (
      templateRangeModel.highlightType === this.translate.instant('COLOR_SCALE') ||
      templateRangeModel.highlightType === 'COLOR_SCALE'
    ) {
      templateRangeModel.highlightType = 'Color Scale';
    } else if (
      templateRangeModel.highlightType === this.translate.instant('TOP_BOTTOM_ANALYSIS') ||
      templateRangeModel.highlightType === 'TOP_BOTTOM_ANALYSIS'
    ) {
      templateRangeModel.highlightType = 'Top Bottom Analysis';
    } else if (
      templateRangeModel.highlightType === this.translate.instant('QUADRANT_ANALYSIS') ||
      templateRangeModel.highlightType === 'QUADRANT_ANALYSIS'
    ) {
      templateRangeModel.highlightType = 'Quadrant Analysis';
    }

    let fieldOption = this.planogramService.getFieldOption();
    if (templateRangeModel.highlightType !== 'Top Bottom Analysis') {
      if (!(templateRangeModel?.rangeModel && templateRangeModel?.rangeModel?.length > 0)) {
        return templateRangeModel.defaultColor;
      }
    }
    let type: string = typeof templateRangeModel.highlightType;
    if (type == '') {
      return templateRangeModel.defaultColor;
    }
    let objRef = Posobj;

    if (templateRangeModel.highlightType === 'String Match') {
      if (fieldOption.field) {
        value = String(this.findHighlightPropertyValue(objRef, fieldOption.field));
      }

      for (const rangeModel of templateRangeModel.rangeModel) {
        if (value === rangeModel.value) {
          return rangeModel.color;
        }
      }
    }

    if (templateRangeModel.highlightType === 'Numeric Range') {
      if (fieldOption.field) {
        value = this.findHighlightPropertyValue(objRef, fieldOption.field);
      }
      if (value == null) {
        value = 0;
      }
      for (let i = 1; i < templateRangeModel.rangeModel.length; i++) {
        if (
          value.toFixed(2) >= templateRangeModel.rangeModel[i - 1].num &&
          value.toFixed(2) <= templateRangeModel.rangeModel[i].num
        ) {
          return templateRangeModel.rangeModel[i - 1].color;
          /*}*/
        }
      }
    }

    if (templateRangeModel.highlightType === 'Color Scale') {
      if (fieldOption.field) {
        value = this.findHighlightPropertyValue(objRef, fieldOption.field);
      }
      if (!value) {
        value = 0;
      }
      for (let i = 1; i < templateRangeModel.rangeModel.length; i++) {
        if (
          value.toFixed(2) >= templateRangeModel.rangeModel[i - 1].num &&
          value.toFixed(2) <= templateRangeModel.rangeModel[i].num
        ) {
          return templateRangeModel.rangeModel[i - 1].color;
        }
      }
    }

    if (templateRangeModel.highlightType === 'Top Bottom Analysis') {
      if (templateRangeModel.rangeModel?.isNoHighlight) {
        return templateRangeModel.defaultColor;
      }
      if (
        this.planogramService.TopBottomAnalysisData &&
        this.planogramService.TopBottomAnalysisData.hasOwnProperty(objRef.IDPOGObject)
      ) {
        templateRangeModel.defaultColor = this.planogramService.TopBottomAnalysisData[objRef.IDPOGObject];
      }
    }

    if (templateRangeModel.highlightType === 'Quadrant Analysis') {
      if (templateRangeModel.rangeModel.isNoHighlight) {
        return templateRangeModel.defaultColor;
      }
      if (
        this.planogramService.rangeValues.ll &&
        this.planogramService.rangeValues.ll.indexOf(objRef.IDPOGObject) > -1
      ) {
        templateRangeModel.defaultColor = templateRangeModel.rangeModel[3].color;
      } else if (
        this.planogramService.rangeValues.hh &&
        this.planogramService.rangeValues.hh.indexOf(objRef.IDPOGObject) > -1
      ) {
        templateRangeModel.defaultColor = templateRangeModel.rangeModel[0].color;
      } else if (
        this.planogramService.rangeValues.lh &&
        this.planogramService.rangeValues.lh.indexOf(objRef.IDPOGObject) > -1
      ) {
        templateRangeModel.defaultColor = templateRangeModel.rangeModel[2].color;
      } else if (
        this.planogramService.rangeValues.hl &&
        this.planogramService.rangeValues.hl.indexOf(objRef.IDPOGObject) > -1
      ) {
        templateRangeModel.defaultColor = templateRangeModel.rangeModel[1].color;
      }
    }

    return templateRangeModel.defaultColor;
  }

  public changeFacingsTo(val: number, overRideValidation?: { flag: boolean; oldMaxFacingsConstraint: number; oldMinFacingsConstraint: number; }, field?: string): boolean {

    if (!field) {
      field = 'FacingsX';
    }

    let isValidate = true,
      flag = overRideValidation ? overRideValidation.flag : undefined;
    if (!(typeof overRideValidation != 'undefined' && overRideValidation.flag)) {
      isValidate = this.dataValidation.validate(
        this.section,
        this,
        'Position.' + field,
        val,
        this.Position[field],
      );
    }
    if (isValidate) {
      //feature undo-redo: by abhishek
      //dt. 11th, Aug, 2014

      const original = ((that, fVal, overRideValidation, field) => {
        return () => {
          this.changeFacingsTo(fVal, overRideValidation, field);
        };
      })(this, val, {
        flag: flag,
        oldMaxFacingsConstraint: flag ? overRideValidation.oldMaxFacingsConstraint : '' as any,
        oldMinFacingsConstraint: flag ? overRideValidation.oldMinFacingsConstraint : '' as any,
      }, field);
      const revert = ((that, fVal, overRideValidation, field) => {
        return () => {
          this.changeFacingsTo(fVal, overRideValidation as any, field);
        };
      })(this, this.Position[field], {
        flag: flag,
        oldMaxFacingsConstraint: flag ? this.Position.MaxFacingsX : '',
        oldMinFacingsConstraint: flag ? this.Position.MinFacingsX : '',
      }, field);
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'changeFacingsTo',
      }, this.$sectionID);
      /* ends here */

      this.Position[field] = val;
      //updating the valures in position worksheet
      const dObj = {
        field: 'Position.' + field,
        newValue: val,
        IDPOGObject: this.IDPOGObject,
        gridType: 'Position',
        tab: null,
      };
      this.sharedService.workSheetEvent.next(dObj);
      if (this.sharedService.link == 'iAssort') {
        window.parent.postMessage(
          'invokePaceFunc:updateFacings:["' +
          this.Position.IDProduct +
          '","' +
          this.Position[field] +
          '","' +
          this.Position.UsedLinear +
          '"]',
          '*',
        );
      }
    }
    return isValidate;
  }

  public changeAdvanceTrayCapping = (pos, val) => {
    const original = ((pos, val) => {
      return () => {
        this.changeAdvanceTrayCapping(pos, val);
      }
    })(pos, val);
    const revert = ((pos, val) => {
      return () => {
        this.changeAdvanceTrayCapping(pos, val);
      }
    })(pos, pos.Position.UnitCapping);
    this.historyService.captureActionExec({
      funoriginal: original,
      funRevert: revert,
      funName: 'unitCapPosition',
    });
    pos.Position.UnitCapping = val;
  }

  public bumpUpFacingValue(): boolean {
    let isValidate = this.dataValidation.validate(
      this.section,
      this,
      'Position.FacingsX',
      this.Position.FacingsX + 1,
      this.Position.FacingsX,
    );
    if (isValidate) {
      /*feature undo-redo: by abhishek */

      let original = (function (that) {
        return function () {
          this.bumpUpFacingValue();
        };
      })(this);
      let revert = (function (that) {
        return function () {
          this.bumpDownFacingValue();
        };
      })(this);

      this.Position.FacingsX++;
    }
    return isValidate;
  }

  public bumpDownFacingValue(): void {

    let isValidate = this.dataValidation.validate(
      this.section,
      this,
      'Position.FacingsX',
      this.Position.FacingsX + 1,
      this.Position.FacingsX,
    );
    if (isValidate) {
      //feature undo-redo: by abhishek
      //save the closure function for undo/redo
      // let that = this;
      let original = () => this.bumpDownFacingValue();
      let revert = () => this.bumpUpFacingValue();
      this.Position.FacingsX--;
    }
  }

  isValidLeftMovement(): boolean {
    let currentFixtureObj = this.parent as MerchandisableList;
    if (currentFixtureObj.checkIfFirstPosition(this)) {
      if (currentFixtureObj.asCoffincase() || currentFixtureObj.asBasket()) {
        return false;
      } else if (currentFixtureObj.asStandardShelf() && currentFixtureObj.Fixture.LKCrunchMode != 5) {
        let standardShelf = currentFixtureObj.asStandardShelf();
        if (standardShelf.isSpreadShelf) {
          const allSpanSpreadShelfPositions = standardShelf.getAllSpreadSpanPositions()
          let currentIndexOfSpreadSpan = allSpanSpreadShelfPositions.indexOf(this);
          if (currentIndexOfSpreadSpan === 0)
            return false;
        } else {
          return false;
        }
      }
    }
    return true;
  }

  isValidRightMovement(): boolean {
    let currentFixtureObj = this.parent as MerchandisableList;
    if (currentFixtureObj.checkIfLastPosition(this)) {
      if (currentFixtureObj.asCoffincase() || currentFixtureObj.asBasket()) {
        return false;
      } else if (currentFixtureObj.asStandardShelf() && currentFixtureObj.Fixture.LKCrunchMode != 5) {
        let standardShelf = currentFixtureObj.asStandardShelf();
        if (standardShelf.isSpreadShelf) {
          const allSpanSpreadShelfPositions = standardShelf.getAllSpreadSpanPositions()
          let currentIndexOfSpreadSpan = allSpanSpreadShelfPositions.indexOf(this);
          if (currentIndexOfSpreadSpan === allSpanSpreadShelfPositions.length - 1)
            return false;
        } else {
          return false;
        }
      }
    }
    return true;
  }

  public moveSelectedItemToRight(fixturePositionMovement: number, movementType: string): void {
    let currentFixtureObj = this.parent as MerchandisableList;
    let parentFixture = currentFixtureObj, nextPosition, toIndex;
    let direction = AppConstantSpace.POSITION_DIRECTION.RIGHT;
    if (this.selected) {
      if (!this.isValidRightMovement()) {
        return;
      }
      let currentIndex = (toIndex = currentFixtureObj.Children.indexOf(this));
      const position = currentFixtureObj.Children[currentIndex] as Position;
      let X = currentFixtureObj.getNextLocX(this, { left: false }, fixturePositionMovement),
        Y = currentFixtureObj.getNextLocY(this, { leftRight: true });
      if (Utils.checkIfstandardShelf(currentFixtureObj)) {
        let currObjChild = Utils.sortByXYPos(
          _.filter(currentFixtureObj.Children, function (val: Position) {
            return val.asPosition();
          }),
        );
        toIndex = currentIndex + 2;
        if (currentIndex == currObjChild.length - 1 && this.section._IsSpanAcrossShelf.FlagData && currentFixtureObj.checkIfLastPosition(this) && currentFixtureObj.Fixture.LKCrunchMode != 5) {
          //Incase if we need to consider spanshelfs too
          const allSpanSpreadShelfPositions = currentFixtureObj.getAllSpreadSpanPositions();
          let currentIndexOfSpreadSpan = allSpanSpreadShelfPositions.indexOf(this);
          nextPosition = allSpanSpreadShelfPositions[currentIndexOfSpreadSpan + 1];
          let nextFixture = this.sharedService.getParentObject(nextPosition, nextPosition.$sectionID);
          if (!_.isEmpty(nextFixture)) {
            nextFixture.Children = _.filter(nextFixture.Children, function (val) { return Utils.checkIfPosition(val) });
            nextPosition = nextFixture.Children[0];
            parentFixture = nextFixture;
            toIndex = 1;
          }
        } else {
          nextPosition = currObjChild[currentIndex + 1];
        }

        if (nextPosition && currentFixtureObj.Fixture.LKCrunchMode == 5) {
          toIndex = X > nextPosition.Location.X ? currentIndex + 2 : currentIndex + 1;
        } else {
          X = X > currentFixtureObj.getChildDimensionWidth() ? this.Location.X : X;
        }

        //in case when we use ctrl + shift + right arrow
        if (movementType === AppConstantSpace.POSITION_MOVEMENT_TYPE.DIRECT) {
          let offSet = currentFixtureObj.movePositionDirectlyInShelf(direction, position);
          X = offSet.left;
          Y = offSet.top;
        }
      }
      if (currentFixtureObj.asCoffincase() || currentFixtureObj.asBasket()) {
        const positionHeight = this.linearHeight() || this.computeHeight();
        const positionWidth = this.linearWidth() || this.computeWidth();
        X = X + positionWidth;
        Y = Y + positionHeight;

        //in case when we use ctrl + shift + right arrow
        if (movementType === AppConstantSpace.POSITION_MOVEMENT_TYPE.DIRECT) {
          let func = "movePositionDirectlyInCoffin"
          let offSet = currentFixtureObj[func](direction, position);
          X = offSet.left;
          Y = offSet.top;
        }
      }
      const ctx = new Context(this.section);
      !Utils.isNullOrEmpty(X) && !Utils.isNullOrEmpty(Y)
        ? currentFixtureObj.movePosition(ctx, currentIndex, parentFixture, toIndex, { left: X, top: Y })
        : ''; // changed to 2 cos of fix in standardshelf.js mixin movePosition method
    }
  }

  public moveSelectedItemToLeft(fixturePositionMovement: number, movementType: string): void {
    let currentFixtureObj = this.parent as MerchandisableList;
    let parentFixture = currentFixtureObj, nextPosition;
    let direction = AppConstantSpace.POSITION_DIRECTION.LEFT;
    if (this.selected) {
      if (!this.isValidLeftMovement()) {
        return;
      }
      let currentIndex = currentFixtureObj.Children.indexOf(this);
      const position = currentFixtureObj.Children[currentIndex] as Position;
      let X = currentFixtureObj.getNextLocX(this, { left: true }, fixturePositionMovement),
        Y = currentFixtureObj.getNextLocY(this, { leftRight: true }),
        toIndex;
      if (currentFixtureObj.asStandardShelf()) {
        let currObjChild = Utils.sortByXYPos(
          _.filter(currentFixtureObj.Children as Position[], function (val: Position) {
            return val.asPosition();
          }),
        );
        toIndex = currentIndex - 1;
        if (currentIndex == 0 && currentFixtureObj.checkIfFirstPosition(this)) {
          //Incase if we need to consider spanshelfs too
          if (currentFixtureObj.Fixture.LKCrunchMode != 5 && this.section._IsSpanAcrossShelf.FlagData) {
            const allSpanSpreadShelfPositions = (currentFixtureObj as StandardShelf).getAllSpreadSpanPositions()
            let currentIndexOfSpreadSpan = allSpanSpreadShelfPositions.indexOf(this);
            nextPosition = allSpanSpreadShelfPositions[currentIndexOfSpreadSpan - 1];
            let previousFixture = this.sharedService.getParentObject(nextPosition, nextPosition.$sectionID);
            if (!_.isEmpty(previousFixture)) {
              previousFixture.Children = _.filter(previousFixture.Children, function (val) { return Utils.checkIfPosition(val) });
              nextPosition = previousFixture.Children[previousFixture.Children.length - 1];
              parentFixture = previousFixture;
              toIndex = previousFixture.Children.length - 1;
            }
          } else if (currentFixtureObj.Fixture.LKCrunchMode == 5 && !this.section._IsSpanAcrossShelf.FlagData) {
            toIndex = currentIndex;
          }
        } else {
          nextPosition = currObjChild[currentIndex - 1];
        }

        if (nextPosition && currentFixtureObj.Fixture.LKCrunchMode == 5) {
          toIndex = X < nextPosition.Location.X ? currentIndex - 1 : currentIndex;
        } else {
          X = X < 0 ? this.Location.X : X;
        }

        //in case when we use ctrl + shift + right arrow
        if (movementType === AppConstantSpace.POSITION_MOVEMENT_TYPE.DIRECT) {
          const position = currentFixtureObj.Children[currentIndex] as Position;
          let func = "movePositionDirectlyInShelf";
          let offSet = currentFixtureObj[func](direction, position);
          X = offSet.left;
          Y = offSet.top;
        }
      }
      if (currentFixtureObj.asCoffincase() || currentFixtureObj.asBasket()) {
        const positionHeight = this.linearHeight() || this.computeHeight();
        const positionWidth = this.linearWidth() || this.computeWidth();
        X = X + positionWidth;
        Y = Y + positionHeight;

        //in case when we use ctrl + shift + right arrow
        if (movementType === AppConstantSpace.POSITION_MOVEMENT_TYPE.DIRECT) {
          let func = "movePositionDirectlyInCoffin"
          let offSet = currentFixtureObj[func](direction, position);
          X = offSet.left;
          Y = offSet.top;
        }
      }
      const ctx = new Context(this.section);
      !Utils.isNullOrEmpty(X) && !Utils.isNullOrEmpty(Y)
        ? currentFixtureObj.movePosition(ctx, currentIndex, parentFixture, toIndex, { left: X, top: Y })
        : '';
    }
  }

  public moveSelectedItemToDown(fixturePositionMovement?: number, movementType?: string): void {
    if (this.selected) {
      const ctx = new Context(this.section);
      let currentFixtureObj = this.parent as any;
      if (currentFixtureObj.checkIfBottomPosition(this)) return;
      let currentIndex = currentFixtureObj.Children.indexOf(this);
      const position = currentFixtureObj.Children[currentIndex] as Position;
      let X = currentFixtureObj.getNextLocX(this, { isUpDown: true }),
        Y = currentFixtureObj.getNextLocY(this, { up: false }, fixturePositionMovement);
      let direction = AppConstantSpace.POSITION_DIRECTION.DOWN;
      if (currentFixtureObj.asCoffincase() || currentFixtureObj.asBasket()) {
        const positionHeight = this.linearHeight() || this.computeHeight();
        const positionWidth = this.linearWidth() || this.computeWidth();
        X = X + positionWidth;
        Y = Y + positionHeight;

        //in case when we use ctrl + shift + right arrow
        if (movementType === AppConstantSpace.POSITION_MOVEMENT_TYPE.DIRECT) {
          let func = "movePositionDirectlyInCoffin"
          let offSet = currentFixtureObj[func](direction, position);
          X = offSet.left;
          Y = offSet.top;
        }
      }
      X && Y
        ? currentFixtureObj.movePosition(ctx, currentIndex, currentFixtureObj, currentIndex + 2, { left: X, top: Y })
        : ''; // changed to 2 cos of fix in standardshelf.js mixin movePosition method
    }
  }

  public moveSelectedItemToUp(fixturePositionMovement?: number, movementType?: string) {
    if (this.selected) {
      const ctx = new Context(this.section);
      let currentFixtureObj = this.parent as any;
      if (currentFixtureObj.checkIfTopPosition(this)) return;
      let currentIndex = currentFixtureObj.Children.indexOf(this);
      const position = currentFixtureObj.Children[currentIndex] as Position;
      let X = currentFixtureObj.getNextLocX(this, { isUpDown: true }),
        Y = currentFixtureObj.getNextLocY(this, { up: true }, fixturePositionMovement);
      let direction = AppConstantSpace.POSITION_DIRECTION.UP;
      if (currentFixtureObj.asCoffincase() || currentFixtureObj.asBasket()) {
        const positionHeight = this.linearHeight() || this.computeHeight();
        const positionWidth = this.linearWidth() || this.computeWidth();
        X = X + positionWidth;
        Y = Y + positionHeight;

        //in case when we use ctrl + shift + right arrow
        if (movementType === AppConstantSpace.POSITION_MOVEMENT_TYPE.DIRECT) {
          let func = "movePositionDirectlyInCoffin"
          let offSet = currentFixtureObj[func](direction, position);
          X = offSet.left;
          Y = offSet.top;
        }
      }
      X && Y
        ? currentFixtureObj.movePosition(ctx,
          currentIndex,
          currentFixtureObj,
          currentIndex > 0 ? currentIndex - 1 : 0,
          { left: X, top: Y },
        )
        : '';
    }
  }
  public selectNextPosition(): void {
    const currentFixtureObj = this.parent as PositionParentList;
    let currObjChild: Position[];
    if (currentFixtureObj.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ && 'getAllPosition' in currentFixtureObj) {
      currObjChild = currentFixtureObj.getAllPosition() as Position[];
    } else {
      currObjChild = Utils.sortByXYPos(
        currentFixtureObj.Children.filter(val => Utils.checkIfPosition(val)),
      ) as Position[];
      if (
        currentFixtureObj.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
        currentFixtureObj.ObjectDerivedType == AppConstantSpace.BASKETOBJ
      ) {
        currObjChild = currentFixtureObj.Children = Utils.sortByXYPos(currentFixtureObj.Children.filter(val => Utils.checkIfPosition(val))) as Position[];
      }
    }
    let positionIndexField = "CongruentPosition" in this.Position ? "CongruentPosition" : "PositionNo";
    let currentPosIndex = this.Position[positionIndexField] - 1;
    let nextPosition: Position;
    if (this.selected && this.selected === true) {
      if (currentPosIndex == currObjChild.length - 1) {
        let nextFixture = Object.assign({}, this.getNextPositionObject(currentFixtureObj, this));
        //checking the traffic flow for every fixture
        let positions = this.getCurrentTrafficFlowForPosition(nextFixture);
        if (!_.isEmpty(nextFixture)) {
          positions = _.filter(positions, function (val) {
            return Utils.checkIfPosition(val);
          });
          nextPosition = positions[0];
        }
      } else {
        nextPosition = currObjChild.find((item) => item.Position[positionIndexField] == this.Position[positionIndexField]+1)
      }
      if (!_.isEmpty(nextPosition)) {
        this.planogramService.addToSelectionByObject(nextPosition, this.$sectionID);
        this.planogramService.removeFromSelectionByObject(this, this.$sectionID);
      }
    }
  }

  private getNextPositionObject(currentFixtureObj, currentObj) {
    let rootObj = this.sharedService.getObject(currentFixtureObj.$sectionID, currentObj.$sectionID) as Section;
    let fixtureFullPathCollection = rootObj.getFixtureFullPathCollection();
    let nextFixture;
    let currentObjectIndex = fixtureFullPathCollection.indexOf(currentFixtureObj);

    if (currentObjectIndex == fixtureFullPathCollection.length - 1) {
      return;
    } else {
      nextFixture = fixtureFullPathCollection[currentObjectIndex + 1];
    }

    if (
      !Utils.isNullOrEmpty(nextFixture) &&
      !Utils.isNullOrEmpty(nextFixture.Children) &&
      nextFixture.Children.length > 0 &&
      (nextFixture.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ ||
        nextFixture.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
        nextFixture.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
        nextFixture.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ ||
        nextFixture.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
        nextFixture.ObjectDerivedType == AppConstantSpace.BASKETOBJ)
    ) {
      return nextFixture;
    } else {
      return this.getNextPositionObject(nextFixture, currentObj);
    }
  }

  public selectPreviousPosition(): void {
    if (!this.selected) {
      return;
    }
    const currentFixtureObj = this.parent as MerchandisableList;
    const currentFixtureObjChild = currentFixtureObj.getAllPosition();
    let positionIndexField = "CongruentPosition" in this.Position ? "CongruentPosition" : "PositionNo";
    const currentIndex = this.Position[positionIndexField]-1;
    let nextPosition: Position;

    if (currentIndex == 0) {
      let nextFixture = this.getPreviousPositionObject(currentFixtureObj, this);
      //checking the traffic flow for every fixture
      let positions = this.getCurrentTrafficFlowForPosition(nextFixture);
      if (!_.isEmpty(nextFixture)) {
        for (var i = positions.length - 1; i >= 0; i--) {
          const pos = positions[i];
          if (pos.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            nextPosition = pos;
            break;
          }
        }
      }
    } else {
      nextPosition = currentFixtureObjChild.find((item) => item.Position[positionIndexField] == this.Position[positionIndexField]-1);
    }

    if (!_.isEmpty(nextPosition)) {
      this.planogramService.addToSelectionByObject(nextPosition, this.$sectionID);
      this.planogramService.removeFromSelectionByObject(this, this.$sectionID);
    }
  }

  public getPreviousPositionObject(currentFixtureObj: FixtureList, currentObj: Position): PositionParentList {
    let rootObj: Section = this.sharedService.getObject(currentFixtureObj.$sectionID, currentObj.$sectionID) as Section;
    let fixtureFullPathCollection = rootObj.getFixtureFullPathCollection();
    let nextFixture;
    let currentObjectIndex = fixtureFullPathCollection.indexOf(currentFixtureObj);

    if (currentObjectIndex <= 0) {
      return; // In case of shopping cart or in the first fixture return.
    } else {
      nextFixture = fixtureFullPathCollection[currentObjectIndex - 1];
    }

    if (
      !Utils.isNullOrEmpty(nextFixture) &&
      !Utils.isNullOrEmpty(nextFixture.Children) &&
      nextFixture.Children.length > 0 &&
      (nextFixture.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ ||
        nextFixture.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
        nextFixture.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
        nextFixture.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ ||
        nextFixture.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
        nextFixture.ObjectDerivedType == AppConstantSpace.BASKETOBJ)
    ) {
      return nextFixture;
    } else {
      return this.getPreviousPositionObject(nextFixture, currentObj);
    }
  }

  public selectAllItemsWithShiftKey(endSelectionPos: Position): void {

    let currentFixtureObj = this.parent;
    let currentIndex = currentFixtureObj.Children.indexOf(this); //(this.Position.PositionNo - 1);
    let lastItemIndex = currentFixtureObj.Children.indexOf(endSelectionPos);

    if (this.selected) {
      this.Communicator.removeAllSelection(this.$sectionID);
      if (
        !Utils.isNullOrEmpty(currentFixtureObj.Children) &&
        currentFixtureObj.Children.length > 0 &&
        lastItemIndex > -1
      ) {
        if (currentIndex > lastItemIndex) {
          for (let i = lastItemIndex; i <= currentIndex; i++) {
            let item = currentFixtureObj.Children[i];
            if (!item.selected) {
              this.Communicator.addToSelectionByObject(item, item.$sectionID);
            }
          }
        } else {
          for (let i = currentIndex; i <= lastItemIndex; i++) {
            let item = currentFixtureObj.Children[i];
            if (!item.selected) {
              this.Communicator.addToSelectionByObject(item, item.$sectionID);
            }
          }
        }
      }
    }
  };

  public selectAllLeftItems(): void {
    let currentFixtureObj = this.parent as MerchandisableList;
    let selectingPositoins = currentFixtureObj.Children;
    let currentIndex = selectingPositoins.indexOf(this); //(this.Position.PositionNo - 1);
    if (this.selected && this.selected === true) {
      this.planogramService.removeAllSelection(this.$sectionID);
      if (
        this.section._IsSpanAcrossShelf.FlagData &&
        currentFixtureObj.spreadSpanProperties.isSpreadSpan
      ) {
        selectingPositoins = (currentFixtureObj as StandardShelf).getAllSpreadSpanPositions();
        currentIndex = selectingPositoins.indexOf(this);
      }
      if (!Utils.isNullOrEmpty(selectingPositoins) && selectingPositoins.length > 0) {
        for (let i = currentIndex; i < selectingPositoins.length; i++) {
          let item = selectingPositoins[i];
          if (!item.selected && Utils.checkIfPosition(item)) {
            this.planogramService.addToSelectionByObject(item, item.$sectionID, false);
          }
        }
        this.planogramService.openPropertyGrid(selectingPositoins[selectingPositoins.length - 1]);
      }
    }
  }

  public selectAllRightItems(): void {
    let currentFixtureObj = this.parent as MerchandisableList;
    let selectingPositoins = currentFixtureObj.Children;
    let currentIndex = selectingPositoins.indexOf(this); //(this.Position.PositionNo - 1);
    if (this.selected) {
      this.planogramService.removeAllSelection(this.$sectionID);
      if (
        this.section._IsSpanAcrossShelf.FlagData &&
        currentFixtureObj.spreadSpanProperties.isSpreadSpan
      ) {
        selectingPositoins = (currentFixtureObj as any).getAllSpreadSpanPositions();
        currentIndex = selectingPositoins.indexOf(this);
      }
      if (!Utils.isNullOrEmpty(selectingPositoins) && selectingPositoins.length > 0) {
        for (let i = currentIndex; i >= 0; i--) {
          let item = selectingPositoins[i];
          if (!item.selected && Utils.checkIfPosition(item)) {
            this.planogramService.addToSelectionByObject(item, item.$sectionID, false);
          }
        }
        this.planogramService.openPropertyGrid(selectingPositoins[selectingPositoins.length - 1]);
      }
    }
  }

  private CheckProductPresentInPog(fromProductLib: any = ''): boolean {

    //let that = this;
    let itemPresent = false;
    let rootObject = this.section;
    let positionCounter = 0;
    let eachRecursive = (obj, parent = '') => {
      if (obj.hasOwnProperty('Children')) {
        obj.Children.forEach((child, key) => {
          if (child.ObjectDerivedType == 'Position') {
            if (
              child.Position.IDProduct == this.Position.IDProduct &&
              child.Position.IDPackage == this.Position.IDPackage
            ) {
              positionCounter = positionCounter + 1;
            }
          }
          eachRecursive(child, obj);
        }, obj);
      }
    };
    eachRecursive(rootObject);
    if (fromProductLib && positionCounter > 0) {
      itemPresent = true;
    } else if (positionCounter > 1) {
      itemPresent = true;
    }
    return itemPresent;
  }

  private CheckSortProductPresentInPog(): boolean {
    let rootObject = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
    let positionCounter = 0;
    let eachRecursive = (obj, parent = '') => {
      if (obj.hasOwnProperty('Children')) {
        obj.Children.forEach((child, key) => {
          if (child.ObjectDerivedType == 'Position') {
            if (
              child.Position.IDProduct == this.Position.IDProduct &&
              child.Position.IDPackage == this.Position.IDPackage
            ) {
              positionCounter = positionCounter + 1;
            }
          }
          eachRecursive(child, obj);
        }, obj);
      }
    };
    eachRecursive(rootObject);
    return positionCounter >= 1;
  }

  // TODO @og move outside of position class
  public moveSelectedToCart(ctx: Context, shoppingCart: ShoppingCart, fromSort?: boolean): void {
    let currentFixtureObj: MerchandisableList | ShoppingCart = this.sharedService.getParentObject(this, this.$sectionID);
    let currentIndex = currentFixtureObj.Children.indexOf(this);
    let toIndex = shoppingCart.Children.length;
    let isProductPresentInPog, baseItm;

    if (this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
      this.updateLastLocationAndADRI();
    }
    if (currentFixtureObj.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) return;
    if (fromSort) {
      isProductPresentInPog = this.CheckSortProductPresentInPog();
    } else {
      isProductPresentInPog = this.CheckProductPresentInPog();
    }

    // added for SAve functionality as suggested by Vamsi
    this.Fixture.FixtureFullPath = ''; //added by ashish to fix 4607 bug
    this.Fixture.FixtureNumber = undefined;
    this.Position.PositionNo = null;

    if (currentIndex != -1) {
      const coffincaseObj = (Utils.checkIfCoffincase(currentFixtureObj) || Utils.checkIfBasket(currentFixtureObj)) ? currentFixtureObj : undefined;
      const oldChildren = coffincaseObj ? _.cloneDeep(coffincaseObj.Children) : undefined;
      currentFixtureObj.removePosition(ctx, currentIndex);
      if (coffincaseObj && coffincaseObj.Fixture.LKCrunchMode !== CrunchMode.NoCrunch) {
        const positions = coffincaseObj.Children.filter(Utils.checkIfPosition).sort((a, b) => a.Location.X - b.Location.X);
        if (positions && positions.length) {
          const initPos = coffincaseObj.Fixture.LKCrunchMode === CrunchMode.Right ? positions[positions.length - 1] : positions[0];
          coffincaseObj.calculatePositionShrink(initPos, oldChildren);
        }
      }
    }

    // added for SAve functionality as suggested by Vamsi

    let isProductPresentInCart = shoppingCart.checkProductPresentInCart(this);

    //Okay, when productID is NOT present in CART then add to it, else ignore.
    if (!isProductPresentInCart && !isProductPresentInPog) {
      shoppingCart.addPosition(ctx, this, toIndex, null);

      //UNDO:REDO
      let oldDropCoord = {};
      if (
        Utils.checkIfPegboard(currentFixtureObj) ||
        Utils.checkIfCrossbar(currentFixtureObj) ||
        Utils.checkIfSlotwall(currentFixtureObj)
      ) {
        oldDropCoord = _.cloneDeep({
          left: this.Location.X + this.getPegInfo().OffsetX,
          top: this.Location.Y + this.linearHeight() - (this.computeHeight() - this.getPegInfo().OffsetY),
        });
      } else if (Utils.checkIfCoffincase(currentFixtureObj) || Utils.checkIfBasket(currentFixtureObj)) {
        oldDropCoord = _.cloneDeep({
          left: this.Location.X + this.linearWidth(),
          top: this.Location.Y + this.linearHeight(),
        });
      } else {
        oldDropCoord = _.cloneDeep({ left: this.Location.X, top: this.Location.Y });
      }

      //let oldDropCoord = { left: this.Location.X, top: this.Location.Y };

      // trigger delete to assort grid
      if (this.sharedService.link == 'iAssort' && this.sharedService.triggeredFromAssort != true)
        window.parent.postMessage('invokePaceFunc:deleteProduct:["' + this.Position.IDProduct + '"]', '*');

      const original = ((shoppingCart) => {
        return () => {
          this.moveSelectedToCart(ctx, shoppingCart);
        };
      })(shoppingCart);
      const revert = ((shoppingCart, fromIndex, toFixture, toIndex, oldDropCoord, fromSort, baseItem) => {
        return () => {
          if (!fromSort) {
            if (baseItem) {
              baseItm = this.sharedService.getObject(baseItm, shoppingCart.$sectionID);
              const deltdItm = shoppingCart[fromIndex];
              Number(deltdItm.Position.IDMerchStyle) == AppConstantSpace.MERCH_BEHIND
                ? (baseItm.hasBackItem = true)
                : Number(deltdItm.Position.IDMerchStyle) == AppConstantSpace.MERCH_ABOVE
                  ? (baseItm.hasAboveItem = true)
                  : '';
              deltdItm.baseItem = baseItem;
            }
            // on reverting delete action in NICI projects, for non-add items, revert to retain and clear last location meta data.
            // This is done because for add items, rec does not change, and ignore items are invalid use case.
            if (this.parentApp.isAllocateAppInNiciProjectType || this.parentApp.isAssortAppInIAssortNiciMode) {
              const item = shoppingCart.Children[fromIndex];
              if (item?.Position.attributeObject.RecADRI === AssortRecADRI.Delete) {
                item.Position.attributeObject.RecADRI = AssortRecADRI.Retain;
                this.Position._LastLocation.DescData = this.Position._PosDeletedRef.DescData = "";
              }
            }
            shoppingCart.movePosition(
              ctx,
              fromIndex,
              toFixture,
              toIndex,
              oldDropCoord,
              false,
            );
          }
        };
      })(shoppingCart, toIndex, currentFixtureObj, currentIndex, oldDropCoord, fromSort, this.baseItem);
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'DeleteItems',
      }, this.$sectionID);
      if (this.baseItem) {
        baseItm = this.sharedService.getObject(this.baseItem, this.$sectionID);
        Number(this.Position.IDMerchStyle) == AppConstantSpace.MERCH_BEHIND
          ? (baseItm.hasBackItem = false)
          : Number(this.Position.IDMerchStyle) == AppConstantSpace.MERCH_ABOVE
            ? (baseItm.hasAboveItem = false)
            : '';
        this.baseItem = '';
      }
    } else {
      //feature undo-redo: by abhishek
      //item level delete to cart and undo/redo
      const original = ((obj, shoppingCart, fromSort) => {
        return () => {
          if (!fromSort) obj.moveSelectedToCart.call(obj, ctx, shoppingCart);
        };
      })(this, shoppingCart, fromSort);
      const revert = ((item, toFixture, toIndex, fromSort) => {
        return () => {
          //item is in memory, so add it when undo
          if (!fromSort) toFixture.Children.splice(toIndex, 0, item);
        };
      })(this, currentFixtureObj, currentIndex, fromSort);
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'DeleteItems',
      }, this.$sectionID);
    }
    if (this.parentApp.isAllocateApp) {
      this.allocateUtils.updatePaPositionKey(this);
    }
    /*ends here*/
  }

  // TODO: @og move outside of Position class , called once from product-inventory.component
  public moveSelectedToCartfromProductSearch(ctx: Context, shoppingCart: ShoppingCart): boolean {
    let toIndex = shoppingCart.Children.length;
    let isProductPresentInCart = shoppingCart.checkProductPresentInCart(this);
    let isProductPresentInPog = this.CheckProductPresentInPog(true);
    if (!isProductPresentInCart && !isProductPresentInPog) {
      shoppingCart.addPosition(ctx, this, toIndex, null);
      let me = this;
      const original = ((shoppingCart, me, toIndex) => {
        return () => {
          shoppingCart.addPosition(ctx, me, toIndex, null);
          this.sharedService.updateShoppingCartFromClipboard.next(true);
          this.sharedService.updateShoppingCartFromClipboard.next(false);
        };
      })(shoppingCart, me, toIndex);
      const revert = ((shoppingCart, toIndex) => {
        return () => {
          //item is in memory, so add it when undo
          shoppingCart.Children.splice(toIndex, 1);
          this.sharedService.updateShoppingCartFromClipboard.next(true);
          this.sharedService.updateShoppingCartFromClipboard.next(false);
        };
      })(shoppingCart, toIndex);
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'DeleteItemsFromProductSearch',
      }, this.$sectionID);

      //update key
      if (this.parentApp.isAllocateApp) {
        this.allocateUtils.updatePaPositionKey(this);
      }
      return true;
    } else {
      return false;
    }
  }

  public intersect(p: FourDirectionValues): boolean {
    let itemGap = this.getSKUGap() / 2;
    let r: FourDirectionValues = {
      left: this.Location.X - itemGap,
      top: this.Location.Y,
      right: itemGap + this.Location.X + this.linearWidth(),
      bottom: this.Location.Y + this.linearHeight(),
    };
    return p.left >= r.left && p.left <= r.right && (p.top == undefined || p.top > 0);
  }

  public inbetween(p, nextItem: Position): boolean {
    if (nextItem != null) {
      let leftItem = {
        left: this.Location.X,
        top: this.Location.Y,
        right: this.Location.X + this.linearWidth(),
        bottom: this.Location.Y + this.linearHeight(),
      };
      let rightItem = {
        left: nextItem.Location.X,
        top: nextItem.Location.Y,
        right: nextItem.Location.X + nextItem.linearWidth(),
        bottom: nextItem.Location.Y + nextItem.linearHeight(),
      };
      return p.left > leftItem.right && p.left < rightItem.left;
    } else {
      return true;
    }
  }

  public copy(source) {
    return source.map(it => it.Values);
  }

  public itemDimensions() {

    let fixture = this.parent;
    if (Utils.checkIfBasket(fixture) || Utils.checkIfCoffincase(fixture)) {
      return {
        left: this.Location.X,
        bottom: this.getYPosToPog(true),
        front: this.getZPosToPog() + this.linearDepth(),
        right: this.Location.X + this.linearWidth(),
        top: this.getZPosToPog() + this.linearDepth(),
        back: this.Location.Z,
      };
    } else {
      const r = {
        left: this.Location.X,
        bottom: this.getYPosToPog(true),
        front: this.getZPosToPog() + this.linearDepth(),
        right: this.Location.X + this.linearWidth(),
        top: this.getYPosToPog(true) + this.linearHeight(),
        back: this.Location.Z,
      };
      // remove half of SKU X Gap on last product
      if (fixture.Children[fixture.Children.length - 1] == this) {
        r.right -= this.Position.SKUGapX / 2;
      }
      return r;
    }
  }

  public updateFitCheckStatusText() {
    let child: any = this;
    child.Position.IDOrientationtext = Utils.findObjectKey(
      this.planogramStore.lookUpHolder.Orientation.options,
      child.Position.IDOrientation,
    );
    child.Position.LKFitCheckStatustext = Utils.findObjectKey(
      this.planogramStore.lookUpHolder.PositionFitCheckStatus.options,
      child.Position.LKFitCheckStatus,
    );
  }

  public setFitCheckErrorMessages(code: number): void {
    //feature undo-redo: by abhishek
    //dt. 11th, Aug, 2014

    const original = ((that, code) => {
      return () => {
        this.Position.LKFitCheckStatus = code;
        this.updateFitCheckStatusText();
      };
    })(this, code);
    const revert = ((that, code) => {
      return () => {
        this.Position.LKFitCheckStatus = code;
        this.updateFitCheckStatusText();
      };
    })(this, this.Position.LKFitCheckStatus);
    this.historyService.captureActionExec({
      funoriginal: original,
      funRevert: revert,
      funName: 'MoveFixtures',
    }), this.$sectionID;
    /* undo-redo ends */
    this.Position.LKFitCheckStatus = code;
    this.updateFitCheckStatusText();
  }

  public getZIndex(): number | string {
    if (this.hasBackItem) {
      return 2;
    }
    // Increase z-index for product that hang over other shelves
    if (this.Location.Y < 0) {
      return '9';
    }
    return '1';
  }
  public getOpacity(): number {
    if (this.hasBackItem) {
      return 0.7;
    }
    return 1;
  }

  public checkAndCalcIfContrainUpdated(field: string, valueNew: any, valueOld: any): void {

    let model = this;
    let updatedFlag = false;
    let affectingField = '';
    let affectingFieldOldVal;
    if (field == 'Position.MinFacingsX') {
      if (valueNew > this.Position.FacingsX) {
        affectingFieldOldVal = this.Position.FacingsX;
        affectingField = 'Position.FacingsX';
        updatedFlag = true;
        this.Position.FacingsX = valueNew;
        const dObj = {
          field: 'Position.FacingsX',
          newValue: valueNew,
          IDPOGObject: this.IDPOGObject,
          gridType: 'Position',
          tab: null,
        };
        this.sharedService.workSheetEvent.next(dObj);
      }
    }

    if (field == 'Position.MaxFacingsX') {
      if (valueNew < this.Position.FacingsX) {
        affectingFieldOldVal = this.Position.FacingsX;
        affectingField = 'Position.FacingsX';
        updatedFlag = true;
        this.Position.FacingsX = valueNew;
        const dObj = {
          field: 'Position.FacingsX',
          newValue: valueNew,
          IDPOGObject: this.IDPOGObject,
          gridType: 'Position',
          tab: null,
        };
        this.sharedService.workSheetEvent.next(dObj);
      }
    }

    if (field == 'Position.MaxFacingsY') {
      if (valueNew < this.Position.FacingsY) {
        affectingFieldOldVal = this.Position.FacingsY;
        affectingField = 'Position.FacingsY';
        updatedFlag = true;
        this.Position.FacingsY = valueNew;
        const dObj = {
          field: 'Position.FacingsY',
          newValue: valueNew,
          IDPOGObject: this.IDPOGObject,
          gridType: 'Position',
          tab: null,
        };
        this.sharedService.workSheetEvent.next(dObj);
      }
    }

    if (field == 'Position.MaxLayoversY') {
      if (valueNew < this.Position.LayoversY) {
        affectingFieldOldVal = this.Position.LayoversY;
        affectingField = 'Position.LayoversY';
        updatedFlag = true;
        this.Position.LayoversY = valueNew;
        const dObj = {
          field: 'Position.LayoversY',
          newValue: valueNew,
          IDPOGObject: this.IDPOGObject,
          gridType: 'Position',
          tab: null,
        };
        this.sharedService.workSheetEvent.next(dObj);
      }
    }

    if (updatedFlag) {
      const original = ((sharedService, $id, field, value, sectionId) => {
        return () => {
          this.sharedService.setObjectField($id, field, value, sectionId);
        };
      })(this.sharedService, model.$id, affectingField, valueNew, model.$sectionID);
      const revert = ((sharedService, $id, field, value, sectionId) => {
        return () => {
          this.sharedService.setObjectField($id, field, value, sectionId);
        };
      })(this.sharedService, model.$id, affectingField, affectingFieldOldVal, model.$sectionID);
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'beforeFieldUpdate',
      }, this.$sectionID);
    }
  }

  public getRectCoordinates(selectedItem: Position) {
    let x1 = selectedItem.getXPosToPog();
    let x2 = this.getXPosToPog();
    let y1 = selectedItem.getYPosToPog();
    let y2 = this.getYPosToPog();
    let xstart = 0;
    let ystart = 0;
    let xend = 0;
    let yend = 0;
    if (x1 < x2 && y1 < y2) {
      //when next selected x and y coordinates greater than the last selected x and y coordinates
      xstart = selectedItem.getXPosToPog();
      ystart = selectedItem.getYPosToPog();
      xend = this.linearWidth() + this.getXPosToPog();
      yend = this.linearHeight() + this.getYPosToPog();
    } else if (x1 > x2 && y1 > y2) {
      //when next selected x coordinates smaller than the last selected x coordinates
      xstart = this.getXPosToPog();
      ystart = this.getYPosToPog();
      xend = selectedItem.linearWidth() + selectedItem.getXPosToPog();
      yend = selectedItem.linearHeight() + selectedItem.getYPosToPog();
    } else if (x1 > x2 && y1 == y2) {
      xstart = this.getXPosToPog();
      ystart = this.getYPosToPog();
      xend = selectedItem.linearWidth() + selectedItem.getXPosToPog();
      yend = selectedItem.linearHeight() + selectedItem.getYPosToPog();
    } else if (x1 < x2 && y1 == y2) {
      xstart = selectedItem.getXPosToPog();
      ystart = selectedItem.getYPosToPog();
      xend = this.linearWidth() + this.getXPosToPog();
      yend = this.linearHeight() + this.getYPosToPog();
    } else if (x1 < x2 && y1 > y2) {
      xstart = selectedItem.getXPosToPog();
      ystart = this.getYPosToPog();
      xend = this.linearWidth() + this.getXPosToPog();
      yend = selectedItem.linearHeight() + selectedItem.getYPosToPog();
    } else if (x1 > x2 && y1 < y2) {
      xstart = this.getXPosToPog();
      ystart = selectedItem.getYPosToPog();
      xend = selectedItem.linearWidth() + selectedItem.getXPosToPog();
      yend = this.linearHeight() + this.getYPosToPog();
    } else if (x1 == x2 && y1 > y2) {
      xstart = selectedItem.getXPosToPog();
      ystart = this.linearHeight() + this.getYPosToPog();
      xend = selectedItem.getXPosToPog() + this.linearWidth();
      yend = selectedItem.getYPosToPog();
    } else if (x1 == x2 && y1 < y2) {
      xstart = this.getXPosToPog();
      ystart = selectedItem.linearHeight() + selectedItem.getYPosToPog();
      xend = this.getXPosToPog() + selectedItem.linearWidth();
      yend = this.getYPosToPog();
    }

    return {
      xstart,
      xend,
      ystart,
      yend,
    };
  }

  public reassignFixture(ctx: Context, spreadShelfs: StandardShelf[], refresh: RefreshParams): number {
    let overFlow = 0,
      removedPosition = 0;
    const shelf = this.parent.asStandardShelf();
    if (!shelf) {
      return;
    }
    let xposFromPog = this.getXPosToPog();
    let crunchMode = shelf.Fixture.LKCrunchMode;
    let posX = xposFromPog;
    if (crunchMode == 9) {
      posX = xposFromPog + this.linearWidth();
    }
    spreadShelfs = Utils.sortByXPos(spreadShelfs);
    for (const spShelf of spreadShelfs) {
      const shelfXposFromPog = spShelf.getXPosToPog();
      overFlow = shelfXposFromPog + spShelf.getChildDimensionWidth();
      let intersectionFlag = overFlow > posX && posX >= shelfXposFromPog;
      if (crunchMode == 9) {
        intersectionFlag = overFlow >= posX && posX > shelfXposFromPog;
      }
      if (intersectionFlag && spShelf.spreadSpanProperties.isSpreadSpan) {
        if (shelf.$id === spShelf.$id) {
          break;
        }
        //remove from pos fixture and add it to spreadShelfs[i]
        let fromIndex = shelf.Children.indexOf(this);
        if (fromIndex == -1) {
          break;
        }
        //We are removing all the items at a time, once single items crosses the border. We are changing all the items parents.
        let posOverFlowing = false;
        let posOverFlowCount = 1;
        if (posX > shelf.getXPosToPog() + shelf.getChildDimensionWidth()) {
          let allPosInShelf = shelf.getAllPosition();
          //All positions with out top and behind items
          let allPositions = _.filter(allPosInShelf, { baseItem: '' });
          let endPosition = allPositions[allPositions.length - 1];
          posOverFlowing = true;
          posOverFlowCount = allPosInShelf.length - fromIndex;
          fromIndex = shelf.Children.indexOf(endPosition);
        }
        let positionToAdd = shelf.Children[fromIndex];
        if (!this.sharedService.isStartedRecording && refresh.recFlag) {
          this.historyService.startRecording(true);
        }

        let backBehindItms =
          this.hasBackItem || this.hasAboveItem
            ? shelf.Children.filter((itm: Position) => {
              return itm.baseItem == this.$id;
            })
            : [];
        let toIndex = spShelf.getSpreadIndex(this);
        ctx.reset();
        for (let i = 0; i < posOverFlowCount; i++) {
          shelf.movePosition(
            ctx,
            fromIndex,
            spShelf,
            toIndex,
            { left: xposFromPog - shelfXposFromPog, top: positionToAdd.Location.Y },
            undefined,
            undefined,
            refresh, true
          );
          backBehindItms.forEach((itms) => {
            shelf.movePosition(
              ctx,
              shelf.Children.indexOf(itms),
              spShelf,
              toIndex + 1,
              { left: this.Location.X, top: itms.Location.Y },
              undefined,
              undefined,
              refresh,
            );
          });
          if (posOverFlowing) {
            fromIndex = fromIndex - 1;
            removedPosition = posOverFlowCount - 1;
          }
        }


        removedPosition++;
        break;
      }
    }
    return removedPosition;
  }

  //When number of facings or Orientation has been changed need to check for fit check errors
  //Here Covering the cases Orientation and Facings
  public isValidFitChange(value, field): boolean {

    // let that = this;
    let widthAfterChange = 0,
      heightAfterChange = 0,
      depthAfterChange = 0;
    let isValidFlag = true;
    let parentObj = this.parent as MerchandisableList;
    //if (Utils.checkIfstandardShelf(parentObj)){
    //    return isValidFlag;
    //}
    const isValidFacingChange = (isBaseItm, item, widthAfterChange, heightAfterChange, depthAfterChange) => {
      if (isBaseItm) {
        //width, height and depth should be validated
        let minHeight = 0,
          minWidth = 0,
          minDepth = 0;
        let childItms: Position[] = (parentObj.Children as Position[]).filter(pos => item.$id == pos.baseItem);
        let behindItm = childItms.filter(function (itm) {
          return Number(itm.Position.IDMerchStyle) == AppConstantSpace.MERCH_BEHIND;
        })[0];
        let aboveItm = childItms.filter(function (itm) {
          return Number(itm.Position.IDMerchStyle) == AppConstantSpace.MERCH_ABOVE;
        })[0];

        //Width validation
        minWidth = childItms.reduce((a, b) => {
          return Math.max(a, b.computeWidth(value, field));
        }, 0);
        //Depth validation
        minDepth = behindItm ? behindItm.linearDepth() + depthAfterChange : aboveItm.computeDepth(value, field);
        //Height validation
        //let minHeight = aboveItm ? aboveItm.linearHeight() + heightAfterChange : heightAfterChange;
        if (widthAfterChange < minWidth) {
          return false;
        }
        if (aboveItm && depthAfterChange < minDepth) {
          return false;
        }
        if (behindItm && minDepth > parentObj.getChildDimensionDepth(item)) {
          return false;
        }
        if (aboveItm && aboveItm.computeHeight(value, field) + heightAfterChange > parentObj.Dimension.Height) {
          return false;
        }
      } else {
        let baseItem = this.sharedService.getObject(item.baseItem, this.$sectionID) as Position,
          minWidth = 0,
          minHeight = 0,
          minDepth = 0;
        minWidth = baseItem.linearWidth();
        minHeight =
          Number(item.Position.IDMerchStyle) == AppConstantSpace.MERCH_ABOVE
            ? heightAfterChange + baseItem.linearHeight()
            : heightAfterChange;
        minDepth =
          Number(item.Position.IDMerchStyle) == AppConstantSpace.MERCH_BEHIND
            ? depthAfterChange + baseItem.linearDepth()
            : depthAfterChange;
        if (widthAfterChange > minWidth) {
          return false;
        }

        if (
          Number(item.Position.IDMerchStyle) == AppConstantSpace.MERCH_BEHIND &&
          minDepth > parentObj.getChildDimensionDepth(item)
        ) {
          return false;
        } else if (
          Number(item.Position.IDMerchStyle) == AppConstantSpace.MERCH_ABOVE &&
          minDepth > baseItem.linearDepth()
        ) {
          return false;
        }
        if (
          Number(item.Position.IDMerchStyle) == AppConstantSpace.MERCH_ABOVE &&
          minHeight > parentObj.Dimension.Height
        ) {
          return false;
        }
        // Note: Behind item can have more height than base item
        // else if (
        //   Number(item.Position.IDMerchStyle) == AppConstantSpace.MERCH_BEHIND &&
        //   minHeight > baseItem.linearHeight()
        // ) {
        //   return false;
        // }
      }

      return true;
    };

    if (!(parentObj instanceof Modular || parentObj instanceof BlockFixture)) {
      widthAfterChange = parentObj.linearWidthPosition(this, value, field);
      if (parentObj.Fixture.AutoComputeFronts) {
        heightAfterChange = this.computeHeight(value, field);
      } else {
        heightAfterChange = parentObj.linearHeightPosition(this, value, field);
      }
      if (parentObj.Fixture.AutoComputeDepth) {
        depthAfterChange = this.computeDepth(value, field);
      } else {
        depthAfterChange = parentObj.linearDepthPosition(this, value, field);
      }
    }

    // const parentStandardShelf = parentObj.asStandardShelf();

    if (Utils.checkIfstandardShelf(parentObj)) {
      //if (field == 'Position.FacingsX' || field == 'Position.FacingsY' || field == 'Position.IDOrientation' || field == 'Position.FacingsZ') {
      if (this.baseItem != '') {
        isValidFlag = isValidFacingChange(false, this, widthAfterChange, heightAfterChange, depthAfterChange);
      } else if (this.hasAboveItem || this.hasBackItem) {
        isValidFlag = isValidFacingChange(true, this, widthAfterChange, heightAfterChange, depthAfterChange);
      } else
        isValidFlag = parentObj.checkIfValidChange(this, widthAfterChange, heightAfterChange, depthAfterChange);
      //}
    }


    if (
      Utils.checkIfPegType(parentObj) ||
      Utils.checkIfCoffincase(parentObj) ||
      Utils.checkIfBasket(
        parentObj,
      ) /*&& rootObject.fitCheck For the selected fixture types items cross boundary is not valid. */
    ) {
      if ((field == 'Position.FacingsX' && Utils.checkIfPegType(parentObj)) || field == 'Position.IDOrientation' || field == 'Position.FacingsZ') {
        isValidFlag = parentObj.checkIfValidChange(this, widthAfterChange, heightAfterChange, depthAfterChange);
      } else if (field == 'Position.FacingsY') {
        if (Utils.checkIfPegboard(parentObj) || Utils.checkIfSlotwall(parentObj)) {
          let diffHt = heightAfterChange - this.Dimension.Height;
          let newLoc = this.Location.Y - diffHt;
          //newLoc = parentObj.getPosXY(this, this.Location.X, newLoc);
          let positionXYCords: any = {};
          positionXYCords.X1 = this.Location.X;
          positionXYCords.X2 = positionXYCords.X1 + widthAfterChange;
          positionXYCords.Y1 = newLoc;
          positionXYCords.Y2 = positionXYCords.Y1 + heightAfterChange;
          let pegInfo = this.getPegInfo();
          let dropCord = {
            left: positionXYCords.X1 + pegInfo.OffsetX,
            top: newLoc + pegInfo.OffsetY,
          };

          isValidFlag = parentObj.checkIfValidChange(
            this,
            widthAfterChange,
            heightAfterChange,
            depthAfterChange,
            { positionXYCords: positionXYCords, dropCord: dropCord },
          );
        } else
          isValidFlag = parentObj.checkIfValidChange(
            this,
            widthAfterChange,
            heightAfterChange,
            depthAfterChange,
          );
      }

      return isValidFlag;
    }
    return isValidFlag;
  }

  public getRectDimension(): Size3 {
    return this.getSelectRectDimension(true);
  }

  public getSelectRectDimension(ignoreView = false): Size3 {
    const width = this.Dimension.Width;
    let height = this.Dimension.Height;
    let depth = this.Dimension.Depth;
    if (this.flipHeightDepth(ignoreView)) {
      height = this.Dimension.Depth;
      depth = this.Dimension.Height;
    }
    return { height, width, depth };
  }

  public getShrinkX(): number {
    let dimension = this.getDimByOrientation(this.Position.ProductPackage.Width, this.Position.ProductPackage.Height, this.Position.ProductPackage.Depth);
    const width = dimension.Width;
    dimension = this.getDimByOrientation(this.Position.ProductPackage.ShrinkPctX, this.Position.ProductPackage.ShrinkPctY, this.Position.ProductPackage.ShrinkPctZ);
    const shrinkPctX = dimension.Width;

    let ShrinkWidth = (Math.round((shrinkPctX * width * 100) / 100) / 100) * this.Position.FacingsX;
    if (ShrinkWidth > 0) {
      ShrinkWidth = -Math.abs(ShrinkWidth);
    } else {
      ShrinkWidth = 0;
    }
    return Math.abs(ShrinkWidth);
  }

  public getSingleFacingShrinkWidth(): number {
    let dimension = this.getDimByOrientation(this.Position.ProductPackage.Width, this.Position.ProductPackage.Height, this.Position.ProductPackage.Depth);
    const width = dimension.Width;
    dimension = this.getDimByOrientation(this.Position.ProductPackage.ShrinkPctX, this.Position.ProductPackage.ShrinkPctY, this.Position.ProductPackage.ShrinkPctZ);
    const shrinkPctX = dimension.Width;
    let ShrinkWidth = (Math.round((shrinkPctX * width * 100) / 100) / 100);
    if (ShrinkWidth > 0) {
      return width - ShrinkWidth;
    }
    return width;
  }

  public getSingleFacingShrinkHeight(): number {
    let dimension = this.getDimByOrientation(this.Position.ProductPackage.Width, this.Position.ProductPackage.Height, this.Position.ProductPackage.Depth);
    const height = dimension.Height;
    dimension = this.getDimByOrientation(this.Position.ProductPackage.ShrinkPctX, this.Position.ProductPackage.ShrinkPctY, this.Position.ProductPackage.ShrinkPctZ);
    const shrinkPctY = dimension.Y;
    let shrinkHeight = (Math.round((shrinkPctY * height * 100) / 100) / 100);
    if (shrinkHeight > 0) {
      return height - shrinkHeight;
    }
    return height;
  }

  //Min height required will be used in future if one can modify the Location Y of the Position from property grid
  public minHeightRequired(): number {
    return this.Dimension.Height;
  }

  // Note: added params to calculate shrink separetly for layoverUnder and baseItem
  public getShrinkY(layoverUnder?: boolean, baseItem?: boolean): number {
    const layHigh = this.Position.IsLayUnder ? this.Position.LayundersY : this.Position.LayoversY;
    let dimension = this.getDimByOrientation(this.Position.ProductPackage.Width, this.Position.ProductPackage.Height, this.Position.ProductPackage.Depth);
    const height = dimension.Height * this.Position.FacingsY;
    const layDepth = dimension.Depth * layHigh;

    dimension = this.getDimByOrientation(this.Position.ProductPackage.ShrinkPctX, this.Position.ProductPackage.ShrinkPctY, this.Position.ProductPackage.ShrinkPctZ);
    const shrinkPctY = dimension.Height;
    const shrinkPctZ = dimension.Depth;

    let shrinkY = 0;
    if (layoverUnder) {
      shrinkY = Math.round((shrinkPctZ * layDepth * 100) / 100) / 100;
    } else if (baseItem) {
      shrinkY = Math.round((shrinkPctY * height * 100) / 100) / 100;
    } else {
      shrinkY = (Math.round((shrinkPctY * height * 100) / 100) / 100) + (Math.round((shrinkPctZ * layDepth * 100) / 100) / 100);
    }

    if (shrinkY > 0) {
      shrinkY = -Math.abs(shrinkY);
    } else {
      shrinkY = 0;
    }
    return Math.abs(shrinkY);
  }

  // Note: added params to calculate shrink separetly for layoverUnder and baseItem
  public getShrinkZ(layoverUnder?: boolean, baseItem?: boolean): number {
    const layDeep = this.Position.IsLayUnder ? this.Position.LayundersZ : this.Position.LayoversZ;
    let dimension = this.getDimByOrientation(this.Position.ProductPackage.Width, this.Position.ProductPackage.Height, this.Position.ProductPackage.Depth);
    const depth = dimension.Depth * this.Position.FacingsZ;
    const layHeight = dimension.Height * layDeep;

    dimension = this.getDimByOrientation(this.Position.ProductPackage.ShrinkPctX, this.Position.ProductPackage.ShrinkPctY, this.Position.ProductPackage.ShrinkPctZ);
    const shrinkPctZ = dimension.Depth;
    const shrinkPctY = dimension.Height;

    let shrinkZ = 0;
    if (layoverUnder) {
      shrinkZ = Math.round((shrinkPctY * layHeight * 100) / 100) / 100;
    } else if (baseItem) {
      shrinkZ = Math.round((shrinkPctZ * depth * 100) / 100) / 100;
    } else {
      shrinkZ = (Math.round((shrinkPctZ * depth * 100) / 100) / 100) + (Math.round((shrinkPctY * layHeight * 100) / 100) / 100);
    }

    if (shrinkZ > 0) {
      shrinkZ = -Math.abs(shrinkZ);
    } else {
      shrinkZ = 0;
    }
    return Math.abs(shrinkZ);
  }

  // Note: added params to calculate shrink separetly for layoverUnder and baseItem
  public getShrinkDepth(skipShrink?: boolean, skipUnits?: boolean, layoverUnder?: boolean, baseItem?: boolean): number {
    let shrinkValue = 0;
    const parent = this.parent;
    if (!parent) {
      this.updateShrinkValue(2, shrinkValue, skipShrink);
      return shrinkValue;
    }
    const parentStandardShelfOrCoffincase = parent.asCoffincase() || parent.asStandardShelf();

    if (!skipShrink && parentStandardShelfOrCoffincase) {
      let depth = 0;
      parentStandardShelfOrCoffincase.getAllPosInZDirection(this).forEach((pos) => {
        depth += pos.linearDepth(true, skipUnits, baseItem);
      });
      const shelfDepth = parent.asCoffincase() ? parentStandardShelfOrCoffincase.ChildDimension.Height : (layoverUnder ? this.Dimension.Depth : parentStandardShelfOrCoffincase.ChildDimension.Depth);
      if (shelfDepth < depth) {
        const maxAvailableSqueeze = parentStandardShelfOrCoffincase.getMaxAvailableSqueezeZ(this, layoverUnder, baseItem);
        const requiredLinear = parentStandardShelfOrCoffincase.getRequiredLinearZ(this, layoverUnder);
        const percentageRequiredLinear = parentStandardShelfOrCoffincase.percentageRequiredLinear(requiredLinear, maxAvailableSqueeze);
        shrinkValue = this.getRequiredShrinkZ(percentageRequiredLinear, layoverUnder, baseItem);
      } else {
        shrinkValue = 0;
      }
    } else {
      shrinkValue = 0;
    }
    this.updateShrinkValue(2, shrinkValue, skipShrink);
    return shrinkValue;
  }

  public getRequiredShrinkX(percentageRequiredLinear: number): number {
    percentageRequiredLinear = percentageRequiredLinear < 100 ? ++percentageRequiredLinear : percentageRequiredLinear;
    const requiredShrinkLinear = Math.round(percentageRequiredLinear * this.getShrinkX() * 100) / 100 / 100;
    let ShrinkWidth = requiredShrinkLinear / this.Position.FacingsX;

    if (ShrinkWidth > 0) {
      ShrinkWidth = -Math.abs(ShrinkWidth);
    } else {
      ShrinkWidth = 0;
    }
    return ShrinkWidth;
  }

  public getShrinkWidth(skipShrink?: boolean, posFacingsX?: number, skipUnits?: boolean): number {
    let shrinkValue = 0;
    const parent = this.parent;
    if (!parent) {
      this.updateShrinkValue(0, shrinkValue, skipShrink);
      return shrinkValue;
    }

    const oldFacingsXValue = this.Position.FacingsX;
    this.Position.FacingsX = posFacingsX && posFacingsX != this.Position.FacingsX ? posFacingsX : this.Position.FacingsX;
    const parentStandardShelfOrCoffincase = parent.asStandardShelf() || parent.asCoffincase();
    if (parentStandardShelfOrCoffincase?.Fixture.ForceApplyShrinkX) {
      shrinkValue = -Math.abs(this.getShrinkX()) / this.Position.FacingsX;
    } else if (!skipShrink) {
      if (parent.asCoffincase() && this.calculatedShrinkValues && this.calculatedShrinkValues['ShrinkX'] != undefined) {
        shrinkValue = -Math.abs(this.calculatedShrinkValues['ShrinkX']);
      } else {
        const canUseShrinkVal = parentStandardShelfOrCoffincase?.setCanUseShrinkVal(this, skipUnits);
        if (canUseShrinkVal) {
          //check available linear of parent
          //calculate shrink X of each item taking percentile
          const maxAvailableSqueeze = parentStandardShelfOrCoffincase.getMaxAvailableSqueeze(this);
          const requiredLinear = parentStandardShelfOrCoffincase.getRequiredLinear(this);
          if (maxAvailableSqueeze > requiredLinear) {
            const coffinCase = parent.asCoffincase();
            const hasOnlyCurrentPos = coffinCase && coffinCase.getAllPosInXDirWithNearest(this).filter(p => p.$id != this.$id).length == 0;
            if (hasOnlyCurrentPos) {
              shrinkValue = -Math.abs(requiredLinear / this.Position.FacingsX);
            } else {
              const percentageRequiredLinear = parentStandardShelfOrCoffincase.percentageRequiredLinear(requiredLinear, maxAvailableSqueeze);
              shrinkValue = this.getRequiredShrinkX(percentageRequiredLinear);
            }
          } else {
            shrinkValue = -Math.abs(this.getShrinkX()) / this.Position.FacingsX;
          }
        } else {
          shrinkValue = 0;
        }
      }
    } else {
      shrinkValue = 0;
      if (!parentStandardShelfOrCoffincase) {
        this.Position.ShrinkWidth = 0;
        this.Position.ShrinkHeight = 0;
        this.Position.ShrinkDepth = 0;
      }
    }
    this.Position.FacingsX = oldFacingsXValue;
    this.cachedShrinkWidth = shrinkValue;
    this.updateShrinkValue(0, shrinkValue, skipShrink);
    return this.cachedShrinkWidth;
  }

  // Note: added params to calculate shrink separetly for layoverUnder and baseItem
  public getShrinkHeight(skipShrink?: boolean, skipUnits?: boolean, layoverUnder?: boolean, baseItem?: boolean): number {
    let shrinkValue = 0;
    const parent = this.parent;
    if (!parent) {
      this.updateShrinkValue(1, shrinkValue, skipShrink);
      return shrinkValue;
    }
    const parentStandardShelfOrCoffincase = parent.asStandardShelf() || parent.asCoffincase();

    if (!skipShrink && parentStandardShelfOrCoffincase) {
      if (parent.asCoffincase() && this.calculatedShrinkValues && this.calculatedShrinkValues['ShrinkY'] != undefined) {
        shrinkValue = -Math.abs(this.calculatedShrinkValues['ShrinkY']);
      } else {
        let height = 0;
        parentStandardShelfOrCoffincase.getAllPosInYDirection(this).forEach((pos) => {
          height += pos.linearHeight(true, skipUnits);
        });
        let shelfHeight = parent.asCoffincase() ? parentStandardShelfOrCoffincase.ChildDimension.Depth : parentStandardShelfOrCoffincase.ChildDimension.Height;
        if (parent.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ && parent.Fixture.HasDividers) {
          shelfHeight = parent.asCoffincase().getDividerBlockHeight(this);
        }
        if (shelfHeight < height) {
          const maxAvailableSqueeze = parentStandardShelfOrCoffincase.getMaxAvailableSqueezeY(this);
          const requiredLinear = parentStandardShelfOrCoffincase.getRequiredLinearY(this);
          const percentageRequiredLinear = parentStandardShelfOrCoffincase.percentageRequiredLinear(requiredLinear, maxAvailableSqueeze);
          shrinkValue = this.getRequiredShrinkY(percentageRequiredLinear, layoverUnder, baseItem);
        } else {
          shrinkValue = 0;
        }
      }
    } else {
      shrinkValue = 0;
    }
    this.updateShrinkValue(1, shrinkValue, skipShrink);
    return shrinkValue;
  }

  // Note: added params to calculate shrink separetly for layoverUnder and baseItem
  private getRequiredShrinkZ(percentageRequiredLinear: number, layoverUnder?: boolean, baseItem?: boolean): number {
    percentageRequiredLinear = percentageRequiredLinear < 100 ? ++percentageRequiredLinear : 100;
    const requiredShrinkLinear = Math.round(percentageRequiredLinear * this.getShrinkZ(layoverUnder, baseItem) * 100) / 100 / 100;
    const facingsZ = layoverUnder ? (this.Position.IsLayUnder ? this.Position.LayundersZ : this.Position.LayoversZ) : this.Position.FacingsZ;
    let ShrinkDepth = Math.round(requiredShrinkLinear / facingsZ * 100) / 100;

    if (ShrinkDepth > 0) {
      ShrinkDepth = -Math.abs(Number(ShrinkDepth.toFixed(2)));
    } else {
      ShrinkDepth = 0;
    }
    return ShrinkDepth;
  }

  // Note: added params to calculate shrink separetly for layoverUnder and baseItem
  public getRequiredShrinkY(percentageRequiredLinear: number, layoverUnder?: boolean, baseItem?: boolean): number {
    percentageRequiredLinear = percentageRequiredLinear < 100 ? ++percentageRequiredLinear : 100;
    const requiredShrinkLinear = Math.round(percentageRequiredLinear * this.getShrinkY(layoverUnder, baseItem) * 100) / 100 / 100;
    const facingsY = layoverUnder ? (this.Position.IsLayUnder ? this.Position.LayundersY : this.Position.LayoversY) : this.Position.FacingsY;
    let ShrinkHeight = Math.round(requiredShrinkLinear / facingsY * 100) / 100;

    if (ShrinkHeight > 0) {
      ShrinkHeight = -Math.abs(Number(ShrinkHeight.toFixed(2)));
    } else {
      ShrinkHeight = 0;
    }
    return ShrinkHeight;
  }

  private updateShrinkValue(shrinkIndex: number, shrinkValue: number, skipShrink: boolean): void {
    if (!skipShrink) {
      let orientation = this.getOrientation();
      const Dims = this.OrientNS.OrientationToDim[this.OrientNS.ViewOrientation[orientation][this.OrientNS.View.Front]];
      switch (Dims[shrinkIndex]) {
        case 0:
          this.Position.ShrinkWidth = shrinkValue;
          break;
        case 1:
          this.Position.ShrinkHeight = shrinkValue;
          break;
        case 2:
          this.Position.ShrinkDepth = shrinkValue;
          break;
      }
    }
  }

  public getDimByOrientation(width: number, height: number, depth: number): { Width: number, Height: number, Depth: number, X: number, Y: number, Z: number } {
    let orientation = this.getOrientation();
    return this.OrientNS.GetDimensions(
      orientation,
      false,
      this.OrientNS.View.Front,
      width,
      height,
      depth,
    );
  }

  public getSKUGap(negXgap: boolean = false, shrinkedWidth: number = 0): number {
    if (this.Position.SKUGapX > 0 && !negXgap) {
      return this.Position.SKUGapX;
    } else if (
      this.Position.SKUGapX < 0 &&
      negXgap &&
      shrinkedWidth > -this.Position.SKUGapX
    ) {
      return this.Position.SKUGapX;
    } else {
      return 0;
    }
  }

  public getSKUGapY(): number {
    return this.Position.SKUGapY / (this.Location.Y === 0 ? 2 : 1);
  }

  public getLockErrorMsg(errMsg?: string): string {
    return errMsg || `${this.Position.Product.UPC}${this.translate.instant('POSITOIN_LOCKED_CANT_MODIFY')}`;
  }
  public getRotation(): number {
    return this.parent.Rotation.X;
  }

  /** @arg face 1 to 9 */
  public getImageURlfromView(face: number, isUnitCap?: boolean): string {
    const images = isUnitCap ? this.unitPackageItemInfos.PackageImages : this.Position.ProductPackage.Images;
    return {
      1: images.front,
      2: images.left,
      3: images.top,
      7: images.back,
      8: images.right,
      9: images.bottom
    }[face] || '';
  }

  public asPosition(): Position {
    return this;
  }


  public getDividerInfo(fixture: StandardShelf | Coffincase): DividerInfo {

    const color = fixture.Fixture.DividerColor || '#C0C0C0';
    let dividerHeight = 0;
    let dividerWidth = 0;
    let dividerDepth = 0;
    let dividerSlotStart = 0;
    let dividerSlotSpacing = 0;

    const dividerItemData = fixture.Children.find((obj) => obj.ObjectDerivedType == AppConstantSpace.DIVIDERS);
    if (dividerItemData != undefined && fixture.Fixture.HasDividers) {
      dividerHeight = dividerItemData.Fixture.Height;
      dividerWidth = dividerItemData.Fixture.Width;
      dividerDepth = dividerItemData.Fixture.Depth;
      if (fixture.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
        dividerSlotStart = dividerItemData.Fixture._DividerSlotStart.ValData;
        dividerSlotSpacing = dividerItemData.Fixture._DividerSlotSpacing.ValData;
      }
    }

    const dividerInfo: DividerInfo = {
      Width: dividerWidth,
      Height: dividerHeight,
      Depth: dividerDepth,
      Color: color,
      Type: Number(this.Position.LKDividerType),
      SlotEnd: fixture.Fixture.DividerSlotEnd,
      SlotSpacing: dividerSlotSpacing,
      SlotStart: dividerSlotStart,
    };
    // Inherit Divider Type
    if (dividerInfo.Type == DividerTypes.Inherit) {
      if (fixture.Fixture.LKDividerType != undefined)
      {
        if (dividerItemData != undefined && fixture.Fixture.HasDividers) {
          dividerInfo.Type = Number(dividerItemData.Fixture.LKDividerType);
        }
      }
      }

    // SlotSpacing cannot be zero or it will create divide by zero exceptions
    if (dividerInfo.SlotSpacing <= 0) dividerInfo.SlotSpacing = 0.01;
    return dividerInfo;
  }

  private updateLastLocationAndADRI(): void {
    // allocate NICI project rules screen or assort nici
    if ((this.parentApp.isAllocateAppInNiciProjectType && this.parentApp.isAllocateAppInManualMode) ||
      this.parentApp.isAssortAppInIAssortNiciMode) {
      const delString = {
        Location: this.Location,
        Dimention: this.Dimension,
        $idParent: this.$idParent,
        IDPOGObjectParent: this.IDPOGObjectParent,
        LastLocation: { "Bay": this.Fixture.ModularNumber, "Fixture": this.Fixture.FixtureNumber, "Position": this.Position.PositionNo }
      };

      if (this.Position.attributeObject.RecADRI != AssortRecADRI.Add) {
        if (this.parentApp.isNiciMode) {
          this.Position.attributeObject.RecADRI = AssortRecADRI.Delete;
        }
        this.Position._PosDeletedRef.DescData = JSON.stringify([delString]);
        if (this.Position._LastLocation.DescData == null) {
          this.Position._LastLocation.DescData =
            `Bay : ${this.Fixture.ModularNumber} Fixture : ${this.Fixture.FixtureNumber} Position : ${this.Position.PositionNo}`;
        }
      }
    }
  }

  public getBackHookLoc(): { x1: number, x2: number, y: number } {
    const posXY = (this.parent as PegBoard).getPosXY(this, null, null);
    const x1 = Utils.preciseRound(posXY.X + this.Position.ProductPegHole1X - this.pegOffsetX, 2);

    const packageBlock = this.$packageBlocks.find(x => x.type === 'product');
    const dimensions = this.OrientNS.GetDimensions(
      this.getOrientation(),
      false,
      this.OrientNS.View.Front,
      this.Position.ProductPackage.Width,
      this.Position.ProductPackage.Height,
      this.Position.ProductPackage.Depth,
    );
    const width = packageBlock.isUnitCap ? this.unitDimensions.unitWidth : dimensions.Width + this.getShrinkWidth() + this.getSKUGap(true, dimensions.Width + this.getShrinkWidth());
    let posLocX = posXY.X + ((this.Position.FacingsX - 1) * (packageBlock.gapX + width));
    const x2 = Utils.preciseRound(posLocX + this.Position.ProductPegHole1X - this.pegOffsetX + (this.Position.BackSpacing * (this.Position.BackHooks - 1)), 2);

    const height = packageBlock.isUnitCap ? this.unitDimensions.unitHeight : dimensions.Height + this.getShrinkHeight();
    const posLocY = posXY.Y + ((this.Position.FacingsY - 1) * (packageBlock.gapY + height));
    const y = Utils.preciseRound(posLocY + this.Position.ProductPegHoleY - this.pegOffsetY, 2);
    return { x1, x2, y };
  }
  public validationForPegRod(): boolean {
    const parentFixture = this.parent;
    if ((parentFixture.Fixture.FixtureType === AppConstantSpace.PEGBOARDOBJ ||
      parentFixture.Fixture.FixtureType === AppConstantSpace.SLOTWALLOBJ ||
      parentFixture.Fixture.FixtureType === AppConstantSpace.CROSSBAROBJ) &&
      this.section.fitCheck && this.Position.MaxPegWeight > 0 && this.Position.PegWeightCapacity > this.Position.MaxPegWeight) {
      return true;
    }
    return false;
  }

  public calculateWeightCapacity(): void{
    //Lets say during adding the position weight capacity for some position if you are not getting any weight capacity value then you should consider the value as 0
    const productWeightCapacity = this.Position.ProductPackage.Weight ? this.Position.ProductPackage.Weight : 0;
    this.Position.PositionWeightCapacity = productWeightCapacity * ((this.Position.FacingsX * this.Position.FacingsY * this.Position.FacingsZ) + (this.Position.FacingsX * this.Position.LayoversY * this.Position.LayoversZ));
    if (this.parent.Fixture.FixtureType === AppConstantSpace.STANDARDSHELFOBJ && Number(this.Position.IDMerchStyle) == AppConstantSpace.MERCH_ADVANCED_TRAY && this.section.UnitPackageItemInfos.length > 0) {
      const unitPackageInfo = this.section.UnitPackageItemInfos.find(item => item.IDProduct === this.Position.IDProduct);
      const unitWeight = unitPackageInfo ? unitPackageInfo.Weight : 0;
      this.Position.PositionWeightCapacity += (this.Position.UnitCappingCount * unitWeight);
    }
  }

  public getAvailableOrientationsWorksheet(){
    let availableList = this.planogramService.getAvailableOrientations([this]).orientationsList;
    let availableOrientations = [];
    availableList?.forEach((item, key) => {
      let fieldOptionObj: any = {};
      fieldOptionObj.key = item.value;
      fieldOptionObj.value = item.text;
      availableOrientations.push(fieldOptionObj);
    });
    return availableOrientations;
  }


  public getDefaultOrientation(orientationsList?: LookUpChildOptions<number>[]): number {
    let defaultOrientation = 0;
    if (isNaN(this.Position.Product.DefaultOrientation) || Utils.isNullOrEmpty(this.Position.Product.DefaultOrientation)) {
      if (isNaN(this.Position.ProductPackage.DefaultOrientation) || Utils.isNullOrEmpty(this.Position.ProductPackage.DefaultOrientation)) {
        if (!orientationsList?.length) {
          orientationsList = this.planogramService.getAvailableOrientations([this]).orientationsList;
        }
        defaultOrientation = orientationsList.find(item => item.IsDefault)?.value;
        defaultOrientation = isNaN(defaultOrientation) ? orientationsList[0].value : 0;
      } else {
        defaultOrientation = this.Position.ProductPackage.DefaultOrientation;
      }
    } else {
      defaultOrientation = this.Position.Product.DefaultOrientation;
    }
    return defaultOrientation;
  }

  public hasRestrictedOrientation(): boolean{
    const allowedOrientations = this.planogramService.getAvailableOrientations([this]).orientationsList.map(it => it.value);
    return !allowedOrientations.includes(this.Position.IDOrientation);
  }

  public getCurrentTrafficFlowForPosition(nextFixture: PositionParentList): any{
    const rootObj: Section = this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
    let trafficFlow: number = AppConstantSpace.TRAFFICFLOW.LEFT_TO_RIGHT;
    let position: any = nextFixture.Children;
    switch (nextFixture.ObjectDerivedType) {
      case AppConstantSpace.STANDARDSHELFOBJ:
        trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._StandardShelfLKTraffic.ValData : rootObj.LKTraffic;
        break;
      case AppConstantSpace.COFFINCASEOBJ:
        trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj.
          _CoffinCaseLKTraffic.ValData : rootObj.LKTraffic;
        break;
      case AppConstantSpace.BASKETOBJ:
        trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._BasketLKTraffic.ValData : rootObj.LKTraffic;
        break;
      case AppConstantSpace.PEGBOARDOBJ:
        trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._PegboardLKTraffic.ValData : rootObj.LKTraffic;
        break;
      case AppConstantSpace.SLOTWALLOBJ:
        trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._SlotwallLKTraffic.ValData : rootObj.LKTraffic;
        break;
      case AppConstantSpace.CROSSBAR:
        trafficFlow = rootObj.OverrideSectionPosNumbering ? rootObj._CorssbarLKTraffic.ValData : rootObj.LKTraffic;
        break;
    }
    if (trafficFlow === AppConstantSpace.TRAFFICFLOW.RIGHT_TO_LEFT) {
      position = nextFixture.Children.slice();
    }
    if(position[0].Position.PositionNo !== 1){
      position = nextFixture.Children.slice().reverse();
    }
    return position;
  }

}


