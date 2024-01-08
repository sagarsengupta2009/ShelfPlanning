import { Injectable } from '@angular/core';
import {
    ApplicationSettings, DownloadedPog, AllPlanogramResponse,
    SplitterViewMode, StoreAppSettings,
    PogInfo, POGLibraryListItem, LookUpRecords,
    PositionObjectResponse, FixtureObjectResponse, PkgAttrTemplate,
    PlanogramScenariosPogs, Planograms, ProjectProductHierarchy,
    Hierarchy
} from '../../models';
import { SplitterService } from '../layouts/space-automation/dashboard/splitter/splitter.service';
export type Mapper = PogInfo & { cached: boolean; pinned: boolean; rowKey: string; };

@Injectable({
    providedIn: 'root',
})
export class PlanogramStoreService {
    public scenarioId: number = -1;
    public projectId: number = -1;
    public loadPogId: number;
    public assortResetScenarioId: number = -1;
    public readOnlyMode: boolean = false;
    public downloadedPogs: DownloadedPog[] = [];
    public implemenationDateDisable: string;

    // TODO: @malu find the actual type, PinnedPlanogramScenarioPog most places.
    // Once assigned, panal-header.component.ts pog.pinned assignments will have error.
    // These are the same:
    //      this.planogramStore.mappers
    //      this.planogramStore.scenariosPogs
    //      this.planogramLibService.mapper
    //      this.planogramLibService.mapperForVmode
    //      this.allPlanogramApisData.planogramScenariosPogs
    // Once the duplicates are removed, delete: this.updateScenarioPlanograms() and this.scenariosPogs
    // Why is the shelf-planogram.component.ts gridData looks like a useless field passed down to child components.
    // Couldn't find any use to it
    public mappers: POGLibraryListItem[] = [];

    public allPlanogramApisData: AllPlanogramResponse = null;
    public splitterViewMode: SplitterViewMode = this.empty();
    public lookUpHolder: LookUpRecords = this.empty();
    public get allSettings(): ApplicationSettings {
        return this.appSettings?.allSettingsObj;
    }
    public appSettings: StoreAppSettings = this.empty();
    public selectedPogInfo: Mapper = this.empty();
    public activeSelectedPog: POGLibraryListItem = this.empty();
    public allOrientationGroups = [];

    // TODO @og revisit the initialization when the overall code is more clear
    // and we know what is the correct initialization values if it has to be added here
    // kept the same initialization as before typing to avoid acessing an unitialized value
    // lets say userInfo is populated by some asynchronous service, but another component
    // uses userInfo.Email in html, if not initialized with an empty object then it will cause
    // access of undefined runtime error

    /**
     *
     */
    constructor(private readonly splitterService: SplitterService) {
        this.splitterViewMode = {
            displayMode: this.splitterService.getSplitterView(),
            syncMode: true
        };
    }

    private empty(): any {
        return {};
    }

    public getPogById(id: number): DownloadedPog | undefined {
        return this.downloadedPogs.find(it => it.IDPOG == id);
    }

    /** update pog by id if it exists otherwise creates a new one and then returns it */
    public upsertPog(data: ({ IDPOG: number } & Partial<DownloadedPog>)): DownloadedPog {
        const pog = this.getPogById(data.IDPOG);
        if (pog) {
            Object.assign(pog, data);
            return pog;
        } else {
            this.downloadedPogs.push(data);
            return data;
        }
    }

    public updatePogById(id: number, data: Partial<DownloadedPog>) {
        const pog = this.downloadedPogs.find(it => it.IDPOG == id);
        if (pog) {
            Object.assign(pog, data);
        }
    }

    public removePogById(id: number): void {
        this.downloadedPogs = this.downloadedPogs.filter(it => it.IDPOG !== id);
    }

    public getLookupdata(): LookUpRecords {
        return this.lookUpHolder;
    }

    public get positionTemplate(): PositionObjectResponse {
        return this.allPlanogramApisData.positionTemplate;
    }
    public get modularTemplate(): FixtureObjectResponse {
        return this.allPlanogramApisData.modularTemplate;
    }
    public get dividerTemplate(): FixtureObjectResponse {
        return this.allPlanogramApisData.dividerTemplate;
    }
    public get grillsTemplate(): FixtureObjectResponse {
        return this.allPlanogramApisData.grillsTemplate;
    }
    public get packageAttrDefaultTemplate(): PkgAttrTemplate {
        return this.allPlanogramApisData.pkgAttrTemplate;
    }

    // shelf-planogram.component.ts - updateStateOnCreate()
    // TODO: @malu Is this another copy of  this.planogramStore.mappers?
    public get scenariosPogs(): PlanogramScenariosPogs {
        return this.allPlanogramApisData.planogramScenariosPogs;
    }
    public updateScenarioPlanograms(value: Planograms[]) {
        this.allPlanogramApisData.planogramScenariosPogs.Planograms = value;
    }

    public get projectProductHierarchy(): ProjectProductHierarchy {
        return this.allPlanogramApisData.projectProductHierarchy;
    }
    public get hierarchy(): Hierarchy {
        return this.allPlanogramApisData.hierarchy;
    }

    public isNiciFeatureNoAllowed(featureName: string): boolean {
        const isNotAllowed = this.appSettings?.NICIFeatureNoAllow
            ? this.appSettings.NICIFeatureNoAllow[featureName]
            : false;
        return isNotAllowed;
    }

    public DateFormat(date:string): string {
        let arr = date.split(/[-/]+/);
        if(date.indexOf('-') !== -1) {
            return arr ? ('0' + arr[1]).slice(-2) + '/' + ('0' + arr[2]).slice(-2) + '/' + arr[0] : null;
        }
        else if(date.indexOf('/') !== -1){
            return arr ? ('0' + arr[1]).slice(-2) + '/' + ('0' + arr[0]).slice(-2) + '/' + arr[2] : null;
        }
    }
}
