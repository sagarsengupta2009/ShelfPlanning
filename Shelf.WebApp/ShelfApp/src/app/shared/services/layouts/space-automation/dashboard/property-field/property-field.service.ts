import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { each, filter } from 'lodash-es';
import { Fixture, Position, Section } from 'src/app/shared/classes';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { Utils } from 'src/app/shared/constants/utils';
import { FixtureImageSide, LookUpChildOptions, TabChildren } from 'src/app/shared/models';
import { SharedService, PlanogramStoreService, UprightService, HistoryService, ConfigService } from 'src/app/shared/services';
import { FixtureList, SelectableList } from 'src/app/shared/services/common/shared/shared.service';

//Not exporting, as this interface is added for code readability & it is not used outside this file
interface FixtureImageStyle {
    'background-image': string;
    position?: string;
    top: string;
    height: string;
    'padding-top': number;
    'margin-left': string;
    'background-size': string;
    'background-repeat': string;
    'background-position': string;
}
@Injectable({
    providedIn: 'root',
})
export class PropertyFieldService {
    public shelfData: Fixture | Section | Position;

    constructor(
        private readonly planogramStore: PlanogramStoreService,
        private readonly translate: TranslateService,
        private readonly sharedService: SharedService,
        private readonly upright: UprightService,
        private readonly historyService: HistoryService,
        private readonly config: ConfigService
    ) {}

    public getColorCode(itemData: Position): Position {
        if (itemData) {
            itemData.Position.attributeObject.Color_color = itemData.getStringColor();
            return itemData;
        } else {
            return itemData;
        }
    }

    public preparingPackage(itemData?: Position): boolean {
        if (!itemData.Position.AvailablePackageType) {
            return true;
        }
        return false;
    }

    public getPackageName(itemData?: Position): string {
        if (itemData) {
            let PackageName: string = '';
            each(itemData.Position.AvailablePackageType, (obj) => {
                if (obj.IDPackage === itemData.Position.IDPackage) {
                    PackageName = obj.Name; //'Case Pack';
                }
            });
            return PackageName;
        }
    }

