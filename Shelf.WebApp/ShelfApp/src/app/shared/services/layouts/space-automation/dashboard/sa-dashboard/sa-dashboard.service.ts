import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    IApiResponse, apiEndPoints, KendoColumnSetting,
    PlanogramAPIResponse, AllPlanogramResponse,
    PlanogramStatus, LookUpRecords,
    ApplicationSettings, AllDictionaryData, Corporation
} from 'src/app/shared/models';
import { ConfigService, DictConfigService, LanguageService, ParentApplicationService, PlanogramStoreService, SelectedScenarioService, SharedService, _, } from 'src/app/shared/services';
import {
    PLANOGRAM_OBJECT_TEMPLATE_APIS, PACKAGE_ATTRIBUTE_TEMPLATE_API,
    POG_FIXTURE_SEARCH_API, POG_3D_OBJECTS_API, HIERARCHY_API
} from './sa-dashboard-api-config';
import { CellClassParams, ColDef, GetContextMenuItemsParams, ISetFilterParams, KeyCreatorParams, MenuItemDef, ValueFormatterParams } from 'ag-grid-enterprise';
import { DatePipe } from '@angular/common';
import { GridColumnSettings } from 'src/app/shared/components/ag-grid/models';

@Injectable({
    providedIn: 'root',
})
export class SaDashboardService {

    constructor(
        private readonly httpClient: HttpClient,
        private readonly config: ConfigService,
        private readonly parentApp: ParentApplicationService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly selectedScenarioService: SelectedScenarioService,
        private readonly languageService: LanguageService,
        private readonly datePipe: DatePipe
    ) {
    }

    public GetGridColumns(gridName: string): KendoColumnSetting[] {
        // TODO: @malu column config and below data transform missmtch, need to analyse further
        const columns = this.config.getGridColumns(gridName) as any[];
        if (columns) {
            return columns.map((item) => {
                return {
                    field: item[1],
                    title: item[0],
                    width: item[8], // Number(30), // item[``],
                    format: item[10] === `number | float` ? `{0:n}` : null,
                    type: item[10] ? item[10] : `string`,
                    editable: item[9],
                    filterable: {
                        multi: true,
                        search: true,
                    },
                    groupable: item[6] ? item[6] : false,
                    groupOrder: item[6] ? item[7] : 0,
                    hidden: item[3],
                    isactive: item[5],
                    locked: item[4],
                    orderIndex: item[2],
                    description: item[11] ? item[11] : ``,
                    sortable: { initialDirection: item[12] !== `` ? item[12].toLowerCase() : null },
                    style: item[14] && gridName !== 'pogHierarchy-details' ? JSON.parse(item[14]) : '',
                    sortorder: item[12] !== `` ? item[16] : 0,
                    columnMenu: item[`ColumnMenu`] !== undefined ? item[`ColumnMenu`] : true,
                    templateDummy: item[`Template`],
                    IsMandatory: item[`IsMandatory`] !== undefined ? item[`IsMandatory`] : true,
                    ProjectType: item[`ProjectType`] ? item[`ProjectType`].split(`,`) : [`*`],
                    IDDictionary: item[18],
                    SkipTemplateForExport: item[`SkipTemplateForExport`] ? item[`SkipTemplateForExport`] : false,
                    SortByTemplate: item['SortByTemplate'] ? item['SortByTemplate'] : false,
                };
            });
        }
    }

    public getTooltip(gridName: string, columnName: string): { info: string; title: string; } {
        const column = this.config.getGridColumn(gridName, columnName);
        if (column) {
            return { title: column[0], info: column[11] };
        }
        return null;
    }

