import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AnalysisReportData, IApiResponse, savedReportData, apiEndPoints } from 'src/app/shared/models';
import { PogDataSource } from 'src/app/shared/models/analysis-report';
import { PlanogramStoreService } from 'src/app/shared/services/common';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
    providedIn: 'root',
})
export class AnalysisReportService {
    constructor(private readonly http: HttpClient, 
        private readonly planogramStore: PlanogramStoreService,
        private readonly envConfig: ConfigService) {}

    public getAnalysisReport(isRefresh: boolean): Observable<IApiResponse<AnalysisReportData>> {
        return this.http.get<IApiResponse<AnalysisReportData>>(
            `${this.envConfig.shelfapi}${apiEndPoints.getAnalysisReport}${this.planogramStore.scenarioId}&isRefresh=${isRefresh}`,
        );
    }

    public getAnalysisReportPogData(url: string): Observable<PogDataSource[]> {
        return this.http.get<PogDataSource[]>(url);
    }

    public deletePivortReport(reportId): Observable<IApiResponse<any>> {
        return this.http.get<IApiResponse<any>>(`${this.envConfig.shelfapi}${apiEndPoints.deletePivotReport}${reportId}`);
    }

    public savePivotReportTemplate(report): Observable<IApiResponse<savedReportData>> {
        let headers = new HttpHeaders();
        headers = headers.append('skipSuccessMsg', 'true');
        return this.http.post<IApiResponse<savedReportData>>(`${this.envConfig.shelfapi}${apiEndPoints.savePivotReportTemplate}`, report, { headers });
    }

    public savePivotGridUserPreference(order: number[]): Observable<IApiResponse<any>> {
        return this.http.post<IApiResponse<any>>(`${this.envConfig.shelfapi}${apiEndPoints.savePivotGridUserPreference}`, order);
    }
}
