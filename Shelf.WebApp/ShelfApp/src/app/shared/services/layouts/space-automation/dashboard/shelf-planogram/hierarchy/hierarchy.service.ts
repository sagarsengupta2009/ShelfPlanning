import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IApiResponse } from '../../../../../../models/apiResponseMapper';
import { Hierarchy, HierarchyChildren, apiEndPoints } from 'src/app/shared/models';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
    providedIn: 'root',
})
export class HierarchyService {
    constructor(private readonly http: HttpClient,
        private readonly envConfig: ConfigService) {}

    private urlObj = {
        planogramapi: '/api/planogram/GetPlanogramByHier?pogHierID=',
    };

    public hierarchy(): Observable<IApiResponse<Hierarchy>> {
        return this.http.get<IApiResponse<Hierarchy>>(`${this.envConfig.shelfapi}${apiEndPoints.getHierachy}`);
    }

    public gethierarchyChildren(id, haschildren): Observable<IApiResponse<HierarchyChildren[]>> {
        let param = id + '&isImmediateChildren=' + haschildren;
        return this.http.get<IApiResponse<HierarchyChildren[]>>(`${this.envConfig.shelfapi}${apiEndPoints.apiTOGetHierarchyChildren}${param}`);
    }

    public getImmediateChildren(corpID, isImmediateChildren): Observable<IApiResponse<HierarchyChildren[]>> {
        let param = 'id=' + corpID + '&isImmediateChildren=' + isImmediateChildren;
        return this.http.get<IApiResponse<HierarchyChildren[]>>(`${this.envConfig.shelfapi}${apiEndPoints.apiTOGetHierarchyBasedOnCorp}${param}`);
    }
}