    public setGridColumns(gridName: string, newColumnsData: KendoColumnSetting[]): void {
        let gridColumns = this.config.getGridColumns(gridName);
        if (gridColumns) {
            let updatedGrid: GridColumnSettings[] = newColumnsData.map((item) => {
                const existingItem = gridColumns.find((x) => x[1] === item[`field`]);
                return {
                    0: item[`title`],
                    1: item[`field`],
                    2: item[`orderIndex`],
                    3: item[`hidden`],
                    4: item[`locked`],
                    5: item[`isactive`], //existingItem ? existingItem[5] : ``,
                    6: item[`groupable`] ? item[`groupable`] : false,
                    7: item[`groupOrder`] ? item[`groupOrder`] : 0,
                    8: item[`width`],
                    9: item[`editable`],
                    10: item[`type`],
                    11: existingItem ? existingItem[11] : ``,
                    12:
                        item[`sortable`] && item[`sortable`][`initialDirection`]
                            ? item[`sortable`][`initialDirection`]
                            : ``,
                    13: existingItem ? existingItem[13] : ``,
                    14: item[`style`]
                        ? _.isEmpty(item[`style`])
                            ? ''
                            : JSON.stringify(item[`style`])
                        : existingItem[`style`],
                    15: existingItem ? existingItem[15] : ``,
                    16: item[`sortorder`] ? item[`sortorder`] : existingItem[16],
                    17: existingItem ? existingItem[17] : 0,
                    18: existingItem ? existingItem[18] : 0,
                    Template: item[`templateDummy`] ? item[`templateDummy`] : ``,
                    filterTemplate: existingItem ? existingItem[`filterTemplate`] : ``,
                    IsMandatory: item[`IsMandatory`] !== undefined ? item[`IsMandatory`] : true,
                    ProjectType: item[`projectType`]
                        ? item[`projectType`][0] === `*`
                            ? null
                            : item[`projectType`].join(',')
                        : null,
                    SkipTemplateForExport: item[`SkipTemplateForExport`] ? item[`SkipTemplateForExport`] : false,
                    SortByTemplate: item['SortByTemplate'],
                    ColumnMenu: item['ColumnMenu'],
                    FilterTemplate: existingItem ? existingItem[`FilterTemplate`] : ``,
                };
            });
            this.config.saveGridColumns(gridName, updatedGrid);
        }
    }
    public setUserPrefGridColumns(gridName: string, newColumnsData: KendoColumnSetting[]): string {
        let gridColumns = this.config.getGridColumns(gridName);
        if (gridColumns) {
            let updatedGrid: GridColumnSettings[] = newColumnsData.map((item) => {
                const existingItem = gridColumns.find((x) => x[1] === item[`field`]);
                return {
                    0: item.title,
                    1: item[`field`],
                    2: item[`orderIndex`],
                    3: !item[`hidden`],
                    4: item[`locked`],
                    5: item[`isactive`],
                    6: item[`groupable`] ? item[`groupable`] : false,
                    7: item[`groupOrder`] ? item[`groupOrder`] : 0,
                    8: item[`width`],
                    9: item[`editable`],
                    10: item[`type`],
                    11: existingItem ? existingItem[11] : ``,
                    12:
                        item[`sortable`] && item[`sortable`][`initialDirection`]
                            ? item[`sortable`][`initialDirection`]
                            : ``,
                    13: existingItem ? existingItem[13] : ``,
                    14: item[`style`]
                        ? _.isEmpty(item[`style`])
                            ? ''
                            : JSON.stringify(item[`style`])
                        : existingItem[`style`],
                    15: existingItem ? existingItem[15] : ``,
                    16: item[`sortorder`] ? item[`sortorder`] : existingItem[16],
                    17: existingItem ? existingItem[17] : 0,
                    18: existingItem ? existingItem[18] : 0,
                    Template: item[`templateDummy`] ? item[`templateDummy`] : ``,
                    FilterTemplate: existingItem ? existingItem[`FilterTemplate`] : ``,
                    IsMandatory: item[`IsMandatory`] !== undefined ? item[`IsMandatory`] : true,
                    ProjectType: item[`ProjectType`]
                        ? item[`ProjectType`][0] === `*`
                            ? null
                            : item[`ProjectType`]
                        : null,
                    SkipTemplateForExport: item[`SkipTemplateForExport`] ? item[`SkipTemplateForExport`] : false,
                    SortByTemplate: item['SortByTemplate'] ? item['SortByTemplate'] : false,
                    ColumnMenu: item['ColumnMenu']
                };
            });
            return JSON.stringify(updatedGrid);
        }
    };

