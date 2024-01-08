import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { Section } from 'src/app/shared/classes';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { UprightType } from 'src/app/shared/models';
import { HistoryService, NotifyService, PlanogramService, QuadtreeUtilsService, SharedService } from '../../common';
import { PropertyGridPegValidationService } from 'src/app/shared/services';
import { PropertyPaneType } from 'src/app/shared/models';

/** Applicable only to standardshelf, coffincase and basket
 * when an item is placed it aligns them according to crunch mode
*/
@Injectable({
    providedIn: 'root'
})
export class DataValidationService {


    constructor(
        private readonly translate: TranslateService,
        private readonly sharedService: SharedService,
        private readonly notify: NotifyService,
        private readonly propertyGridPegValidationService: PropertyGridPegValidationService,
        private readonly historyService: HistoryService,
        private readonly quadtreeUtil: QuadtreeUtilsService,
    ) {

    }

    // property-grid.comp fixture-worksheet position item-worksheet.svc
    // aka validateCellChange
    public validate(
        pogObject: Section,
        itemData: any,
        field: string,
        value: any,
        oldValue: any,
    ): boolean {

        if (field == 'Position.MinFacingsX' || field == 'Position.MaxFacingsX' || field == 'Position.FacingsX') {
            var minFacingXValue = itemData.Position.MinFacingsX;
            var maxFacingXValue = itemData.Position.MaxFacingsX;

            if (field == 'Position.MinFacingsX') {
                if (Utils.isNullOrEmpty(value)) {
                    this.notify.warn('MIN_FACINGS_BLANK');
                    itemData.Position.MinFacingsX = oldValue;
                    return false;
                }
                if (value <= 0) {
                    this.notify.warn('MIN_FACINGS_ZERO');
                    itemData.Position.MinFacingsX = oldValue;
                    return false;
                }
                if (maxFacingXValue < value) {
                    this.notify.warn('MIN_FACINGS_MORETHAN_MAX_FACINGS');
                    itemData.Position.MinFacingsX = oldValue;
                    return false;
                }
                if (maxFacingXValue >= value) {
                    return true;
                }
                // This is to see if above and behind items crossing the edges
                if (
                    pogObject.fitCheck &&
                    (value > itemData.Position.FacingsX ? value : false) &&
                    !itemData.isValidFitChange(value, 'Position.FacingsX')
                ) {
                    this.notify.warn('ITEM_CROSSING_HEIGHT');
                    itemData.Position.MinFacingsX = oldValue;
                    return false;
                }
            }
            if (field == 'Position.MaxFacingsX') {
                if (Utils.isNullOrEmpty(value)) {
                    this.notify.warn('MIN_FACINGS_BLANK');
                    itemData.Position.MaxFacingsX = oldValue;
                    return false;
                }
                if (value <= 0) {
                    this.notify.warn('MAX_FACINGS_ZERO');
                    itemData.Position.MaxFacingsX = oldValue;
                    return false;
                }
                if (minFacingXValue > value) {
                    this.notify.warn('MAX_FACINGS_LESSTHAN_MIN_FACINGS');
                    itemData.Position.MaxFacingsX = oldValue;
                    return false;
                }
                if (minFacingXValue <= value) {
                    return true;
                }
                if (
                    pogObject.fitCheck &&
                    (value < itemData.Position.FacingsX ? value : false) &&
                    !itemData.isValidFitChange(value, 'Position.FacingsX')
                ) {
                    this.notify.warn('ITEM_CROSSING_HEIGHT');
                    itemData.Position.MaxFacingsX = oldValue;
                    return false;
                }
            }
            if (field == 'Position.FacingsX') {
                if (Utils.isNullOrEmpty(value) || value <= 0) {
                    this.notify.warn('FACINGS_ZERO');
                    itemData.Position.FacingsX = oldValue;
                    return false;
                }
                if (minFacingXValue > value) {
                    this.notify.warn('LESS_MIN_FACINGS');
                    itemData.Position.FacingsX = oldValue;
                    return false;
                }
                if (maxFacingXValue < value) {
                    this.notify.warn('MORE_MIN_FACINGS');
                    itemData.Position.FacingsX = oldValue;
                    return false;
                }
                // @Narendra to check fitcheck errors
                // Commented this validation is taken care by quad tree intersection check
                if (pogObject.fitCheck && !itemData.isValidFitChange(value, field)) {
                    this.notify.warn('ITEM_CROSSING_EDGE');
                    itemData.Position.FacingsX = oldValue;
                    return false;
                }
            }
        }

        if (
            field == 'Position.MaxFacingsY' ||
            field == 'Position.MaxLayoversY' ||
            field == 'Position.ProductPackage.MaxLayoversZ' ||
            field == 'Position.FacingsY' ||
            field == 'Position.LayoversY' ||
            field == 'Position.LayoversZ' ||
            field == 'Position.FacingsZ'
        ) {
            var maxFacingYValue = itemData.Position.MaxFacingsY;
            var maxLayoversYValue = itemData.Position.MaxLayoversY;
            var maxLayoversZValue = itemData.Position.MaxLayoversZ;
            var maxFacingZValue = itemData.Position.MaxFacingsZ;

            if (field == 'Position.MaxFacingsY') {
                if (Utils.isNullOrEmpty(value)) {
                    this.notify.warn('MAX_FRONTSHIGH_BLANK');
                    itemData.Position.MaxFacingsY = oldValue;
                    return false;
                }
                if (value < 1) {
                    this.notify.warn('MAX_FRONTSHIGH_ZERO');
                    itemData.Position.MaxFacingsY = oldValue;
                    return false;
                }
                if (
                    pogObject.fitCheck &&
                    (value < itemData.Position.FacingsY ? value : false) &&
                    !itemData.isValidFitChange(value, 'Position.FacingsY')
                ) {
                    this.notify.warn('ITEM_CROSSING_HEIGHT');
                    itemData.Position.MaxFacingsY = oldValue;
                    return false;
                }
            }

            if (field == 'Position.MaxLayoversY') {
                if (Utils.isNullOrEmpty(value)) {
                    this.notify.warn('MAX_LAYOVERSHIGH_BLANK');
                    itemData.Position.MaxLayoversY = oldValue;
                    return false;
                }
                if (value < 0) {
                    this.notify.warn('MAX_LAYOVERSHIGH_ZERO');
                    itemData.Position.MaxLayoversY = oldValue;
                    return false;
                }
                if (
                    pogObject.fitCheck &&
                    (value < itemData.Position.LayoversY ? value : false) &&
                    !itemData.isValidFitChange(value, 'Position.LayoversY')
                ) {
                    this.notify.warn('ITEM_CROSSING_HEIGHT');
                    itemData.Position.MaxLayoversY = oldValue;
                    return false;
                }
            }

            if (field == 'Position.ProductPackage.MaxLayoversZ') {
                if (Utils.isNullOrEmpty(value)) {
                    this.notify.warn('MAX_LAYOVERSDEEP_BLANK');
                    itemData.Position.ProductPackage.MaxLayoversZ = oldValue;
                    return false;
                }
                if (value < 0) {
                    this.notify.warn('MAX_LAYOVERSDEEP_ZERO');
                    itemData.Position.ProductPackage.MaxLayoversZ = oldValue;
                    return false;
                }
                if (
                    pogObject.fitCheck &&
                    (value < itemData.Position.LayoversZ ? value : false) &&
                    !itemData.isValidFitChange(value, 'Position.LayoversZ')
                ) {
                    this.notify.warn('ITEM_CROSSING_EDGE');
                    itemData.Position.ProductPackage.MaxLayoversZ = oldValue;
                    return false;
                }
            }

            if (field == 'Position.FacingsY') {
                if (Utils.isNullOrEmpty(value)) {
                    this.notify.warn('FRONTSHIGH_BLANK');
                    itemData.Position.FacingsY = oldValue;
                    return false;
                }
                if (value <= 0) {
                    this.notify.warn('FRONTSHIGH_ZERO');
                    itemData.Position.FacingsY = oldValue;
                    return false;
                }
                if (maxFacingYValue < value) {
                    this.notify.warn('FRONTSHIGH_MORETHAN_MAX_FRONTS_HIGH');
                    itemData.Position.FacingsY = oldValue;
                    return false;
                }
                // @Millan to check fitcheck errors
                if (pogObject.fitCheck && !itemData.isValidFitChange(value, field)) {
                    this.notify.warn('ITEM_CROSSING_HEIGHT');
                    itemData.Position.FacingsY = oldValue;
                    return false;
                }
            }
            if (field == 'Position.LayoversY') {
                if (Utils.isNullOrEmpty(value) || value < 0) {
                    this.notify.warn('LAYOVERS_ZERO');
                    itemData.Position.LayoversY = oldValue;
                    return false;
                }
                if (maxLayoversYValue < value) {
                    this.notify.warn('LAYOVERS_MAX_LAYOVERS');
                    itemData.Position.LayoversY = oldValue;
                    return false;
                }
                if (pogObject.fitCheck && !itemData.isValidFitChange(value, 'Position.LayoversY')) {
                    this.notify.warn('ITEM_CROSSING_HEIGHT');
                    itemData.Position.LayoversY = oldValue;
                    return false;
                }
            }

            if (field == 'Position.LayoversZ') {
                if (Utils.isNullOrEmpty(value)) {
                    this.notify.warn('LAYOVERS_DEEP_BLANK');
                    itemData.Position.LayoversZ = oldValue;
                    return false;
                }
                if (value < 0) {
                    this.notify.warn('LAYOVERS_DEEP_ZERO');
                    itemData.Position.LayoversZ = oldValue;
                    return false;
                }
                if (maxLayoversZValue < value) {
                    this.notify.warn('LAYOVERSDEEP_MORETHAN_MAX_LAYOVERS_DEEP');
                    itemData.Position.LayoversZ = oldValue;
                    return false;
                }
                if (pogObject.fitCheck && !itemData.isValidFitChange(value, 'Position.LayoversZ')) {
                    this.notify.warn('ITEM_CROSSING_EDGE');
                    itemData.Position.LayoversZ = oldValue;
                    return false;
                }
            }

            if (field == 'Position.FacingsZ') {
                if (Utils.isNullOrEmpty(value)) {
                    this.notify.warn('FRONTS_DEEP_BLANK');
                    itemData.Position.FacingsZ = oldValue;
                    return false;
                }
                if (value < 0) {
                    this.notify.warn('FRONTS_DEEP_ZERO');
                    itemData.Position.FacingsZ = oldValue;
                    return false;
                }
                if (maxFacingZValue < value) {
                    this.notify.warn('FRONTS_DEEP_MORETHAN_MAX_FRONTS_DEEP');
                    itemData.Position.FacingsZ = oldValue;
                    return false;
                }
                // @Narendra commented to be removed, intersection validation will happenn with quadtree logic
                if (pogObject.fitCheck && !itemData.isValidFitChange(value, field)) {
                    this.notify.warn('INTERSECTING_WITH_OTHER_ITEMS');
                    itemData.Position.FacingsZ = oldValue;
                    return false;
                }
            }
        }
        if (field == 'Fixture.MaxMerchHeight' || field == 'Fixture.MaxMerchWidth' || field == 'Fixture.MaxMerchDepth') {
            var maxHeight: number = (itemData.Dimension.Height - (itemData.Fixture.Thickness || 0));//need to substract the thickness for getting max height of fixture 
            var maxWidth: number = itemData.Dimension.Width;
            var maxDepth: number = itemData.Dimension.Depth + itemData.Fixture.OverhangZBack + ( itemData.Fixture.OverhangZFront || 0);

            if (
                field == 'Fixture.MaxMerchHeight' && value !=0 && !itemData.Fixture.IgnoreMerchHeight &&
                ((pogObject.fitCheck && maxHeight < value) || itemData.minMerchHeight > value)
            ) {
                const msg = (pogObject.fitCheck && maxHeight < value) ? this.translate.instant('MAX_MERCH_HEIGHT_FIXTURE') + ' ' + maxHeight.toFixed(2) : 'MAX_MERCH_HEIGHT_CANT_BE_LESS_THAN_MIN_MERCH_HEIGHT';
                this.notify.warn(msg);
                itemData.Fixture.MaxMerchHeight = oldValue;
                return false;
            }
            if (field == 'Fixture.MaxMerchWidth' && value != 0 && maxWidth < value) {
                this.notify.warn(this.translate.instant('MAX_MERCH_WIDTH') + ' ' + maxWidth.toFixed(2));
                itemData.Fixture.MaxMerchWidth = oldValue;
                return false;
            }

            // 8th Oct, 2015 added
            // Since Max Merch Depth can be more than Dimension.Width/Fixture Width zFront and zBack overhang needs for all fixture type.
            if (
                field == 'Fixture.MaxMerchDepth' &&
                value != 0 &&
                maxDepth < value
            ) {
                this.notify.warn(this.translate.instant('MAX_MERCH_DEPTH') + ' ' + maxDepth.toFixed(2));
                itemData.Fixture.MaxMerchDepth = oldValue;
                return false;
            }
        }

        if (field == 'Location.X' || field == 'Location.Y' || field == 'Location.Z') {
            var pogWidth = pogObject.Dimension.Width;
            var pogHeight = pogObject.Dimension.Height;
            var pogDepth = pogObject.Dimension.Depth;

            if (field == 'Location.X') {
                if (itemData.ObjectDerivedType == AppConstantSpace.MODULAR) {
                    if (value < 0 || pogWidth < value) {
                        this.notify.warn('BAY_NEGTIVE');
                        itemData.Location.X = oldValue;
                        return false;
                    }
                }
                if (value < 0) {
                    this.notify.warn('FIXTURE_XPOS_NEGTIVE');
                    itemData.Location.X = oldValue;
                    return false;
                }

                if (pogWidth < itemData.Dimension.Width + itemData.getXPosToPog()) {
                    this.notify.warn('FIXTURE_XPOS_OUTSIDE');
                    itemData.Location.X = oldValue;
                    return false;
                }
            }

            if (field == 'Location.Y') {
                if (itemData.ObjectDerivedType == AppConstantSpace.MODULAR) {
                    if (value < 0 || pogHeight < value) {
                        this.notify.warn('BAY_NEGTIVE');
                        itemData.Location.Y = oldValue;
                        return false;
                    }
                }
                if (value < 0) {
                    this.notify.warn('FIXTURE_YPOS_NEGTIVE');
                    itemData.Location.Y = oldValue;
                    return false;
                }
                // in apollo it's allowing going outof the section so we have to decide wether to allow going out of the seciton if the fitcheck is off.
                var isValidMove = itemData.isBasicValidMove({
                    height: true,
                    width: false,
                    newHeight: itemData.getYPosToPog(true) + itemData.minHeightRequired(),
                    newWidth: '',
                    forSection: true,
                    forBoth: false,
                    forSelf: false,
                });
                if (!isValidMove.flag) {
                    this.notify.warn(isValidMove.errMsg);
                    itemData.Location.Y = oldValue;
                    return false;
                }
            }

            if (field == 'Location.Z') {
                if (itemData.ObjectDerivedType == AppConstantSpace.MODULAR) {
                    if (value < 0 || pogDepth < value) {
                        this.notify.warn('BAY_NEGTIVE');
                        itemData.Location.Z = oldValue;
                        return false;
                    }
                }
            }
        }

        if (field == 'Fixture.DividerHeight' || field == 'Fixture.DividerWidth' || field == 'Fixture.DividerDepth') {
            var fixWidth = itemData.Dimension.Width;
            var fixHeight = itemData.Dimension.Height;
            var fixDepth = itemData.Dimension.Depth;

            if (field == 'Fixture.DividerHeight') {
                if (Utils.isNullOrEmpty(value) || value < 0 || fixHeight < value) {
                    this.notify.warn('DividerHeight Can not be black');
                    itemData.Fixture.DividerHeight = oldValue;
                    return false;
                }
            }

            if (field == 'Fixture.DividerWidth') {
                if (Utils.isNullOrEmpty(value) || value < 0 || fixWidth < value) {
                    this.notify.warn('DividerWidth Can not be black');
                    itemData.Fixture.DividerWidth = oldValue;
                    return false;
                }
            }

            if (field == 'Fixture.DividerDepth') {
                if (Utils.isNullOrEmpty(value) || value < 0 || fixDepth < value) {
                    this.notify.warn('DividerDepth Can not be black');
                    itemData.Fixture.DividerDepth = oldValue;
                    return false;
                }
            }
        }

        if (field == 'Rotation.X') {
            if (Utils.isNullOrEmpty(value) && value != 0) {
                this.notify.warn('Rotation X Can not be black');
                itemData.Rotation.X = oldValue;
                return false;
            }
            if (value > 0 && 360 < value) {
                this.notify.warn('Rotation X Can not be less than 360');
                itemData.Rotation.X = oldValue;
                return false;
            }
            if (value < 0 && -360 > value) {
                this.notify.warn('Rotation X Can not be more than 360');
                itemData.Rotation.X = oldValue;
                return false;
            }
        }

        if (field == 'Fixture.Thickness') {
            if (itemData.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
                if (Utils.isNullOrEmpty(value) && value != 0) {
                    this.notify.warn('Thickness Can not be zero');
                    itemData.Thickness = oldValue;
                    return false;
                } else if (value + itemData.minMerchHeight >= itemData.Dimension.Height) {
                    this.notify.warn('Thickness Can not be more than fixture height');
                    itemData.Fixture.Thickness = oldValue;
                    return false;
                }
            }
        }

        //add validation to datatype for divider
        if (itemData.ObjectDerivedType == AppConstantSpace.DIVIDERS) {
          if (value <= 0 && (field == 'Fixture.Depth' || field == 'Fixture.Width' || field == 'Fixture.Height')) {
            this.notify.warn('DIVIDERS_DIMENSIONS_SHOULD_BE_GREATER_THAN_ZERO');
            itemData.Fixture[field.split('.')[1]] = oldValue;
            return false;
          }
          //get the parent fixture
          let parentFixture = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID);
          //Need to validate if the divider is not crossing the fixture
          if (field == 'Fixture.Width' && value > parentFixture.ChildDimension.Width) {
            this.notify.warn('DIVIDER_WIDTH_SHOULD_BE_LESS_THAN_FIXTURE_WIDTH');
            itemData.Fixture.Width = oldValue;
            return false;
          }
          if (field == 'Fixture.Height' && value > parentFixture.ChildDimension.Height) {
            this.notify.warn('DIVIDER_HEIGHT_SHOULD_BE_LESS_THAN_FIXTURE_HEIGHT');
            itemData.Fixture.Height = oldValue;
            return false;
          }
          if (field == 'Fixture.Depth' && value > parentFixture.ChildDimension.Depth) {
            this.notify.warn('DIVIDER_DEPTH_SHOULD_BE_LESS_THAN_FIXTURE_DEPTH');
            itemData.Fixture.Depth = oldValue;
            return false;
          }
          if(field == 'Fixture._DividerSlotStart.ValData' && value > parentFixture.ChildDimension.Width){
            this.notify.warn('DIVIDER_SLOT_START_SHOULD_BE_LESS_THAN_FIXTURE_WIDTH');
            itemData.Fixture._DividerSlotStart.ValData = oldValue;
            return false;
          }
          if(field == 'Fixture._DividerSlotSpacing.ValData' && value > parentFixture.ChildDimension.Width){
            this.notify.warn('DIVIDER_SLOT_SPACING_SHOULD_BE_LESS_THAN_FIXTURE_WIDTH');
            itemData.Fixture._DividerSlotSpacing.ValData = oldValue;
            return false;
          }
          return true;
        }
        //Add validations for grill height
        if (itemData.ObjectDerivedType == AppConstantSpace.GRILLOBJ) {
          //get the parent fixture
          let parentFixture = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID);
          if(field == 'Fixture.Height'){
            if (Utils.isNullOrEmpty(value) || value <= 0) {
              this.notify.warn('GRILL_HEIGHT_CAN_NOT_BE_ZERO');
              itemData.Fixture.Height = oldValue;
              return false;
            }
            //Need to validate if the grill is not crossing the fixture
            if (value > parentFixture.ChildDimension.Height) {
              this.notify.warn('MAX_GRILL_HEIGHT');
              itemData.Fixture.Height = oldValue;
              return false;
            }
          }

