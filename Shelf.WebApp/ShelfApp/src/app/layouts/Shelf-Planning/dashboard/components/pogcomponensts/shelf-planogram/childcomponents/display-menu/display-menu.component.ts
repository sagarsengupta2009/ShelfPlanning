import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { orderBy } from 'lodash-es';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppConstantSpace } from 'src/app/shared/constants';
import {
    WorkSheetGridConfigurationService,
    Planogram_2DService,
    PlanogramService,
    SharedService,
    PanelService,
    PlanogramStoreService,
    Render2dService,
} from 'src/app/shared/services';
import {
    DisplayInfo,
    WorkSheetGridSettings,
    PositionWkSheetShelfModeObject,
    PogSettings,
    PlanogramView,
} from 'src/app/shared/models';
import { Section } from 'src/app/shared/classes';

@Component({
    selector: 'app-display-menu',
    templateUrl: './display-menu.component.html',
    styleUrls: ['./display-menu.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayMenuComponent implements OnInit {
    private WorkSheetGridConfiguration: WorkSheetGridSettings;
    private orderBy = {
        predicate: '',
        reverse: false,
    };
    public display: DisplayInfo = {
        annotationOn: false,
        annotationView: 0,
        customSheetSelection: '',
        grillView: false,
        modularView: false,
        shwShelfsItms: false,
        shwShpgCartItems: false,
        view: 0,
        zoom: 0,
        itemScanning: false
    };
    private pogSettings: PogSettings;
    public forSectionLength: boolean = true;
    public panelID: string;
    public customSheets: string[];
    public isReady_templateWorksheetSettings: number;
    public displayView : string = '';

    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly panelService: PanelService,
        private readonly planogramStore: PlanogramStoreService,
        @Inject(MAT_DIALOG_DATA) private readonly data: string,
        private readonly planogram2dService: Planogram_2DService,
        private readonly workSheetGridConfigurationService: WorkSheetGridConfigurationService,
        private readonly cd: ChangeDetectorRef,
        private readonly render2d: Render2dService,
        private readonly dialog: MatDialogRef<DisplayMenuComponent>,
    ) {
        this.panelID = this.data;
    }

    ngOnInit(): void {
        this.displayView = this.panelService.panelPointer[this.panelID].view
        this.initDisplayContextMenu();
    }

    //Initialization
    private initDisplayContextMenu(): void {
        const guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
        if (!guid) return;
        const currObj = this.planogramService.getCurrentObject(guid);
        if (!currObj.isLoaded) return;
        this.pogSettings = this.planogramService.rootFlags[currObj.sectionID];
        if (this.display?.zoom === undefined) {
            this.display.zoom = 0;
        }
        this.display.view = this.pogSettings.mode;
        this.display.modularView = this.pogSettings.isModularView;
        this.display.itemScanning = this.pogSettings.isItemScanning;
        this.display.grillView = this.pogSettings.isGrillView;
        this.display.annotationView = this.pogSettings.isAnnotationView;
        this.display.annotationOn = this.display.annotationView != 0;
        this.customSheets = this.workSheetGridConfigurationService.configuration.customSheets.templatePositionColumns;
        this.display.customSheetSelection = this.workSheetGridConfigurationService.configuration.displayMode; //"Custom"
        this.isReady_templateWorksheetSettings =
            this.sharedService.iSHELF.settings.isReady_template_positionWorksheetSettings;
        this.display.shwShpgCartItems = this.pogSettings.displayWorksheet.Cart;
        this.display.shwShelfsItms = this.pogSettings.displayWorksheet.Planogram;
        this.forSectionLength = !this.sharedService.considerOverflowItems;
    }

    //Close Modal
    private closeDisplayModal(): void {
        this.dialog.close();
    }

    public changeZoom(event: { value: number }): void {
        this.display.zoom = event.value;
    }

    public onGrillChange(event: { checked: boolean }): void {
        this.display.grillView = event.checked;
    }

    public onChange(event: { checked: boolean }): void {
        this.display.modularView = event.checked;
    }

    public changeView(event: { value: number }): void {
        this.display.view = event.value;
    }

    public triggerSaveDisplay(event): void {
        let sectionObj = this.sharedService.getObject(
            this.sharedService.activeSectionID,
            this.sharedService.activeSectionID,
        ) as Section;

        this.planogram2dService.changeDisplayMode(event, this.display);
        this.sharedService.changeZoomView.next(this.display.zoom);
        this.sharedService.changeZoomView.next(null);
        this.pogSettings.isGrillView = this.display.grillView;
        this.pogSettings.isAnnotationView = this.display.annotationView;
        this.pogSettings.isModularView = this.display.modularView;
        this.pogSettings.isItemScanning = this.display.itemScanning;
        this.planogramService.rootFlags[sectionObj.$id].isAnnotationView = this.display.annotationView;
        sectionObj.showAnnotation = this.display.annotationView;
        this.pogSettings.isAnnotationView--;
        this.planogram2dService.toggleAnnotations(sectionObj).subscribe();
        this.planogramService.rootFlags[sectionObj.$id].isAnnotationView = this.display.annotationView;
        const pog = this.planogramStore.getPogById(sectionObj.IDPOG);
        if (pog) {
            this.planogramService.updateSectionObjectIntoStore(sectionObj.IDPOG, sectionObj);
        }
        this.planogramService.UpdatedSectionObject.next(sectionObj);
        this.render2d.isDirty = true,
        this.planogramService.updateNestedStyleDirty = true;;
        this.cd.markForCheck();
        if (this.sharedService.isItemScanning != this.display.itemScanning) {
            this.sharedService.itemScanSubcription.next(true);
        }
        this.closeDisplayModal();
    }

    //Resetting dialog
    public triggerResetDisplay(): void {
        this.display.zoom = 1;
        this.display.view = 0;
        this.display.modularView = false;
        this.display.grillView = false;
        this.display.annotationView = 0;
        this.display.itemScanning = false;
    }

    public annotationViewChange(event: { checked: boolean }): void {
        if (event.checked) {
            this.display.annotationView = 3;
        } else {
            this.display.annotationView = 0;
        }
    }


    //trigger save for worksheet display
    public triggerSheetSaveDisplay(): void {
        this.sharedService.ShppingcartItems = [];
        let appSettingsSvc = this.planogramStore.appSettings;
        const planogramView = this.panelService.panelPointer[this.panelID].componentID;
        if (planogramView === PlanogramView.POSITION) {
            const guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
            //Customworksheet options
            if (this.display.customSheetSelection != this.workSheetGridConfigurationService.configuration.displayMode) {
                if (this.display.customSheetSelection === 'Custom') {
                    this.workSheetGridConfigurationService.configuration.positionColumnConfig =
                        this.workSheetGridConfigurationService.configuration.userPositionColumnConfig;
                    appSettingsSvc.worksheetGridSettings.positionColumns =
                        this.workSheetGridConfigurationService.configuration.userPositionColumnConfig;
                } else {
                    this.workSheetGridConfigurationService.configuration.positionColumnConfig =
                        this.WorkSheetGridConfiguration.customColoumnConfig.templatePositionColumns[
                            this.display.customSheetSelection
                        ];
                    appSettingsSvc.worksheetGridSettings.positionColumns =
                        this.WorkSheetGridConfiguration.customColoumnConfig.templatePositionColumns[
                            this.display.customSheetSelection
                        ];
                }
                this.workSheetGridConfigurationService.configuration.displayMode = this.display.customSheetSelection;
                //this.WorksheetSetting.saveWKSettings();TODO --saveWKSettings() should be called through service file
            }
            this.positionWkSheetShelfModeToggle({
                guid: guid,
                showShelf: this.display.shwShelfsItms,
                showCart: this.display.shwShpgCartItems,
            });
            if (this.display.shwShpgCartItems && this.display.shwShelfsItms) {
                this.sharedService.ShppingcartItems = this.getCartItems();
                this.sharedService.showShelfItem.next(true);
            } else if (!this.display.shwShpgCartItems && !this.display.shwShelfsItms) {
                this.sharedService.ShppingcartItems = [];
                this.sharedService.showShoppingCartItem.next(true);
            } else if (this.display.shwShpgCartItems && !this.display.shwShelfsItms) {
                this.sharedService.ShppingcartItems = this.getCartItems();
                this.sharedService.showShoppingCartItem.next(true);
            } else if (!this.display.shwShpgCartItems && this.display.shwShelfsItms) {
                this.sharedService.ShppingcartItems = [];
                this.sharedService.showShelfItem.next(true);
            }
        } else if (this.panelService.panelPointer[this.panelID].componentID === PlanogramView.INVENTORY) {
            const guid = this.panelService.panelPointer[this.panelID].globalUniqueID;

            if (this.display.shwShpgCartItems) {
                this.sharedService.ShppingcartItems = this.getCartItems();
                this.sharedService.showShoppingCartItem.next(true);
            } else if (!this.display.shwShpgCartItems) {
                this.sharedService.ShppingcartItems = [];
                this.sharedService.showShoppingCartItem.next(false);
            }
            this.positionWkSheetShelfModeToggle({
                guid: guid,
                showShelf: this.display.shwShelfsItms,
                showCart: this.display.shwShpgCartItems,
            });
        }
    }

    private positionWkSheetShelfModeToggle(positionWkSheetShelfModeData: PositionWkSheetShelfModeObject): void {
        const currObj = this.panelService.panelPointer[this.panelID];
        if (currObj.globalUniqueID === positionWkSheetShelfModeData.guid) {
            this.planogramService.rootFlags[this.sharedService.activeSectionID].displayWorksheet.Cart =
                positionWkSheetShelfModeData.showCart;
            this.planogramService.rootFlags[this.sharedService.activeSectionID].displayWorksheet.Planogram =
                positionWkSheetShelfModeData.showShelf;
        }
    }

    private getCartItems() {
        //TODO add return type should get from another interface
        if (this.sharedService.getActiveSectionId() !== '') {
            const firstLevelChild = this.sharedService.planogramVMs[this.sharedService.getActiveSectionId()].Children;
            for (const fLChild of firstLevelChild) {
                if (fLChild.ObjectDerivedType === AppConstantSpace.SHOPPINGCARTOBJ) {
                    fLChild.badgeVisible = false;
                    fLChild.numOfAvlItems = 0;
                    let numItems = 0;
                    fLChild.Children.forEach((obj) => {
                        switch (obj.Position.attributeObject.RecADRI) {
                            case `A`:
                                obj.Position.RecommendationNumber = 1;
                                break;
                            case `R`:
                                obj.Position.RecommendationNumber = 2;
                                break;
                            case `D`:
                                obj.Position.RecommendationNumber = 3;
                                numItems++;
                                break;
                        }
                    });
                    if (numItems > 0) {
                        fLChild.badgeVisible = true;
                        fLChild.numOfAvlItems = numItems;
                    }
                    return orderBy(fLChild.Children, this.orderBy.predicate, this.orderBy.reverse);
                }
            }
        }
        return [];
    }

    public sectionlength() {
        let sectionObj = this.sharedService.getObject(
            this.sharedService.activeSectionID,
            this.sharedService.activeSectionID,
        ) as Section;
        this.sharedService.considerOverflowItems = !this.forSectionLength
        if (!this.forSectionLength) {
            this.sharedService.considerOverflowItems = true;
            sectionObj.setOverflowLength();
        } else {
            sectionObj && (sectionObj.overflowLength = 0);
        }
        this.planogramService.UpdatedSectionObject.next(sectionObj);
    }
}
