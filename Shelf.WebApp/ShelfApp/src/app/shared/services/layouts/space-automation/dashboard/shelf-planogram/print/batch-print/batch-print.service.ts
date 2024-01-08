import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IApiResponse, apiEndPoints } from 'src/app/shared/models';
import { BatchPrintAccess, BatchReport } from 'src/app/shared/models/print/batch-print';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
    providedIn: 'root',
})
export class BatchPrintService {
    constructor(private readonly httpClient: HttpClient,
        private readonly envConfig: ConfigService) {}

    public getReportsInBatch(data): Observable<IApiResponse<BatchPrintAccess>> {
        return this.httpClient.post<IApiResponse<BatchPrintAccess>>(`${this.envConfig.shelfapi}${apiEndPoints.getReportsInBatch}`, data);
    }
    public getReportList(PogIdsList): Observable<IApiResponse<BatchReport[]>> {
        let data = { IDpogs: PogIdsList, IdStores: [] };
        let headers = new HttpHeaders();
        headers = headers.append('skipSuccessMsg', 'true');
        return this.httpClient.post<IApiResponse<BatchReport[]>>(`${this.envConfig.shelfapi}${apiEndPoints.apiToGetReportList}`, data, {headers});
    }
}