    public getDividerName(itemData?: FixtureList): string {
        if (itemData) {
            let name: string = this.translate.instant('NONE');
            if (itemData.Fixture.HasDividers) {
                let dividerPlacementList: LookUpChildOptions[] = [];
                let dividerType: number;
                const shelf = filter(itemData.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
                if (shelf) {
                    if (itemData?.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
                        dividerPlacementList = this.upright.fixtureDirectionOptions();
                        dividerType = itemData.Fixture.LKDividerType;
                    } else {
                        dividerPlacementList = this.planogramStore.lookUpHolder.DividerType.options;
                        dividerType = shelf.Fixture.LKDividerType;
                    }
                    each(dividerPlacementList, (obj) => {
                        if (obj.value === dividerType) {
                            name = obj.text;
                        }
                    });
                }    
            }
            return name;
        }
    }

    public getGrillName(itemData?: Fixture): string {
        if (itemData) {
            let name: string = this.translate.instant('NONE');
            if (itemData.Fixture.HasGrills) {
                let grillItemData = filter(itemData.Children, { ObjectDerivedType: AppConstantSpace.GRILLOBJ })[0];
                let grillPlacementList: LookUpChildOptions[] = this.planogramStore.lookUpHolder.GrillPlacement.options;
                each(grillPlacementList, (obj) => {
                    if (obj.value == grillItemData?.Fixture?._GrillPlacement.ValData) {
                        name = obj.text;
                    }
                });    
            }
            return name;
        }
    }

    public getImageUrl(fObj: TabChildren, itemData: SelectableList, isListView: boolean): FixtureImageStyle {
        if (itemData) {
            let imageUrl: string = this.sharedService.getObjectField(undefined, fObj.field, undefined, itemData) as string;
            if (!Utils.isNullOrEmpty(imageUrl)) {
                imageUrl = `url('${imageUrl}')`;
            }
            return this.commonIageStyle(imageUrl, isListView);
        }
    }

    private commonIageStyle(imageUrl: string, isListView: boolean): FixtureImageStyle {
        const imgFallback = `url('${this.config?.fallbackImageUrl}')`;
        return {
            'background-image': `${imageUrl}, ${imgFallback}`,
            position: isListView ? '' : 'absolute',
            top: '6px',
            height: isListView ? '17px' : '35px',
            'padding-top': 0,
            'margin-left': '35px',
            'background-size': 'cover',
            'background-repeat': 'no-repeat',
            'background-position': 'center',
        };
    }

    public clearImage(fObj: TabChildren, itemData: SelectableList): void {
        if (itemData) {
            let prevUrlField = 'previousUrl';
            let newUrlField = 'newUrl';
            let imageUrl: string = this.sharedService.getObjectField(undefined, fObj.field, undefined, itemData) as string;
            if (itemData.ObjectType === AppConstantSpace.FIXTUREOBJ) {
                prevUrlField = 'Fixture.previousUrl';
                newUrlField = 'Fixture.newUrl';
            } else if (itemData.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
                prevUrlField = 'Position.previousUrl';
                newUrlField = 'Position.newUrl';
            }
            
            this.sharedService.setObjectField(undefined, prevUrlField, imageUrl, undefined, itemData);
            this.sharedService.setObjectField(undefined, fObj.field, '', undefined, itemData);
            this.sharedService.setObjectField(undefined, newUrlField, '', undefined, itemData);
            this.setSideBasedOnField(fObj, itemData);
            
            if (itemData.ObjectType === AppConstantSpace.FIXTUREOBJ) {
                this.clearImageUrl(itemData.asFixture());
            } else if (itemData.ObjectDerivedType === AppConstantSpace.SECTIONOBJ ||
                itemData.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
                this.clearImageUrl(itemData);
            }
        }
    }

    private clearImageUrl(itemData: Fixture | Section | Position): void {
        if (itemData) {
            if (itemData?.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
                this.sharedService.updateStandardShelf.next(true);
                if (itemData.Fixture.side == FixtureImageSide.FGFront) {
                    itemData.Children.forEach(child => {
                        this.sharedService.updatePosition.next(child.$id);
                    })
                    this.sharedService.updateGrillOnFieldChange.next(true);
                }
            } else if (itemData?.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
                this.sharedService.updatePosition.next(itemData.$id);
            } else {
                this.sharedService.updateImageInPOG.next(itemData?.ObjectDerivedType);
            }
            this.clearFixtureImage(itemData);
        }
    }

    public clearFixtureImage(data : Position | Fixture | Section): void {
        this.historyService.startRecording();
        const previousUrl = this.getPreviousUrl(data);
        const newUrl = this.getNewUrl(data);
        const side = this.getSide(data);
        let funoriginal = ((data, url, side) => {
            return () => {
                this.attachingToParticularSide(data, url, side);
            };
        })(data, newUrl, side);
        let funRevert = ((data, url, side) => {
            return () => {
                this.attachingToParticularSide(data, url, side);
            };
        })(data, previousUrl, side);
        this.historyService.captureActionExec({
            funoriginal,
            funRevert,
            funName: 'MoveAnnotation',
        });
        this.historyService.stopRecording();
    }

    public getSide(data: Position | Fixture | Section): string{
        return data.ObjectDerivedType === AppConstantSpace.SECTIONOBJ ? data.side : (data.ObjectType === AppConstantSpace.FIXTUREOBJ ? data.Fixture.side : data.Position.side);
    }

    private getNewUrl(data: Position | Fixture | Section): string {
        return data.ObjectDerivedType === AppConstantSpace.SECTIONOBJ ? data.newUrl : (data.ObjectType === AppConstantSpace.FIXTUREOBJ ? data.Fixture.newUrl : data.Position.newUrl);
    }

    private getPreviousUrl(data: Position | Fixture | Section): string {
        return data.ObjectDerivedType === AppConstantSpace.SECTIONOBJ ? data.previousUrl : (data.ObjectType === AppConstantSpace.FIXTUREOBJ ? data.Fixture.previousUrl : data.Position.previousUrl);
    }

    public attachingToParticularSide(data: Fixture | Section | Position, urlVal: string, side: string): void {
        switch (side) {
            case 'Front':
                if (data.ObjectDerivedType === AppConstantSpace.SECTIONOBJ) {
                    data.FrontImage.Url = urlVal;
                } else {
                    data.Fixture.FrontImage.Url = urlVal;
                }
                break;
            case 'FarFront':
                data.Fixture.FrontImage.FarFrontUrl = urlVal;
                break;
            case 'FGFront':
                data.Fixture.ForegroundImage.Url = urlVal;
                break;
            case 'BGFront':
                data.Fixture.BackgroundFrontImage.Url = urlVal;
                break;
            case 'Back':
                if (data.ObjectDerivedType === AppConstantSpace.SECTIONOBJ) {
                    data.BackImage.Url = urlVal;
                } else {
                    data.Fixture.BackImage.Url = urlVal;
                }
                break;
            case 'BGBack':
                data.Fixture.BackgroundBackImage.Url = urlVal;
                break;
            case 'Top':
                data.Fixture.TopImage.Url = urlVal;
                break;
            case 'Bottom':
                data.Fixture.BottomImage.Url = urlVal;
                break;
            case 'Left':
                data.Fixture.LeftImage.Url = urlVal;
                break;
            case 'Right':
                data.Fixture.RightImage.Url = urlVal;
                break;
            case 'Edge':
                data.Position.EdgeImage.Url = urlVal;
                break;
            default:
                break;
        }
    }

    public setSideBasedOnField(fObj: TabChildren, itemData: SelectableList): void{
        let side = '';
        switch (fObj.field) {
            case `Fixture.LeftImage.Url`:
                side = FixtureImageSide.Left;
                break;
            case `Fixture.TopImage.Url`:
                side = FixtureImageSide.Top;
                break;
            case `Fixture.BottomImage.Url`:
                side = FixtureImageSide.Bottom;
                break;
            case `Fixture.RightImage.Url`:
                side = FixtureImageSide.Right;
                break;
            case `Fixture.FrontImage.Url`:
            case 'FrontImage.Url':
                side = FixtureImageSide.Front;
                break;
            case 'Position.EdgeImage.Url':
                side = FixtureImageSide.Edge;
                break;
            case 'Fixture.ForegroundImage.Url':
                side = FixtureImageSide.FGFront;
                break;
            case 'Fixture.BackgroundFrontImage.Url':
                side = FixtureImageSide.BGFront;
                break;
            case `Fixture.FrontImage.FarFrontUrl`:
                side = FixtureImageSide.FarFront;
                break;
            case `Fixture.BackImage.Url`:
            case 'BackImage.Url':
                side = FixtureImageSide.Back;
                break;
            case 'Fixture.BackgroundBackImage.Url':
                side = FixtureImageSide.BGBack;
                break;
        }

        let sideField = 'side';
        if (itemData.ObjectType === AppConstantSpace.FIXTUREOBJ) {
            sideField = 'Fixture.side';
        } else if (itemData.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
            sideField = 'Position.side';
        }
        this.sharedService.setObjectField(undefined, sideField, side, undefined, itemData);
    }
}
