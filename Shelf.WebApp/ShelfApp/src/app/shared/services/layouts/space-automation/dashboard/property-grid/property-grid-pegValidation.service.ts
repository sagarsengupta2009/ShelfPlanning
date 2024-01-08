import { Injectable } from '@angular/core';
import { Orientation, PegBoard } from 'src/app/shared/classes';
import { Position } from 'src/app/shared/classes/position';
import { Utils } from 'src/app/shared/constants/utils';
import { PegHoleInfo } from 'src/app/shared/models';
import { PegHookInfo, PegLibrary } from 'src/app/shared/models/peg-library';
import { SharedService, NotifyService, PegLibraryService, HistoryService } from 'src/app/shared/services';
@Injectable({
    providedIn: 'root',
})
export class PropertyGridPegValidationService {
    constructor(
        private readonly historyService: HistoryService,
        private readonly pegLibraryService: PegLibraryService,
        private readonly sharedService: SharedService,
        private readonly notifyService: NotifyService
    ) { }
    public validatedFields(itemData: Position, field:string, value:number) {
        switch (field) {
            case 'Position.BackHooks':
                return this.validateBackHooks(itemData, value);
            case 'Position.BackSpacing':
                return this.validateBackSpacing(itemData, value);
            case 'Position.BackYOffset':
                return this.validateBackYOffset(itemData, value);
            case 'Position.FrontBars':
                return this.validateFrontBars(itemData, value);
            case 'Position.FrontSpacing':
                return this.validateFrontSpacing(itemData, value);
            case 'Position.TagYOffset':
                return this.validateTagYOffset(itemData, value);
            case 'Position.TagXOffset':
                return this.validateTagXOffset(itemData, value);
            case 'Position.TagHeight':
                return this.validateTagHeight(itemData, value);
            case 'Position.TagWidth':
                return this.validateTagWidth(itemData, value);
            case 'Position.HeightSlope':
                return this.validateHeightSlope(itemData, value);
            case 'Position._X05_PEGLENGTH.ValData':
                return this.validatePegLength(itemData, value);
            case 'Position.PegOverhang':
                return this.validatePegOverHang(itemData, value)
            default:
        }
    }
    public changePegFields(itemData: Position, field: string, value: number) {
      switch (field) {
        case 'Position.BackHooks':
          return this.changeBackHooksVal(itemData, value);
        case 'Position.BackSpacing':
          return this.changeBackSpacingVal(itemData, value);
        case 'Position.FrontBars':
          return this.changeFrontBarsVal(itemData, value);
        case 'Position.FrontSpacing':
          return this.changeFrontSpacingVal(itemData, value);
        case 'Position._X05_PEGLENGTH.ValData':
          return this.changePegLengthVal(itemData, value);
        default:
      }
    }
    public validateBackHooks(itemData: Position, value: number): boolean {
      let parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
      const remainingPegHolesToRight = (parentFixture.Dimension.Width - itemData.Location.X) / parentFixture.getPegHoleInfo().PegIncrementX;//@Rajesh Need to change  considering the positionlocationx and pegOffset once we get from Narendra
      const oldValue = itemData.Position.BackHooks;
      itemData.Position.BackHooks = value;
      let isValid = true;
      if (this.checkIfPegHooksOverlap(itemData)) {
        isValid = false;
      } else if (value > remainingPegHolesToRight) {
        this.notifyService.warn('BACK_HOOK_CANT_BE_MORE_THAN_PEGHOLES_COUNT_IN_PEGBOARD');
        isValid = false;
      }
      itemData.Position.BackHooks = oldValue;
      return isValid;
    }
    public validateBackSpacing(itemData: Position, value: number): boolean {
      let parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
      const PHI = parentFixture.getPegHoleInfo();
      const possibleBackSpacing = parentFixture.Dimension.Width - PHI.PegOffsetLeft - PHI.PegOffsetRight;
      if (this.checkForNullZero(value)) {
        this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
        return false;
      } else if (itemData.Position.BackHooks <= 1) {
        this.notifyService.warn('CANNOT_CHANGE_BACKSPACING_IF_BACKHOOKS_ARE_LESS_THAN_1');
        return false;

        // else if (((itemData.Position.BackHooks - 1) * value) < ((itemData.Position.FrontBars - 1) * itemData.Position.FrontSpacing)) {
        //     this.notifyService.warn('BACK_HOOK_VALIDATE_WITH_FRONT_BAR');
        //     return false;
        // }
      } else if (this.checkIfPegHooksOverlap(itemData)) {
        return false;
      }
      else if (itemData.Position.BackSpacing < possibleBackSpacing) {
        return true;
      } else {
        this.notifyService.warn('BACK_SPACING_IS_NOT_UNDER_PERMISSIBLE_WIDTH_OF_PEGBOARD');
        return false;
      }
    }
    public changeBackSpacingVal(itemData: Position, value: number) {
      let parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
      const PHI = parentFixture.getPegHoleInfo();
      let newBackSpacing = Math.ceil(value / PHI.PegIncrementX) * PHI.PegIncrementX;
      let pegType = this.cloneCurrentPegTypeObject(itemData);
      pegType.BackSpacing = newBackSpacing;
      this.changePegType(itemData, pegType, null);
      return newBackSpacing;
    }
    public changeBackHooksVal(itemData: Position, value: number) {
      let parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
      const PHI = parentFixture.getPegHoleInfo();
      let pegType = this.cloneCurrentPegTypeObject(itemData);
      pegType.BackHooks = value;
      if (pegType.BackHooks == 1 && !Utils.isNullOrEmpty(pegType.BackSpacing)) {
        pegType.BackSpacing = null;
      }
      if (pegType.BackHooks > 1 && Utils.isNullOrEmpty(pegType.BackSpacing)) {
        pegType.BackSpacing = PHI.PegIncrementX;
      }
      this.changePegType(itemData, pegType, null);
      return value;
    }
    public changeFrontBarsVal(itemData: Position, value: number) {
      let parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
      const PHI = parentFixture.getPegHoleInfo();
      let pegType = this.cloneCurrentPegTypeObject(itemData);
      pegType.FrontBars = value;
      if (pegType.FrontBars == 1 && !Utils.isNullOrEmpty(pegType.FrontSpacing)) {
        pegType.FrontSpacing = null;
      }

      if (pegType.FrontBars == 2 && Utils.isNullOrEmpty(pegType.FrontSpacing)) {
        if(Utils.isNullOrEmpty(itemData.Position.ProductPegHole2X) || itemData.Position.ProductPegHole2X == 0 || itemData.Position.ProductPegHole2X == itemData.Position.ProductPegHole1X){
        pegType.FrontSpacing = itemData.computeWidth() * 0.8;}
        else{
          pegType.FrontSpacing = itemData.Position.ProductPegHole2X - itemData.Position.ProductPegHole1X;
        }
      }
      this.changePegType(itemData, pegType, null);
      return value;
    }
    public changeFrontSpacingVal(itemData: Position, value: number) {
      let parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
      const PHI = parentFixture.getPegHoleInfo();
      let pegType = this.cloneCurrentPegTypeObject(itemData);
      pegType.FrontSpacing = value;
      this.changePegType(itemData, pegType, null);
      return value;
    }
    public changePegLengthVal(itemData: Position, value: number) {
      let parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
      const PHI = parentFixture.getPegHoleInfo();
      let pegType = this.cloneCurrentPegTypeObject(itemData);
      pegType.PegLength = value;
      this.changePegType(itemData, pegType, null);
      return value;
    }
    public checkForNullZero(value): boolean {
        if (value == null || value == 0) {
            return true
        } else {
            return false;
        }
    }
    public validateBackYOffset(itemData: Position, value: number): boolean {//need to addMaxValue 10
      let parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
      let merchDepth = Math.max(0, parentFixture.ChildDimension.Depth);
      if (!Utils.isNullOrEmpty(parentFixture.Fixture.MaxMerchDepth) && parentFixture.Fixture.MaxMerchDepth > 0) {
        merchDepth = parentFixture.Fixture.MaxMerchDepth;
      }
      if (Utils.isNullOrEmpty(value)) {
        this.notifyService.warn('VALUE_CANNOT_BE_NULL');
        return false;
      } else if (value > 10) {
        this.notifyService.warn('BACK_YOFFSET_SHOULD_NOT_BE_GREATER_THAN_TEN');
        return false;
      } else if (this.checkIfPegHooksOverlap(itemData)) {
        return false;
      } else if (itemData.Position._X05_PEGLENGTH.ValData > (merchDepth - value)) {
        this.notifyService.warn('BACK_YOFFSET_IS_NOT_UNDER_PERMISSIBLE_DEPTH_OF_PEGBOARD');
        return false;
      }
      return true;
    }
    public validateFrontBars(itemData: Position, value: number): boolean {
      const frontBarLimit = (value - 1) * itemData.Position.FrontSpacing;
      const backHookLimit = (itemData.Position.BackHooks - 1) * itemData.Position.BackSpacing;
      if (this.checkForNullZero(value)) {
        this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
        return false;
        // } else if (value > itemData.Position.BackHooks) {
        //   this.notifyService.warn('FRONT_BAR_LESS_THAN_BACK_HOOK');
        //   return false;
        // } else if (backHookLimit < frontBarLimit) {
        //   this.notifyService.warn('FRONT_BAR_VALIDATE_WITH_BACK_HOOK');
        //   return false;
        // }
        // else if (frontBarLimit <= backHookLimit) {
        //   return true;
        // } else {
        //   this.notifyService.warn('FRONTBARS_IS_NOT_UNDER_PERMISSIBLE_VALUE_OF_PEGBOARD');
        //   return false;
      }
      return true;
    }
    public validateFrontSpacing(itemData: Position, value: number): boolean {
      const frontBarLimit = (itemData.Position.FrontBars - 1) * value;
      const backHookLimit = (itemData.Position.BackHooks - 1) * itemData.Position.BackSpacing;
      if (this.checkForNullZero(value)) {
        this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
        return false;
        // } else if (backHookLimit < frontBarLimit) {
        //     this.notifyService.warn('FRONT_BAR_VALIDATE_WITH_BACK_HOOK');
        //     return false;
        // }
        // else if (backHookLimit >= frontBarLimit) {
        //     return true;
      } else if (Utils.isNullOrEmpty(itemData.Position.FrontBars) || itemData.Position.FrontBars <= 1) {
        this.notifyService.warn('FRONT_BARS_SHOULD_BE_MORE_THAN_1');
        return false;
      } else if (value >= itemData.computeWidth()) {
        this.notifyService.warn('FRONT_SPACING_CANNOT_BE_GREATER_THAN_ITEMWIDTH');
        return false;
      } else if (!isNaN(frontBarLimit) && !isNaN(backHookLimit)) {
        return true;
      } else {
        this.notifyService.warn('FRONTSPACING_IS_NOT_UNDER_PERMISSIBLE_VALUE_OF_PEGBOARD');
        return false;
      }
    }

