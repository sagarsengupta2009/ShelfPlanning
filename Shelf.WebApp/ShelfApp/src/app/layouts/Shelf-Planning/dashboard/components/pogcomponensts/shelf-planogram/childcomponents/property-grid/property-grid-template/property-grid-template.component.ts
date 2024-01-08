import { 
    Component, 
    ElementRef, 
    EventEmitter, 
    Input, 
    OnChanges, 
    OnInit, 
    Output, 
    ViewChild, 
    ViewEncapsulation
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AppConstantSpace, COLOR_PALETTE, Utils } from 'src/app/shared/constants';
import { 
    ProductPackageSummary, 
    PropertyStoreList, 
    StoreAppSettings, 
    TabChildren, 
    UprightType 
} from 'src/app/shared/models';
import { PegLibrary } from 'src/app/shared/models/peg-library';
import { 
    CrunchModeService, 
    PlanogramStoreService, 
    PropertyFieldService, 
    PropertyGridService, 
    SharedService, 
    PegLibraryService, 
    PlanogramService, 
    UprightService 
} from 'src/app/shared/services';
import { SelectableList } from 'src/app/shared/services/common/shared/shared.service';
import { TranslateService } from '@ngx-translate/core';
import { Position, Section } from 'src/app/shared/classes';
import { cloneDeep } from 'lodash';