          //validate grill thickness with parent fixture depth
          if (field == 'Fixture.Thickness' &&  parentFixture.ChildDimension.Depth < value) {
            this.notify.warn('GRILL_THICKNESS_SHOULD_NOT_EXCEED_MIN_MERCH_DEPTH');
            itemData.Fixture.Thickness = oldValue;
            return false;
          }

          //Validate grill spacing with parent fixture width
          if (field == 'Fixture._GrillSpacing.ValData' &&  parentFixture.ChildDimension.Width < value) {
            this.notify.warn('GRILL_SPACING_SHOULD_NOT_EXCEED_FIXTURE_WIDTH');
            itemData.Fixture._GrillSpacing.ValData = oldValue;
            return false;
          }
          return true;
        }

        if (field == 'Fixture.Width') {
            itemData.Dimension.Width = itemData.Fixture.Width;
            if (
                itemData.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ ||
                Utils.checkIfPegType(itemData) ||
                itemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                itemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ ||
                itemData.ObjectDerivedType == AppConstantSpace.BLOCK_FIXTURE
            ) {
                if (Utils.isNullOrEmpty(value) || value == 0) {
                    this.notify.warn(itemData.ObjectDerivedType + ' ' + ' width Can not be zero');
                    itemData.Fixture.Width = oldValue;
                    itemData.Dimension.Width = oldValue;
                    return false;
                } else if (value + itemData.getXPosToPog() > pogObject.Dimension.Width) {
                    if(PropertyPaneType.Multiple){
                        this.notify.warn(
                            itemData.ObjectType + ' ' + this.translate.instant('WIDTH_CANT_BE_MORE_THAN_SECTION_WIDTH'),
                        );
                    }
                    else{
                        this.notify.warn(
                            itemData.ObjectDerivedType + ' ' + this.translate.instant('WIDTH_CANT_BE_MORE_THAN_SECTION_WIDTH'),
                        );
                    }
                    itemData.Fixture.Width = oldValue;
                    itemData.Dimension.Width = oldValue;
                    return false;
                } else if (itemData.Fixture.SnapToRight && itemData.Fixture.SnapToLeft) {
                    /*validating when snap to right and snap to left is active*/
                    this.notify.warn(
                        itemData.ObjectDerivedType +
                        ' ' +
                        this.translate.instant('WIDTH_CANT_BE_CHANGED_WHEN_SNAP_RIGHT_AND_LEFT'),
                    );
                    itemData.Fixture.Width = oldValue;
                    itemData.Dimension.Width = oldValue;
                    return false;
                } else if (itemData.Fixture.SnapToRight) {
                    if (itemData.getXPosToPog() + (oldValue - value) < 0) {
                        this.notify.warn(
                            itemData.ObjectDerivedType +
                            ' ' +
                            this.translate.instant('WIDTH_CANT_BE_MORE_THAN_SECTION_WIDTH'),
                        );
                        itemData.Fixture.Width = oldValue;
                        itemData.Dimension.Width = oldValue;
                        return false;
                    }
                }
                try {
                    if (
                        itemData.Children.length > 0 &&
                        ((Utils.checkIfstandardShelf(itemData) &&
                            !itemData.checkIfValidChange(
                                _.filter(itemData.Children, { ObjectDerivedType: AppConstantSpace.POSITIONOBJECT })[0],
                                Utils.isNullOrEmpty(itemData.Fixture.MaxMerchWidth) ||
                                    itemData.Fixture.MaxMerchWidth == 0
                                    ? itemData.Fixture.Width
                                    : Math.min(itemData.Fixture.Width, itemData.Fixture.MaxMerchWidth),
                                itemData.ChildDimension.Height,
                                itemData.getChildDimensionDepth(),
                                // field, TODO @og not used?
                            )) ||
                            (!Utils.checkIfstandardShelf(itemData) &&
                                !itemData.checkIfValidChange(
                                    _.maxBy(
                                        _.filter(itemData.Children, {
                                            ObjectDerivedType: AppConstantSpace.POSITIONOBJECT,
                                        }),
                                        function (child) {
                                            return child.Location.X + child.getPegInfo().OffsetX;
                                        },
                                    ),
                                    undefined,
                                    undefined,
                                    undefined,
                                    field,
                                )))
                    ) {
                        this.notify.warn('Width insufficient to support already placed products in the fixture.');
                        itemData.Fixture.Width = oldValue;
                        itemData.Dimension.Width = oldValue;
                        return false;
                    }
                } catch (e) { }
            } else if (itemData.ObjectDerivedType == AppConstantSpace.MODULAR) {
                // give validation for modular change, if it is not alligning with the uprights on width change don't allow.
                if (pogObject.uprightType === UprightType.Variable) {
                    // any value it can change , min width validation done in change event already
                } else if (pogObject.uprightType === UprightType.Fixed) {
                    var upright = pogObject.Upright as any;
                    if (value % upright != 0) {
                        this.notify.warn('Bay width is not alligning with the upright interval');
                        itemData.Fixture.Width = oldValue;
                        itemData.Dimension.Width = oldValue;
                        return false;
                    }
                }
            }
        }

        if (field == 'Fixture.Height') {
            if (Utils.isNullOrEmpty(value) || value == 0) {
                this.notify.warn(itemData.ObjectDerivedType + " Height Can't be zero");
                itemData.Fixture.Height = oldValue;
                itemData.Dimension.Height = oldValue;
                return false;
            } else if (value + itemData.getYPosToPog(true) > pogObject.Dimension.Height) {
                this.notify.warn(itemData.ObjectDerivedType + " Height Can't be more than Section Height");
                itemData.Fixture.Height = oldValue;
                itemData.Dimension.Height = oldValue;
                return false;
            }
        }

        if (field == 'Fixture.Depth') {
            if (Utils.isNullOrEmpty(value) || value == 0) {
                this.notify.warn(itemData.ObjectDerivedType + " Depth Can't be Zero");
                itemData.Fixture.Depth = oldValue;
                itemData.Dimension.Depth = oldValue;
                return false;
            } else if (value > pogObject.Dimension.Depth) {
                this.notify.warn(itemData.ObjectDerivedType + " Depth Can't be more than Section Depth");
                itemData.Fixture.Depth = oldValue;
                itemData.Dimension.Depth = oldValue;
                return false;
            }
            if (
                itemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                itemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ
            ) {
                if (
                    itemData.Children.length > 0 &&
                    !itemData.checkIfValidChange(
                        _.filter(itemData.Children, { ObjectDerivedType: AppConstantSpace.POSITIONOBJECT })[0],
                        Utils.isNullOrEmpty(itemData.Fixture.MaxMerchWidth) || itemData.Fixture.MaxMerchWidth == 0
                            ? itemData.Fixture.Width
                            : Math.min(itemData.Fixture.Width, itemData.Fixture.MaxMerchWidth),
                        itemData.ChildDimension.Height,
                        value,
                        field,
                    )
                ) {
                    this.notify.warn('DEPTH_INSUFFICIENT_PRODUCTS_FIXTURE');
                    itemData.Fixture.Depth = oldValue;
                    itemData.Dimension.Depth = oldValue;
                    return false;
                }
            }
        }

        if (
            field == 'Fixture._X04_XPEGSTART.ValData' ||
            field == 'Fixture._X04_XPEGEND.ValData' ||
            field == 'Fixture._X04_YPEGEND.ValData' ||
            field == 'Fixture._X04_YPEGSTART.ValData'
        ) {
            var allPos = itemData.getAllPosition();
            if (
                allPos.length > 0 &&
                !itemData.checkIfValidChange(
                    (function () {
                        var position = {};
                        switch (field) {
                            case 'Fixture._X04_XPEGSTART.ValData': {
                                position = _.minBy(allPos, function (pos: any) {
                                    return pos.Location.X + pos.getPegInfo().OffsetX;
                                });
                                break;
                            }
                            case 'Fixture._X04_XPEGEND.ValData': {
                                position = _.maxBy(allPos, function (pos: any) {
                                    return (
                                        pos.Location.X +
                                        pos.linearWidth() -
                                        pos.computeWidth() +
                                        pos.getPegInfo().OffsetX
                                    );
                                });
                                break;
                            }
                            case 'Fixture._X04_YPEGSTART.ValData': {
                                position = _.minBy(allPos, function (pos: any) {
                                    return pos.Location.Y + pos.getPegInfo().OffsetY;
                                });
                                break;
                            }
                            case 'Fixture._X04_YPEGEND.ValData': {
                                position = _.maxBy(allPos, function (pos: any) {
                                    return (
                                        pos.Location.Y +
                                        pos.linearHeight() -
                                        pos.computeHeight() +
                                        pos.getPegInfo().OffsetY
                                    );
                                });
                                break;
                            }
                        }
                        return position;
                    })(),
                )
            ) {
                this.notify.warn("Offset can't be changed.");
                this.sharedService.setObjectField(itemData.$id, field, oldValue, itemData.$sectionID);
                return false;
            }
        }
        if (
            field == 'Position.BackSpacing' ||
            field == 'Position.BackYOffset' ||
            field == 'Position.FrontSpacing' ||
            field == 'Position.TagYOffset' ||
            field == 'Position.TagXOffset' ||
            field == 'Position.HeightSlope' ||
            field == 'Position._X05_PEGLENGTH.ValData' ||
            field == 'Position.TagHeight' ||
            field == 'Position.TagWidth' ||
            field == 'Position.PegOverhang'
        ){
            return this.propertyGridPegValidationService.validatedFields(itemData,field,value);
        }

        if (Utils.checkIfPegboard(itemData) && field == 'Fixture._X04_XINC.ValData') {
            const allPos = itemData.getAllPosition().filter(p => p.Position.BackHooks > 1);
            const updatedBackSpacing = [];
            let isValid = true;
            if (allPos.length) {
                for (const pos of allPos) {
                    const result = this.propertyGridPegValidationService.validatePegIncrementXChange(pos, value);
                    if (!result.flag) {
                        isValid = false;
                        break;
                    } else {
                        if (result?.valueToAdjustBS) {
                            updatedBackSpacing.push({ posId: pos.$id, backSpacing: result.valueToAdjustBS });
                        }
                    }
                }

                if (isValid && updatedBackSpacing.length > 0) {
                    this.historyService.startRecording();
                    for (const pos of updatedBackSpacing) {
                        const position = allPos.find(p => p.$id === pos.posId);
                        this.propertyGridPegValidationService.changeBackSpacing(position, pos.backSpacing);
                    }
                }
            }
            if (!isValid) {
                this.notify.warn("POSITION_BACKHOOK_NOT_ALIGNING");
                return false;
            }
        }

        if (field === 'Fixture.MaxFixtureWeight' && value <= 0 ) {
            this.notify.warn('MAX_FIXTURE_WEIGHT_SHOULD_NOT_ACCEPT_ZERO_VALUE');
            itemData.Fixture.MaxFixtureWeight = oldValue;
            return false;
        }
        
        //restricting the fixture to move when fixture movement is in lock state
        if (field === AppConstantSpace.FIXTURE_NOTCH_NUMBER) {
            if (pogObject.LKFixtureMovement === AppConstantSpace.FIXTURE_MOVEMENT.LOCK ) {
                this.notify.warn('FIXTURE_MAPPING_IS_LOCK_CANNOT_MOVE_THE_FIXTURE');
                itemData.Fixture.NotchNumber = oldValue;
                return false;         
            }
        }

        return true;
    }

    public validateImage(imageValConfig: ImageValidationConfig): boolean {
        const fileSize = imageValConfig.file.size;
        const fileType = imageValConfig.file.type;
        if (imageValConfig.maxFileSizeInKB && (fileSize / 1024) > imageValConfig.maxFileSizeInKB) {
            this.notify.warn(imageValConfig.maxFileSizeErrMsg);
            return false;
        }
        if (imageValConfig.supportedFileType.length > 0 && !imageValConfig.supportedFileType.find(x => x === fileType)) {
            this.notify.warn(imageValConfig.supportedFileTypeErrMsg);
            return false;
        }
        return true;
    }

}

export interface ImageValidationConfig {
    file: File;
    supportedFileType: string[];
    supportedFileTypeErrMsg: string;
    maxFileSizeInKB?: number;
    maxFileSizeErrMsg: string;
}
