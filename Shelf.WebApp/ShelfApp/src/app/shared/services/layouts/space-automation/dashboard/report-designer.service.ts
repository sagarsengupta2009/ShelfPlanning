import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

import { BehaviorSubject, Observable, Subject } from 'rxjs';

import { apiEndPoints } from 'src/app/shared/models/apiEndPoints';
import { IApiResponse } from 'src/app/shared/models/apiResponseMapper';
import { BusinessRulesForReport, ReportDatasources, ReportTemplateList } from 'src/app/shared/models/report-designer';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
  providedIn: 'root'
})
export class ReportDesignerService {
  public addNewTemplate = new Subject<boolean>();
  public showBusinessRule = new Subject<boolean>();
  public showReportDesigner = new Subject<boolean>();
  public url = new Subject<SafeResourceUrl>();


  constructor(private readonly http: HttpClient,
    private readonly envConfig: ConfigService) { }

  public GetReportDatasources = (): Observable<IApiResponse<ReportDatasources[]>> => {
    return this.http.get<IApiResponse<ReportDatasources[]>>(`${this.envConfig.shelfapi}${apiEndPoints.apiToGetReportDatasources}`);
  }

  public getReportType = (isCustom: boolean): Observable<IApiResponse<ReportTemplateList[]>> => {
    return this.http.get<IApiResponse<ReportTemplateList[]>>(`${this.envConfig.shelfapi}${apiEndPoints.apiToGetTemplateReportList}${isCustom}`);
  }

  public GetBusinessRuleDatasources = (): Observable<IApiResponse<BusinessRulesForReport[]>> => {
    return this.http.get<IApiResponse<BusinessRulesForReport[]>>(`${this.envConfig.shelfapi}${apiEndPoints.apiToGetBusinessRuleDatasources}`)
  }
}