    public validateHeightSlope(itemData: Position, value: number): boolean {
      let parentFixture = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID);
      if (!parentFixture.Fixture.AutoComputeDepth && itemData.Dimension.Depth > itemData.Position._X05_PEGLENGTH.ValData * Math.cos(Utils.degToRad(value))) {
        this.notifyService.warn('FIT_CHECK_ERR');
        return false;
      } else
        if (value <= Number(45) && value >= Number(-45)) {
          return true;
        } else {
          this.notifyService.warn('HEIGHT_SLOPE_IS_NOT_UNDER_PERMISSIBLE_VALUE_OF_PEGBOARD');
          return false;
        }
    }

    public validateTagYOffset(itemData: Position, value: number): boolean {
        return true;
    }

    public validateTagXOffset(itemData: Position, value: number): boolean {
        return true;

    }

    public validateTagWidth(itemData: Position, value: number): boolean {
        if (this.checkForNullZero(value)) {
            this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
            return false;
        } else if (value < 0) {
            this.notifyService.warn('VALUE_CANNOT_BE_LESS_THAN_ZERO');
            return false;
        } else  {
            return true;
        }
    }

    public validatePegOverHang(itemData: Position, value: number): boolean {
        if (value > itemData.Position.ProductPackage.Depth) {
            this.notifyService.warn('PEG_OVER_HANG_CAN_NOT_BE_GREATER_THAN_PRODUCT_DEPTH');
            return false;
        }
        return true;
    }

    public validateTagHeight(itemData: Position, value: number): boolean {
        if (this.checkForNullZero(value)) {
            this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
            return false;
        } else if (value < 0) {
            this.notifyService.warn('VALUE_CANNOT_BE_LESS_THAN_ZERO');
            return false;
        } else  {
            return true;
        }
    }
    public validatePegLength(itemData: Position, value: number, backYOffset?: number): boolean {
      let parentFixture = (this.sharedService.getObject(itemData.$idParent, itemData.$sectionID) as PegBoard);
      let merchDepth = Math.max(0, parentFixture.ChildDimension.Depth);
      if(Utils.isNullOrEmpty(backYOffset)){
        backYOffset = itemData.Position.BackYOffset || 0;
      }
      if (!Utils.isNullOrEmpty(parentFixture.Fixture.MaxMerchDepth) && parentFixture.Fixture.MaxMerchDepth > 0) {
        merchDepth = parentFixture.Fixture.MaxMerchDepth;
      }
      if (Utils.checkIfPegType(parentFixture)) {
        if (Utils.isNullOrEmpty(value) || value == 0) {
          this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
          return false;
        } else if (value > (merchDepth - backYOffset)) {
          this.notifyService.warn('PEG_LENGTH_CANT_BE_GREATER_THAN_FIXTURE_DEPTH');
          return false;
        } else if (value < itemData.computeDepth() - (itemData.Position.PegOverhang || 0)) {
          this.notifyService.warn('PEG_LENGTH_CANT_BE_LESS_THAN_ITEM_DEPTH');
          return false;
        } else if (!parentFixture.Fixture.AutoComputeDepth && (value < itemData.Dimension.Depth - (itemData.Position.PegOverhang || 0))) {
          this.notifyService.warn('PEG_LENGTH_CANT_BE_LESS_THAN_ITEM_DEPTH');
          return false;
        }
      }
      return true;
    }
    public canweAdjustPegType(itemData: Position, pegType: PegHookInfo, PHI: PegHoleInfo){
      //try to adjust back hook spacing with peg increament
      //validate number of front bars with peg holes on the product
      let parentFixture = (this.sharedService.getObject(itemData.$idParent, itemData.$sectionID) as PegBoard);
      let valueToAdjustBS = pegType.BackSpacing % PHI.PegIncrementX;
      let valueToAdjustPL = null;
      if(([1,2].indexOf(pegType.IDPegLibrary) != -1)){
        valueToAdjustPL = itemData.Position._X05_PEGLENGTH.ValData;
      }
      if (PHI.PegIncrementX - valueToAdjustBS > valueToAdjustBS) {
        valueToAdjustBS = pegType.BackSpacing - valueToAdjustBS;
      } else {
        valueToAdjustBS = pegType.BackSpacing + PHI.PegIncrementX - valueToAdjustBS;
      }
      if (!Utils.isNullOrEmpty(pegType.BackSpacing) && pegType.BackSpacing < PHI.PegIncrementX) valueToAdjustBS = PHI.PegIncrementX;
      //BackHook spacing validation
      if ((itemData.Location.X + itemData.Position.ProductPegHole1X - itemData.pegOffsetX) + valueToAdjustBS > parentFixture.Dimension.Width - PHI.PegOffsetRight) {
        return { flag: false };
      }
      //itemData.Position.ProductPackage.Width < (selectedPegType.FrontSpacing + itemData.defaultOrinetation.XPegHole) ||
      if (pegType.FrontBars > 2 || (pegType.FrontBars == 2 && this.validateItemForSinglePegholeX(itemData) &&
        !(Utils.isNullOrEmpty(itemData.defaultOrinetation.XPegHole) && itemData.defaultOrinetation.XPegHole == 0) && itemData.Position.ProductPackage.Width < (pegType.FrontSpacing + itemData.defaultOrinetation.XPegHole))) {
        return { flag: false };
      }
      let valueToAdjustFS = undefined;
      if (pegType.FrontBars == 2) {
        //we need to check if we have default peghole2X if it is there we will adjust frontspacing
        //otherwise if frontspacing is lessthan the product width we will we will give FS as peghole2X
        if (itemData.defaultOrinetation.ProductPegHole2X) {
          valueToAdjustFS = itemData.Position.ProductPegHole1X - itemData.Position.ProductPegHole2X;
        } else if (itemData.Position.ProductPackage.Width > (pegType.FrontSpacing + itemData.defaultOrinetation.XPegHole)) {
          valueToAdjustFS = pegType.FrontSpacing;
        } else {
          valueToAdjustFS = itemData.Position.ProductPackage.Width - ((itemData.Position.ProductPackage.Width * 20) / 100);
        }
      }
      return { valueToAdjustBS: valueToAdjustBS, valueToAdjustFS: valueToAdjustFS, valueToAdjustPL: valueToAdjustPL, flag: true };
    }
    public validateAndSetBeforeDropRPaste(itemData: Position, targetPHI: PegHoleInfo) {
      let currentPegType = this.cloneCurrentPegTypeObject(itemData);
      if (Utils.isNullOrEmpty(itemData.Position.BackHooks)) {
        let defaultPeg = this.pegLibraryService.PegLibrary.filter((x) => {
          if (x.IDPegLibrary == 1 && x.IsActive) {
            return x;
          }
        })[0];
        //setting adjustable pegtype
        this.changePegType(itemData, defaultPeg, null, true);
        //returning current peg type in case of revertion
        return currentPegType;
      }
      else {
        let adjustable = this.checkIfAdjust(itemData, currentPegType, targetPHI)
        if (!adjustable || !adjustable?.flag) {
          return false;
        } else {
          //setting adjustable pegtype
          this.changePegType(itemData, currentPegType, adjustable, true);
        }
        //returning current peg type in case of revertion
        return currentPegType;
      }
    }
    public cloneCurrentPegTypeObject(itemData) {
      return {
        PegType: itemData.Position._PegLibraryPegType.DescData,
        HeightSlope: itemData.Position.HeightSlope,
        BackHooks: itemData.Position.BackHooks,
        BackSpacing: itemData.Position.BackSpacing,
        BackYOffset: itemData.Position.BackYOffset,
        FrontBars: itemData.Position.FrontBars,
        FrontSpacing: itemData.Position.FrontSpacing,
        IsPegTag: itemData.Position.IsPegTag,
        TagHeight: itemData.Position.TagHeight,
        TagWidth: itemData.Position.TagWidth,
        TagYOffset: itemData.Position.TagYOffset,
        TagXOffset: itemData.Position.TagXOffset,
        MaxPegWeight: itemData.Position.MaxPegWeight,
        PegLength: itemData.Position._X05_PEGLENGTH.ValData,
        ProductPegHole1X: itemData.Position.ProductPegHole1X,
        ProductPegHole2X: itemData.Position.ProductPegHole2X,
        ProductPegHoleY: itemData.Position.ProductPegHoleY,
        IDPegLibrary: itemData.Position.IDPegLibrary,
        PegWeight: itemData.Position.PegWeight,
        PegPartID: itemData.Position.PegPartID
      }
    }
    public changePegType(itemData: Position, selectedPegType, adjustedValues, adjustRecordsforDrag?, skipRecording?): void{
      const currentPegType  = this.cloneCurrentPegTypeObject(itemData);
      const original = ((itemData, selectedPegType, adjustedValues) => {
        return () => {
          this.changePegType(itemData, selectedPegType, adjustedValues);
        };
      })(itemData, selectedPegType, adjustRecordsforDrag? adjustedValues: { valueToAdjustBS: itemData.Position.BackSpacing, valueToAdjustFS: itemData.Position.FrontSpacing, valueToAdjustPL: itemData.Position._X05_PEGLENGTH.ValData });
      const revert = ((itemData, selectedPegType, adjustedValues) => {
        return () => {
          this.changePegType(itemData, selectedPegType, adjustedValues);
        };
      })(itemData, currentPegType, adjustRecordsforDrag? { valueToAdjustBS: itemData.Position.BackSpacing, valueToAdjustFS: itemData.Position.FrontSpacing }:adjustedValues);
      !skipRecording && this.historyService.captureActionExec({
          funoriginal: original,
          funRevert: revert,
          funName: 'ChangePegType',
        });

      itemData.Position.HeightSlope = selectedPegType.HeightSlope;
      itemData.Position.BackHooks = selectedPegType.BackHooks;
      itemData.Position.BackSpacing = adjustedValues?.valueToAdjustBS ? adjustedValues.valueToAdjustBS: selectedPegType.BackSpacing;
      itemData.Position.BackYOffset = selectedPegType.BackYOffset;
      itemData.Position.FrontBars = selectedPegType.FrontBars;
      itemData.Position.FrontSpacing = adjustedValues?.valueToAdjustFS ? adjustedValues.valueToAdjustFS : selectedPegType.FrontSpacing;
      itemData.Position.IsPegTag = selectedPegType.IsPegTag;
      itemData.Position.TagHeight = selectedPegType.TagHeight;
      itemData.Position.TagWidth = selectedPegType.TagWidth;
      itemData.Position.TagYOffset = selectedPegType.TagYOffset;
      itemData.Position.TagXOffset = selectedPegType.TagXOffset;
      itemData.Position.MaxPegWeight = selectedPegType.MaxPegWeight;
      itemData.Position._X05_PEGLENGTH.ValData = adjustedValues?.valueToAdjustPL ? adjustedValues.valueToAdjustPL : selectedPegType.PegLength;
      itemData.Position.IDPegLibrary = selectedPegType.IDPegLibrary;
      itemData.Position.PegWeight = selectedPegType.PegWeight;
      itemData.Position.PegPartID = selectedPegType.PegPartID;
      itemData.Position._PegLibraryPegType.DescData = selectedPegType.PegType;
      if(Utils.isNullOrEmpty(itemData.defaultOrinetation.XPegHole) || itemData.defaultOrinetation.XPegHole == 0){
        itemData.Position.ProductPegHole1X = (itemData.Position.ProductPackage.Width - (itemData.Position.FrontSpacing *(itemData.Position.FrontBars-1)))/2;
      }

      if (itemData.Position.FrontSpacing) {
        if ((itemData.Position.ProductPegHole2X - itemData.Position.ProductPegHole1X) != itemData.Position.FrontSpacing) {
          itemData.Position.ProductPegHole1X = itemData.Position.ProductPackage.XPegHole = (parseFloat(itemData.computeWidth().toString()) - itemData.Position.FrontSpacing) / 2;
          itemData.Position.ProductPegHole2X = itemData.Position.ProductPackage.ProductPegHole2X = itemData.Position.ProductPegHole1X + itemData.Position.FrontSpacing;
        } else {
          itemData.Position.ProductPegHole1X = itemData.Position.ProductPackage.XPegHole = selectedPegType.ProductPegHole1X;
          itemData.Position.ProductPegHole2X = itemData.Position.ProductPackage.ProductPegHole2X = selectedPegType.ProductPegHole2X;
        }
      } else {
        if (itemData.defaultOrinetation.value == itemData.Position.IDOrientation && itemData.defaultOrinetation.XPegHole != 0) {
          itemData.Position.ProductPegHole1X = itemData.Position.ProductPackage.XPegHole = itemData.defaultOrinetation.XPegHole;
        } else {
          itemData.Position.ProductPegHole1X = itemData.Position.ProductPackage.XPegHole = itemData.computeWidth() / 2;
        }
        itemData.Position.ProductPegHole2X = itemData.Position.ProductPackage.ProductPegHole2X = itemData.Position.ProductPegHole1X;
      }
      if(adjustRecordsforDrag){
        itemData.Position.PegType = selectedPegType.IDPegLibrary;
        itemData.Position.IDPegLibrary = selectedPegType.IDPegLibrary;
      }
      //Resetting Location.X and Location.Y of the position
      // let parentFixture = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID) as PegBoard;
      //parentFixture.setXYBasedOnPegLoc(itemData);
    }
    public validatePegTypeChange(itemData: Position, newValue: number, selectedPegType: PegLibrary) {//onchange of pegType
      if(!selectedPegType){
        selectedPegType = this.pegLibraryService.PegLibrary.filter((x) =>{
          if(x.IDPegLibrary == newValue && x.IsActive){
           return x;
          }})[0];
      }
      const PHI = (this.sharedService.getObject(itemData.$idParent, itemData.$sectionID) as PegBoard).getPegHoleInfo();
      return this.checkIfAdjust(itemData, selectedPegType, PHI);
    }

    public validatePegIncrementXChange(itemData: Position, newPegIncrementXValue: number): { valueToAdjustBS?: number, valueToAdjustFS?: number, flag: boolean } {
        const PHI = (this.sharedService.getObject(itemData.$idParent, itemData.$sectionID) as PegBoard).getPegHoleInfo();
        PHI.PegIncrementX = newPegIncrementXValue;
        let pegType = this.cloneCurrentPegTypeObject(itemData);
        return this.checkIfAdjust(itemData, pegType, PHI);
    }

    public checkIfAdjust(itemData: Position, pegType: PegHookInfo, PHI: PegHoleInfo) {
      let flag = true;
      flag = ([1,2].indexOf(pegType.IDPegLibrary) != -1) || this.validatePegLength(itemData, pegType.PegLength, pegType.BackYOffset);
      if (!flag) {
        return { flag: false, cause: 'PegLength' };
      }
      if (pegType.BackSpacing % PHI.PegIncrementX != 0 || (pegType.FrontSpacing * (pegType.FrontBars - 1)) > itemData.Position.ProductPackage.Width) {
        let canApplyPT = this.canweAdjustPegType(itemData, pegType, PHI);
        if (!canApplyPT.flag) {
          return { flag: false };
        } else return canApplyPT;
      }
      return { flag: true };
    }

    public validateItemForSinglePegholeX(itemData: Position): boolean {//onchange of pegType
      //It will change after the discussion with Rohit
      //if (itemData.Position?.PegHole2X == null || itemData.Position?.PegHole2X == undefined) {
      if (!(Utils.isNullOrEmpty(itemData.defaultOrinetation.XPegHole) || itemData.defaultOrinetation.XPegHole == 0)) {
          // It should have 2nd peghole info or Front spacing should be less than the width to adjust
          if(!(Utils.isNullOrEmpty(itemData.defaultOrinetation.ProductPegHole2X) || itemData.defaultOrinetation.ProductPegHole2X == 0)){
            return false;
          }
          //It has single peghole from package data
          return true;
        } else {
            return false;
        }
    }

    public changeBackSpacing(itemData: Position, backSpacing:number): void {
        const currentBackSpacing = itemData.Position.BackSpacing;
        const original = ((itemData, backSpacing) => {
            return () => {
                this.changeBackSpacing(itemData, backSpacing);
            };
        })(itemData, backSpacing);
        const revert = ((itemData, backSpacing) => {
            return () => {
                this.changeBackSpacing(itemData, backSpacing);
            };
        })(itemData, currentBackSpacing);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'ChangeBackSpacing',
        });
        itemData.Position.BackSpacing = backSpacing;
    }

    public checkIfPegHooksOverlap(itemData: Position): boolean {
        const currentPosPegLoc = itemData.getBackHookLoc();
        const allPos = itemData.parent.getAllPosition().filter(p => p.$id !== itemData.$id);
        let isOverlap = false;

        if (currentPosPegLoc.x1 < 0 || currentPosPegLoc.x2 > itemData.parent.Dimension.Width) {
            this.notifyService.warn('ITEM_CROSSING_SHELF_BOUNDARY');
            return true;
        }

        for (const pos of allPos) {
            const posPegLoc = pos.getBackHookLoc();
            let x1 = posPegLoc.x1;
            let x2 = posPegLoc.x2;
            if (posPegLoc.y !== currentPosPegLoc.y) {
                if (pos.Location.Z > itemData.Position.BackYOffset) {
                    continue;
                } else {
                    x1 = pos.Location.X;
                    x2 = pos.Location.X + pos.linearWidth();
                }
            }
            if (((x1 >= currentPosPegLoc.x1 && x1 <= currentPosPegLoc.x2) ||
                (x2 >= currentPosPegLoc.x1 && x2 <= currentPosPegLoc.x2)) && posPegLoc.y === currentPosPegLoc.y) {
                isOverlap = true
                break;
            }
        }

        if (isOverlap) {
            this.notifyService.warn("BACK_HOOK_OVERLAP_POSITION");
            return true;
        }
        return false;
    }
}
