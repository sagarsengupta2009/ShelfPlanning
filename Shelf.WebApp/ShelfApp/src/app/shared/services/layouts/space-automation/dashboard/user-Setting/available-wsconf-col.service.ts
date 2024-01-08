import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConstantSpace } from 'src/app/shared/constants';
import { IApiResponse, WorksheetType, AllSettings, Dictionary, Configuration, apiEndPoints } from 'src/app/shared/models';
import { SharedService, ConfigurationService, DictConfigService } from 'src/app/shared/services';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
    providedIn: 'root',
})
export class AvailableWSConfColService {
    public availableConfiguration: Configuration = {
        availableColumnConfig: [],
        availableFixtureColumnConfig: [],
        availableSectionStatusbarColumnConfig: [],
      //  availableMultiFixtureEditColumnConfig: []
    };

    constructor(
        private readonly sharedService: SharedService,
        private readonly http: HttpClient,
        private readonly envConfig: ConfigService,
        private readonly configurationService: ConfigurationService,
        private readonly dictConfigService: DictConfigService,
    ) {}

    public savePogSettings(data: AllSettings[]): Observable<IApiResponse<void>> {
        // Added 'skipSuccessMsg' as a header option to skip success message (toaster)
        let headers = new HttpHeaders();
        headers = headers.append('skipSuccessMsg', 'true');    
        return this.http.post<IApiResponse<void>>(`${this.envConfig.shelfapi}${apiEndPoints.apiPathSavePogSettings}`,data, { headers: headers });
    }

    public makeAvailableConfigWithDict(): void {
        const data = this.dictConfigService.configurableDataDictionary;
        let availablePositionColoumns: Dictionary[] = [];
        let mainAvailablePositionColoumns: Dictionary[] = [];
        let mainAvailableFixtureColoumns: Dictionary[] = [];
        let mainAvailableSectionStatusbarColoumns: Dictionary[] = [];
        let mainAvailableMultiFixtureEditColumnConfig: Dictionary[] = [];
        //for loop starts
        for (let i = 0; i < data.length; i++) {
            availablePositionColoumns[i] = data[i];
            let res: Dictionary = availablePositionColoumns[i]; // res is record from Dictionary
            if (typeof res != 'undefined' && res.IsDisAllowUserConfig == false) {
                if (res.Owner == AppConstantSpace.FIXTUREOBJ) {
                    let records = this.configurationService.worksheetConfigFromDict(res, WorksheetType.FixtureWS);
                    records.width = '100px';
                    for (let key in records) {
                        availablePositionColoumns[i][key] = records[key];
                    }
                    mainAvailableFixtureColoumns.push(availablePositionColoumns[i]);
                } else if (
                    res.Owner == AppConstantSpace.POSITIONOBJECT ||
                    res.Owner == 'Product' ||
                    res.Owner == 'ProductPackage' ||
                    res.Owner == 'PackageAttributes' ||
                    res.Owner == 'PackageInventoryModel'
                ) {
                    let records = this.configurationService.worksheetConfigFromDict(res, WorksheetType.PositionWS);
                    records.width = '100px';
                    for (let key in records) {
                        availablePositionColoumns[i][key] = records[key];
                    }
                    mainAvailablePositionColoumns.push(availablePositionColoumns[i]);
                } else if (res.Owner === 'Planogram' ||
                           res.Owner === 'POGInventoryModel') {
                    //This is for status bar configuration only.
                    let records = this.configurationService.StatusBarCustomConfigFromDict(res);
                    for (let key in records) {
                        availablePositionColoumns[i][key] = records[key];
                    }
                    mainAvailableSectionStatusbarColoumns.push(availablePositionColoumns[i]);
                }
            }
        }
        this.availableConfiguration.availableColumnConfig = mainAvailablePositionColoumns.sort((a, b) => (a.ShortDescription > b.ShortDescription) ? 1 : -1);
        this.availableConfiguration.availableFixtureColumnConfig = mainAvailableFixtureColoumns.sort((a, b) => (a.ShortDescription > b.ShortDescription) ? 1 : -1);
        this.availableConfiguration.availableSectionStatusbarColumnConfig = mainAvailableSectionStatusbarColoumns.sort((a, b) => (a.ShortDescription > b.ShortDescription) ? 1 : -1);
        this.sharedService.iSHELF.settings.isReady_worksheetColumnConfig = 1;
    }

    public prepareConfigWithDict(): void {
        if (
            !this.availableConfiguration.availableColumnConfig.length ||
            !this.availableConfiguration.availableFixtureColumnConfig.length ||
            !this.availableConfiguration.availableSectionStatusbarColumnConfig.length
        ) {
            this.makeAvailableConfigWithDict();
        }
    }
}
