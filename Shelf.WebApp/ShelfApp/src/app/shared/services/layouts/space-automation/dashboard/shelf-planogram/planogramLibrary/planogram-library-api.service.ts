import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IApiResponse, AzureSearchPogs, PogPinningUnpinning, PogUserPinUnpin, ExportPlanogram,
  PogPinningUnpinningResult, Planograms, apiEndPoints,
} from 'src/app/shared/models';
import { ParentApplicationService, SharedService } from 'src/app/shared/services';
import { ConfigService } from '../../../../../common/configuration/config.service';
import { PlanogramSearchData } from 'src/app/shared/models/print';
@Injectable({
  providedIn: 'root'
})

export class PlanogramLibraryApiService {

  constructor(private http: HttpClient,
    private sharedService: SharedService,
    private parentApp: ParentApplicationService,
    private readonly envConfig: ConfigService) { }

  public fetchPLIBAzureResult(postObj: AzureSearchPogs): Observable<IApiResponse<PlanogramSearchData[]>> {
    let headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json');
    headers = headers.append('ignoreLoader', 'true');
    let apiToFetchAzurePlanogramLibrary = `${this.envConfig.shelfapi}/api/Search/SearchPogs`;
    return this.http.post<IApiResponse<PlanogramSearchData[]>>(
      apiToFetchAzurePlanogramLibrary, postObj, { headers }
    );
  }

  public fetchPLIBAzureResultPage(postObj: AzureSearchPogs): Observable<IApiResponse<Planograms[]>> {
    return this.http.post<IApiResponse<Planograms[]>>(
      `${this.envConfig.shelfapi}/api/Search/SearchPogs`, postObj
    );
  }

  public getSuggestPogs(postObj): Observable<Planograms> {
    let searchText = encodeURIComponent(postObj.query);
    let url = `${this.envConfig.shelfapi}/api/Search/SuggestPogs`;
    let urlString = `${url}?term=${searchText}&isAzSearch=${postObj.mode}`;
    return this.http.get<Planograms>(
      urlString
    );
  }

  public pogPinningUnpinning(postObj: PogPinningUnpinning): Observable<IApiResponse<PogPinningUnpinningResult[]>> {
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<PogPinningUnpinningResult[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.pogPinningUnpinning}`, postObj, {headers}
    );
  }

  public getPlanogramsInfo(idsQueryString: string): Observable<IApiResponse<Planograms[]>> {
    return this.http.get<IApiResponse<Planograms[]>>(
       `${this.envConfig.shelfapi}${apiEndPoints.getPlanogramInfo}${idsQueryString}`
    );
  }


  public cleareAutoSavedData(pogId: number): Observable<IApiResponse<number>> {
    return this.http.delete<IApiResponse<number>>(
      '/api/planogram/ClearAutoSaveData?pogId=' + pogId
    );
  }

  public fetchPLIBDefaultResult(senarioId: number): Observable<IApiResponse<{ Planograms: Planograms[] }>> {
    return this.http.get<IApiResponse<{ Planograms: Planograms[] }>>(
      `${this.envConfig.shelfapi}${apiEndPoints.getPlanogramScenariosPogs}${senarioId}`
    );
  }

  public exportPlanogram(data: ExportPlanogram): Observable<IApiResponse<ExportPlanogram>> {
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<ExportPlanogram>>(
      `${this.envConfig.shelfapi}${apiEndPoints.exportPlanogram}`, data , {headers}
    );
  }


  public deletePlanogram(data: number[]): Observable<IApiResponse<number[]>> {
    return this.http.post<IApiResponse<number[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.deletePlanogram}`, data
    );
  }

  public getPOGInfo(ids: number[], hideLoader?: boolean): Observable<IApiResponse<Planograms[]>> {
    let api = `${this.envConfig.shelfapi}${apiEndPoints.getPlanogramInfo}${ids.join('&ids=')}`;

    if (this.sharedService.vmode && this.parentApp.idStore) {
      api = api + '&idStore=' + this.parentApp.idStore;
    }
    let headers = new HttpHeaders();
    if (hideLoader) {
      headers = headers.append('ignoreLoader', 'true');
    }
    return this.http.get<IApiResponse<Planograms[]>>(api, { headers });
  }


  public requestToFavUnfav(postObj: PogUserPinUnpin): Observable<IApiResponse<Planograms[]>> {
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<Planograms[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.pogUserPinUnpin}`, postObj, {headers}
    );
  }

  public renamePlanogram(data: { idPog: number, planogramName: string }): Observable<IApiResponse<string>> {
    const apiUrl = `${this.envConfig.shelfapi}/api/planogram/RenamePlanogram`;
    return this.http.post<IApiResponse<string>>(
      apiUrl, data
    );
  }


}