@Component({
    selector: 'shelf-property-grid-template',
    templateUrl: './property-grid-template.component.html',
    styleUrls: ['./property-grid-template.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class PropertyGridTemplateComponent implements OnChanges, OnInit {
    @Input() fieldData: TabChildren;
    @Input() itemData: SelectableList;
    @Input() fieldObjectType: string;
    @Input() propertyGridType: string;
    @Input() ABSStoreNumber: PropertyStoreList[] = [];
    @Input() disable: boolean = false;
    @Input() isListView: boolean = false;
    @Input() avilablePkgStyleList: ProductPackageSummary[] = [];
    @Input() selectedPkgStyle: number;
    @Output() fieldTemplateChanges: EventEmitter<any> = new EventEmitter();
    @ViewChild('textField') txtInput: ElementRef;

    private subscriptions: Subscription = new Subscription();
    public fObj: TabChildren;
    public absKeyGroup = AppConstantSpace.ABSKEYGROUP;
    public iDPackageList = [];
    public POGClassifierList = [];
    public lkCrunchModeList = [];
    public availablePegTypes:PegLibrary[];
    public avilableBackHooks;
    public gradientSettings = {
        opacity: false,
    };
    public paletteSettings = {
        columns: 17,
        palette: COLOR_PALETTE,
    };
    public numberDropdown;
    public frontBarDropdown;
    public pegDecimals: number = 0;
    public isMultiPosSelected: boolean = false;
    public multiPosSelectedPkgStyle: number;
    constructor(
        private readonly planogramStore: PlanogramStoreService,
        public readonly propertyFieldService: PropertyFieldService,
        private readonly sharedService: SharedService,
        private readonly propertyGridService: PropertyGridService,
        private readonly crunchMode: CrunchModeService,
        private readonly pegLibraryService:PegLibraryService,
        private readonly planogramService: PlanogramService,
        private readonly translate: TranslateService,
        private readonly uprightService: UprightService
    ) {}

    ngOnInit(): void {}

    public ngOnChanges(): void {
        this.isMultiPosSelected = this.sharedService.getSelectedId(this.sharedService.getActiveSectionId()).length > 1;
        this.fObj = this.fieldData;
        this.multiPosSelectedPkgStyle = this.selectedPkgStyle;
        if (this.itemData) {
            this.prepareFieldArray(this.fieldData);
        }
    }

    public findIndex(fieldObj: TabChildren): boolean {
        return [1002049,1002050,1002103,5051,5202,414,5531,5534].indexOf(fieldObj.IDDictionary) != -1;
    }

    public checkIfImage(fObj: TabChildren): boolean {
        const imageUrl = this.sharedService.getObjectField(undefined, fObj.field, undefined, this.itemData);
        return !Utils.isNullOrEmpty(imageUrl);
    }

    public checkIfImageryFields(idDictionary: number): boolean {
        const imageryIDDictionaries = [5341, 5343, 5340, 5342, 5338, 5339, 5508, 5561, 5562, 5563, 5564, 5565, 5566];
        return imageryIDDictionaries.includes(idDictionary);
    }

    public checkSelectInput(fieldObj: TabChildren): boolean {
        if (
            fieldObj.field == 'Fixture.LKCrunchMode' ||
            fieldObj.field == 'Position.IDPackage' || fieldObj.field == 'Position.PegType' ||
            fieldObj.field == 'Position.BackHooks' || fieldObj.field == 'Position.FrontBars' ||
            (fieldObj.keyGroup == AppConstantSpace.ABSKEYGROUP && fieldObj.IDDictionary == 5202) ||
            (fieldObj.keyGroup == AppConstantSpace.ABSKEYGROUP && fieldObj.IDDictionary == 5051)
        ) {
            return true;
        } else {
            return false;
        }
    }

    public get AppSettingsSvc(): StoreAppSettings {
        return this.planogramStore.appSettings;
    }

    public imposeMinMax(event): void {
        if ((event.which >= 48 && event.which <= 57) || (event.which >= 96 && event.which <= 105)) {
            if (
                parseInt(event.target[`value`]) <= parseInt(event.target[`min`]) ||
                parseInt(event.target[`value`]) >= parseInt(event.target[`max`])
            ) {
                event.preventDefault();
            }
        }
    }
    public getTitleOfIcon(fObj: TabChildren, value: number): string{
      //filter the options array with value to get the text of the selected value
      let selectedOption = fObj.options.filter((item) => item.value == value)[0];
      return selectedOption.text || fObj.value;
    }
    public fieldChange(event: any, type: string, fieldObj: TabChildren, value?: any) {
      //find out the if fieldObj has options. If it has options we can change the type to list.
        if ((fieldObj.options && fieldObj.options.length > 0) || fieldObj.IDDictionary === 392) {
            type = 'list';
        } else if(fieldObj.IsDialog){
          type = 'editors';
        }
        let canCallChangeEvent = true;
        if(fieldObj.field === AppConstantSpace.UPRIGHT) {
            canCallChangeEvent = this.verifyUprightValue(fieldObj, event);
        }
        
        //Some field values ​​are not updating on the UI. By using setTimeout function, its working
        if(canCallChangeEvent) {
            setTimeout(() => {
                this.fieldTemplateChanges.emit({
                    type: type,
                    event: event,
                    fieldData: fieldObj,
                    fixType: this.fieldObjectType,
                    value: value
                });
            });
        } else {
            const itemData = this.itemData as Section;
            this.txtInput.nativeElement.value = itemData.Upright;
        }
    }

    public prepareFieldArray(fieldObj: TabChildren): void {
        const section = this.itemData as Section;
        switch (fieldObj.IDDictionary) {
            case 5051:
                let val = this.sharedService.getObjectField(undefined, fieldObj.field, undefined, this.itemData);
                if (val == 1) {
                    this.POGClassifierList = this.AppSettingsSvc.POG_CLASSIFIER_LOOKUP;
                } else {
                    this.POGClassifierList = this.AppSettingsSvc.POG_CLASSIFIER_LOOKUP.filter((itm) => itm.Value != 1);
                }
                break;
            case 5202:
                let setStoreNumDataSource = (data) => {
                    this.ABSStoreNumber = data.map((item) => {
                        item.Value = item.Value.toString();
                        return item;
                    });
                };
                this.subscriptions.add(
                    this.propertyGridService.GetStoreListByPog(this.itemData.IDPOG).subscribe((data: any) => {
                        this.sharedService.storeListByPog[this.itemData.IDPOG] = data.Data;
                        setStoreNumDataSource(data.Data);
                    }),
                );
                break;
            case 392:
                let packagedatasource = [];
                if (this.itemData.Position.AvailablePackageType) {
                    if (!this.isMultiPosSelected) {
                        this.avilablePkgStyleList = this.itemData.Position.AvailablePackageType;
                    }
                    this.avilablePkgStyleList?.forEach((item, key) => {
                        let fieldOptionObj: any = {};
                        const name = this.isMultiPosSelected ? this.planogramStore.lookUpHolder.PACKAGESTYLE.options?.find(ps => ps.value == item.IdPackageStyle)?.text : item.Name;
                        fieldOptionObj.value = this.isMultiPosSelected ? item.IdPackageStyle : item.IDPackage;
                        fieldOptionObj.text = name;
                        fieldOptionObj.IdPackageStyle = item.IdPackageStyle;
                        packagedatasource.push(fieldOptionObj);
                    });
                    this.iDPackageList = packagedatasource;
                }
                break;
            case 356:
                if (
                    this.itemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                    this.itemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ
                ) {
                    const options = this.crunchMode.getFilteredCrunchOptions(
                        this.planogramStore.lookUpHolder.CrunchMode.options,
                        this.itemData.ObjectDerivedType,
                    );
                    this.lkCrunchModeList = Object.assign([], options);
                } else {
                    this.lkCrunchModeList = Object.assign([], fieldObj['options']);
                }
                break;
                case 414:
                    let availablePegDatasource = [];
                    const availablePegTypesList =  this.pegLibraryService?.PegLibrary.filter(x => x.IsActive);
                    availablePegTypesList?.forEach((item, key) => {
                        let fieldOptionObj: any = {};
                        fieldOptionObj.value = item.IDPegLibrary;
                        fieldOptionObj.text = item.PegName;
                        fieldOptionObj.IDPegLibrary = item.IDPegLibrary;
                        availablePegDatasource.push(fieldOptionObj);
                    });
                    this.availablePegTypes = availablePegDatasource;
                    break
                case 416:
                    let selectedObjsList = this.planogramService.getSelectedObject(this.itemData.$sectionID);
                    if (selectedObjsList?.length >= 1 && selectedObjsList[0].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                      (fieldObj as any).options = cloneDeep(this.planogramService.getAvailableOrientations(selectedObjsList as Position[]).orientationsList);
                      let canDefault = selectedObjsList.length == 1 || this.planogramService.isSameProduct(selectedObjsList as Position[]);
                      canDefault && (fieldObj as any).options.forEach(element => {
                        if (element.value === (selectedObjsList[0] as Position).getDefaultOrientation()) {
                          let text = ' (' + this.translate.instant('DEFAULT').toLowerCase() + ')';
                          //let spanTag = `<span 'font-style:italic' >${text}</span>`;
                          element.text += text;
                        }
                      });
                    }
                    if ((fieldObj as any).options[0].value != -1) {
                        if (selectedObjsList.length > 1) {
                            const oriObj = {
                                'text': this.translate.instant('SET_DEFAULT'),
                                'value': -1,
                                'IsDefault': false,
                                'DisplayOrder': -1,
                            };
                            (fieldObj as any).options.splice(0, 0, oriObj);
                        }
                    }
                    break
            case 581:
                this.setUprightvalAccToUprightType(fieldObj, section);
                break;
                case 5531:
                    this.numberDropdown = this.createNumberDropDown(5);
                    break
                case 5534:
                    this.frontBarDropdown = this.createNumberDropDown(2);
                    break
                case 5530:
                case 5532:
                case 5533:
                case 5537:
                case 5538:
                case 5539:
                case 5540:
                    this.pegDecimals = this.findDecimals(fieldObj.UiFormat);
                    break;
            case 5577:
                this.createUprightDropDown(fieldObj, section);
                break;
            case 5578:
                this.disableCheckboxOnUprightType(fieldObj, section);
                break;
            default:
                    break;

        }
    }

    private findDecimals(UiFormat: string) : number{
        let objArray = UiFormat.split('.');
        return objArray[1].length;
    }

    public pegTypeList(iddictionarie:number):boolean{
        let pegListArray = [5530,5532,5533,5537,5538,5539,5540];
       return pegListArray.includes(iddictionarie);
    }

    public createNumberDropDown(option: number){
        let availablenumberDropdown=[];
        let numberdropdownValues = Array.from({ length: option }, (_, i) => i + 1)
        numberdropdownValues?.forEach((item, key) => {
            let fieldOptionObj: any = {};
            fieldOptionObj.value = item;
            fieldOptionObj.text = item;

            availablenumberDropdown.push(fieldOptionObj);
        });
        return availablenumberDropdown;
    }

    //Disable children fields when section or fixture selected
    public get disableFields(): boolean {
        if (this.disable) {
            return true;
        }
        switch (this.propertyGridType) {
            case AppConstantSpace.FIXTUREOBJ:
                if (this.fieldObjectType === AppConstantSpace.POSITIONOBJECT) {
                    return true;
                }
                break;
            case AppConstantSpace.POG:
                if (
                    this.fieldObjectType === AppConstantSpace.POSITIONOBJECT ||
                    this.fieldObjectType === AppConstantSpace.FIXTUREOBJ
                ) {
                    return true;
                }
                break;
        }
        return false;
    }

    public trackByValue(index: number): number {
        return index;
    }

    setUprightvalAccToUprightType(fieldObj: TabChildren, section: Section): void {
        if(section.uprightType === UprightType.None) {
            fieldObj.ReadOnly = true;
        } else if(section.uprightType === UprightType.Fixed) {
            this.uprightService.lastSelectedFixedUpright = section.Upright;
            fieldObj.ReadOnly = this.uprightService.setUprightsToBayChecked;
        } else if(section.uprightType === UprightType.Variable) {
            this.uprightService.lastSelectedVariableUpright = section.Upright;
            fieldObj.ReadOnly = this.uprightService.setUprightsToBayChecked;
        }
    }

    createUprightDropDown(fieldObj: TabChildren, section: Section): void {
        fieldObj[fieldObj.field] = section.uprightType;
        fieldObj.ReadOnly = this.uprightService.setUprightsToBayChecked;
    }

    disableCheckboxOnUprightType(fieldObj: TabChildren, section: Section): void {
        if(section.uprightType === UprightType.None) {
            fieldObj.ReadOnly = true;
        }
    }

    verifyUprightValue(fieldObj: TabChildren, event: string): boolean {
        const itemData = this.itemData as Section;
        if(itemData.uprightType === UprightType.Fixed) {
            if(Number(event) <= 0) {
                return false;
            } 
            return !Number.isNaN(Number(event));
        } else if(itemData.uprightType === UprightType.Variable) {
            const regex = /^\d+(,\d+)*,?$/;
            if(!regex.test(event.replaceAll(/\s/g,''))) {
                let intervals = event.split(',');
                let isNumber = intervals.every(el => {
                    return !Number.isNaN(Number(el)) && Math.sign(Number(el)) !== -1 && Math.sign(Number(el)) !== 0;
                })
                return isNumber;
            }
            return true;
        }
    }
}
