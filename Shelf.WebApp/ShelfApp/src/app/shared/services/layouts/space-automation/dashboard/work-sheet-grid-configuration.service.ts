import { Injectable } from '@angular/core';
import { cloneDeep } from 'lodash';
import { ConsoleLogService } from 'src/app/framework.module';
import { Dictionary } from 'src/app/shared/models';
import { WorksheetColumnsSettings, WorksheetType } from 'src/app/shared/models/worksheets-models/worksheet-types';
import { PlanogramStoreService, SharedService, DictConfigService } from 'src/app/shared/services';
import { ConfigurationService } from './configuration/configuration.service';

@Injectable({
    providedIn: 'root'
})

export class WorkSheetGridConfigurationService {
    public configuration: any = {};
    public AppSettingsSvc: any = {};
    // TODO: should be using as below:
    // public get AppSettingsSvc(): StoreAppSettings {
    //     return this.planogramStore.appSettings;
    // }
    public postionWKSLengthCustom = 0;
    public mainCustomGridSettings: any = {};
    public worksSheetItrCount = 0;

    private itemSheet = "isReady_itemWorksheet";
    private fixtureSheet = "isReady_fixtureWorksheet";
    private inventorySheet = "isReady_inventoryWorksheet";
    private inventorySettingSheet = "isReady_inventorySettingWorksheet";
    private templateSheet = "isReady_template_positionWorksheetSettings";
    private positionDict = "PositionWorksheetConfigFromDict";
    private fixtureDict = "FixtureWorksheetConfigFromDict";
    private inventoryDict = "INVWorksheetConfigFromDict";

    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly configurationService: ConfigurationService,
        private readonly dictConfigService: DictConfigService,
        private readonly log: ConsoleLogService,
    ) {
        this.configuration.fixtureColumnConfig = {};
        this.configuration.positionColumnConfig = {};
        this.configuration.userPositionColumnConfig = {};
        this.configuration.customColoumnConfig = {};
        this.configuration.itemColumnConfig = {};
        this.configuration.inventoryColumnConfig = {};
        this.configuration.customSheets = {};
        this.configuration.customSheets.templatePositionColumns = [];
        this.configuration.customSheets.customFixtureColumns = [];
        this.configuration.displayMode = 'Custom';
    }

    public makeConfigWithDict(): void {

        this.AppSettingsSvc = this.planogramStore.appSettings;

        let customData = this.AppSettingsSvc.allSettingsObj.GetAllSettings.data;
        //Postion Columns
        let mainGridPositionColoumns = this.getWorksheet("positionColumns", this.itemSheet, this.positionDict);
        //Fiture Columns
        let mainGridFixtureColoumns = this.getWorksheet("fixtureColumns", this.fixtureSheet, this.fixtureDict);
        //ITEM Worksheet column preparation starts here
        let mainGridInvColoumns = this.getWorksheet("itemColumns", this.inventorySheet, this.inventoryDict);
        //INVENTORY WORKSHEET PREP STARTS HERE
        let mainGridInvSettingColoumns = this.getWorksheet("inventorySettings", this.inventorySettingSheet, this.inventoryDict);

        //Custom worksheet settings start
        this.mainCustomGridSettings = {};
        this.mainCustomGridSettings.templatePositionColumns = {};
        this.mainCustomGridSettings.customFixtureColumns = {};
        this.configuration.customSheets.templatePositionColumns.push("Custom");
        let gridPositionColoumnsCustom = [];
        const templateSettings = customData.find(val => val.KeyName === 'TEMPLATES_WORKSHEET_SETTINGS');

        if (!templateSettings) {
            this.sharedService.iSHELF.settings[this.templateSheet] = 1;
            let errorList = [];
            errorList.push({
                "Message": "Unable to find Worksheet templates",
                "Type": -1,
                "Code": "WorksheetTemplates",
                "SubType": "WorksheetTemplates",
                "IsClientSide": true,
                "PlanogramID": "G"
            });
        } else {
            customData = JSON.parse(templateSettings.KeyValue);
            const allCustomSettings = Object.keys(customData.position);
            this.configuration.customSheets.templatePositionColumns = cloneDeep(allCustomSettings);
            this.configuration.customSheets.templatePositionColumns.unshift("Custom");
            for (let j = 0; j < allCustomSettings.length; j++) {
                let positionColumns: string = allCustomSettings[j];
                this.postionWKSLengthCustom = this.postionWKSLengthCustom + customData.position[positionColumns].length;
                this.mainCustomGridSettings.templatePositionColumns[positionColumns] = [];
                this.worksSheetItrCount = 0;
                for (let i = 0; i < customData.position[positionColumns].length; i++) {
                    gridPositionColoumnsCustom[i] = customData.position[positionColumns][i];
                    this.mainCustomGridSettings = this.workSheetPreparation(positionColumns, gridPositionColoumnsCustom[i], this.postionWKSLengthCustom, this.mainCustomGridSettings, this.templateSheet, this.positionDict);
                }
            }
        }
        //Custom worksheet ending
        this.configuration.fixtureColumnConfig = mainGridFixtureColoumns;
        this.configuration.positionColumnConfig = mainGridPositionColoumns;
        this.configuration.userPositionColumnConfig = mainGridPositionColoumns;
        this.configuration.customColoumnConfig = this.mainCustomGridSettings;
        this.configuration.itemColumnConfig = mainGridInvColoumns;
        this.configuration.inventoryColumnConfig = mainGridInvSettingColoumns;
        //attaching referencing to AppSetting.worksheetGridSettings
        if (this.AppSettingsSvc?.worksheetGridSettings) {
            this.AppSettingsSvc.worksheetGridSettings.fixtureColumns = this.configuration.fixtureColumnConfig;
            this.AppSettingsSvc.worksheetGridSettings.inventorySettings = this.configuration.inventoryColumnConfig;
            this.AppSettingsSvc.worksheetGridSettings.positionColumns = this.configuration.positionColumnConfig;
            this.AppSettingsSvc.worksheetGridSettings.itemColumns = this.configuration.itemColumnConfig;
        }

    }

    private raiseEvents(eventType: string, workSheetLength: number, worksSheetItrCount: number): void {
        this.worksSheetItrCount++;
        if (workSheetLength == this.worksSheetItrCount) {
            this.sharedService.iSHELF.IDBcount++;
            this.sharedService.iSHELF.settings[eventType]++;
        }
    }
    private getDataConfig(gridPositionColoumnCustom: WorksheetColumnsSettings): Dictionary {
        return this.dictConfigService.findById(gridPositionColoumnCustom.IDDictionary);
    }

    private getRecords(workSheetConfiguration: string, girdColumns: WorksheetColumnsSettings, res: Dictionary): WorksheetColumnsSettings {
        let worksheetType: WorksheetType;
        if (workSheetConfiguration.toLowerCase().startsWith('position')) {
            worksheetType = WorksheetType.PositionWS;
        } else if (workSheetConfiguration.toLowerCase().startsWith('fixture')) {
            worksheetType = WorksheetType.FixtureWS;
        } else if (workSheetConfiguration.toLowerCase().startsWith('inventory')) {
            worksheetType = WorksheetType.InventoryWS;
        } else {
            this.log.error(`Unknown worksheet type ${workSheetConfiguration}`);
            return girdColumns;
        }

        let records = this.configurationService.worksheetConfigFromDict(res, worksheetType);
        for (let key in records) {
            girdColumns[key] = records[key];
        }
        return girdColumns;
    }

    private getWorksheet(dataType: string, worksheetType: string, sheetConfig: string): Array<WorksheetColumnsSettings> {
        const settings = this.AppSettingsSvc.allSettingsObj.GetAllSettings.data;
        const workSheetSettings = settings.find(val => val.KeyName === 'WORKSHEET_SETTINGS');
        const data = JSON.parse(workSheetSettings.KeyValue);
        let girdColumns = [];
        const workSheetLength = data[dataType].length;
        let mainGriColoumns = [];
        this.worksSheetItrCount = 0;
        for (let i = 0; i < data[dataType].length; i++) {
            girdColumns[i] = data[dataType][i];
            //Note : will remove this hardcoidng once next pr gets approved
            if (sheetConfig !== "INVWorksheetConfigFromDict")
                mainGriColoumns = this.workSheetPreparation(undefined, girdColumns[i], workSheetLength, mainGriColoumns, worksheetType, sheetConfig);
        }
        return mainGriColoumns;
    }
    private workSheetPreparation(positionColumns: string, gridColoumn: WorksheetColumnsSettings, sheetLen: number, mainGriColoumns: any, worksheetType: string, sheetConfig: string): Array<WorksheetColumnsSettings> {

        if (this.AppSettingsSvc.localStorageIsEnable) {
            const res = this.getDataConfig(gridColoumn);
            if (res) {
                gridColoumn = this.getRecords(sheetConfig, gridColoumn, res);
                this.raiseEvents(worksheetType, sheetLen, this.worksSheetItrCount);
                if (positionColumns) {
                    mainGriColoumns.templatePositionColumns[positionColumns].push(gridColoumn)
                }
                else {
                    mainGriColoumns.push(gridColoumn);
                }
            } else {
                this.raiseEvents(worksheetType, sheetLen, this.worksSheetItrCount);
            }
        } else { // non IDB code execution
            if (gridColoumn.IDDictionary) {
                const res = this.dictConfigService.findById(gridColoumn.IDDictionary); // res is record from Dictionary
                if (res) {
                    gridColoumn = this.getRecords(sheetConfig, gridColoumn, res);
                    this.raiseEvents(worksheetType, sheetLen, this.worksSheetItrCount);
                    if (positionColumns) {
                        mainGriColoumns.templatePositionColumns[positionColumns].push(gridColoumn)
                    }
                    else {
                        mainGriColoumns.push(gridColoumn);
                    }
                } else {
                    this.raiseEvents(worksheetType, sheetLen, this.worksSheetItrCount);
                }
            } else {
                this.raiseEvents(worksheetType, sheetLen, this.worksSheetItrCount);
            }
        }
        return mainGriColoumns;
    }
}