    /** Calling multiple APIs together, so that we get a single response */
    public getAllPlanogramApis(): Observable<AllPlanogramResponse> {
        // TODO: add a transformation to a readable object
        // Common configurations
        let apiConfig = [
            ...PLANOGRAM_OBJECT_TEMPLATE_APIS,
            PACKAGE_ATTRIBUTE_TEMPLATE_API,
            POG_FIXTURE_SEARCH_API,
            POG_3D_OBJECTS_API
        ];

        if (!this.parentApp.isWebViewApp) {
            apiConfig = [
                ...apiConfig,
                HIERARCHY_API,
                {
                    Api: 'GetProjectProductHierarchy',
                    ApiId: 'projectProductHierarchy',
                    Parameters: [{ Parameter: this.planogramStore.scenarioId, Type: 'int32' }],
                },
                {
                    Api: 'GetPlanogramScenariosPogs',
                    ApiId: 'PlanogramScenariosPogs',
                    Parameters: [{ Parameter: this.planogramStore.scenarioId, Type: 'int32' }],
                },
            ];
        }

        const url = `/api/planogram/GetAllPlanogramApis`;
        return this.httpClient.post<IApiResponse<PlanogramAPIResponse>>(url, apiConfig)
            .pipe(map(x => this.toAllPlanogramResponse(x.Data)));
    };

    private toAllPlanogramResponse(response: PlanogramAPIResponse): AllPlanogramResponse {
        //for shelf loading from webview screen will not contain below optional data
        const newResult: AllPlanogramResponse = {
            hierarchy: response.Hierarchy1_GetHierarchy?.data,
            pkgAttrTemplate: response.PkgAttrTemplate_GetPkgAttrTemplate.data,
            planogramScenariosPogs: response.PlanogramScenariosPogs_GetPlanogramScenariosPogs?.data,
            pog3DObjects: response.Pog3DObjects_GetPog3DObjects.data,
            defaultPogFixturesSearch: response.PogFixturesSearch_DefaultPogFixturesSearch.data,
            modularTemplate: response.RenderingModel0_GetObjectRenderingModel.data[0],
            grillsTemplate: response.RenderingModel6_GetObjectRenderingModel.data[0],
            dividerTemplate: response.RenderingModel7_GetObjectRenderingModel.data[0],
            positionTemplate: response.RenderingModel_GetObjectRenderingModel.data[0],
            projectProductHierarchy: response.projectProductHierarchy_GetProjectProductHierarchy?.data,
        };
        /*For Webview, Allocate and AssortNici mode PlanogramScenariosPogs_GetPlanogramScenariosPogs will not be available, 
          so making scenarioPogDataLoaded true*/
        if (response.PlanogramScenariosPogs_GetPlanogramScenariosPogs?.data || this.parentApp.isWebViewApp ||
            this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
            this.selectedScenarioService.scenarioPogDataLoaded = true;
        }

        return newResult;
    }

    public GetLookUpRecords = (): Observable<IApiResponse<LookUpRecords>> => {
        let apiPath;
        const userLanguage = '';
        if (userLanguage != '') { // TODO: What is this code?
            apiPath = `${this.config.shelfapi}${'/api/Lookup/GetLookUpRecords?id='}${userLanguage}`;
        } else {
            apiPath = `${this.config.shelfapi}${'/api/Lookup/GetLookUpRecords?id=en-US'}`;
        }
        return this.httpClient.get<IApiResponse<LookUpRecords>>(apiPath);
    };

    public getPlanogramStatus = (): Observable<IApiResponse<PlanogramStatus[]>> => {
        return this.httpClient.get<IApiResponse<PlanogramStatus[]>>('/api/PlanogramTransaction/GetPlanogramStatus');
    };

    public getCorpList(): Observable<IApiResponse<Corporation>> {
      return this.httpClient.get<IApiResponse<Corporation>>(`${this.config.shelfapi}${apiEndPoints.getCorpList}`);
    }

}
