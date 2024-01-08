import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PogsDelta, SyncDashboardData, IApiResponse, InsertPogSyncData, apiEndPoints} from 'src/app/shared/models';
import { CheckinCheckout } from 'src/app/shared/models/planogram-library';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
  providedIn: 'root'
})
export class SyncPogItemsService {

  constructor(private http: HttpClient,
              private readonly envConfig: ConfigService) { }

  public getSyncDashboardData = (ID : number):Observable<IApiResponse<SyncDashboardData>> => {
    return this.http.get<IApiResponse<SyncDashboardData>>(`${this.envConfig.shelfapi}${apiEndPoints.getSyncDashboardData}${ID}`);
  }

  public getPogsDelta = (data): Observable<IApiResponse<PogsDelta>> => {
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<PogsDelta>>(`${this.envConfig.shelfapi}${apiEndPoints.getPogsDelta}`, data, {headers});
  }

  public insertPogSyncData = (data) : Observable<IApiResponse<InsertPogSyncData>> => {
    return this.http.post<IApiResponse<InsertPogSyncData>>(`${this.envConfig.shelfapi}${apiEndPoints.insertPogSyncData}`, data);
  }
  public requestToCheckInOut(data) : Observable<IApiResponse<CheckinCheckout[]>> {
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<CheckinCheckout[]>>(`${this.envConfig.shelfapi}${apiEndPoints.pogCheckinCheckout}`, data, {headers});
  }
}
