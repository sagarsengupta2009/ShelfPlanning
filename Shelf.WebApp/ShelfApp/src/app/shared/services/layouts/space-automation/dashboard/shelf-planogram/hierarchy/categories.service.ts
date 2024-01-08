import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IntlService } from '@progress/kendo-angular-intl';
import { PlanogramStoreService, _ } from 'src/app/shared/services';
import {
    HierarchyGridData, HierarchyPlanogramResponse,
    IApiResponse, PlanogramHierarchyState, apiEndPoints,
} from 'src/app/shared/models';
import { map } from 'rxjs/operators';
import { IGetRowsParams } from 'ag-grid-enterprise';
import { DatePipe } from '@angular/common';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
    providedIn: 'root',
})
export class CategoriesService {

    constructor(
        private readonly http: HttpClient,
        private readonly planogramStore: PlanogramStoreService,
        private readonly pipe: DatePipe,
        private readonly envConfig: ConfigService,
    ) { }

    public getPlanogramDetailsByHierarchy(gridState: IGetRowsParams, pogHierId): Observable<HierarchyGridData> {
        let listOfFilters = [];
        Object.keys(gridState?.filterModel)?.forEach((fields) => {
            let values = gridState?.filterModel[fields]['filterModels'].map(x => x.filterType === 'date' ? this.pipe.transform(new Date(x?.dateFrom), 'dd MMM yyyy', 'en-US') : x?.filter || x?.values);
            if (typeof values[0] !== 'string' && typeof values[0] !== 'number') {
                values = values[0];
            }
            listOfFilters.push({
                Filter: fields,
                FilterValues: values
            });
        });
        const objforserverData: PlanogramHierarchyState = {
            MultiSort: gridState?.sortModel?.map(x => {
                return {
                    Key: x.colId,
                    Value: x.sort.toLocaleUpperCase()
                }
            }) || [],
            PogHierID: pogHierId,
            PageSize: 50,
            Skip: gridState?.startRow / 50 || 0,
            SortOrder: gridState?.sortModel?.[0]?.sort?.toLocaleUpperCase() || '',
            SortBy: gridState?.sortModel?.[0]?.colId || '',
            Filters: listOfFilters || [],
            IsRecursive: this.planogramStore.appSettings.loadPogFromChild,
        }

        return this.getHierarchyGridData(objforserverData);
    }

    private getHierarchyGridData(state: PlanogramHierarchyState): Observable<HierarchyGridData> {
        let headers = new HttpHeaders();
        headers = headers.append('skipSuccessMsg', 'true');
        const url = `${this.envConfig.shelfapi}${apiEndPoints.getPlanogramDetailsByHierarchy}`;
        return this.http.post<IApiResponse<HierarchyPlanogramResponse>>(url, state, {headers})
            .pipe(map(response => this.toHierarchyGridData(response)));
    }

    private toHierarchyGridData(response: IApiResponse<HierarchyPlanogramResponse>) {
        return <HierarchyGridData>{
            data: response.Data?.Data?.Planograms,
            total: response.Data?.Total,
        };
    }
}
