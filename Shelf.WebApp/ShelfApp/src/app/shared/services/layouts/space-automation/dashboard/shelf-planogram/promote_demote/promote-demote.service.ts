import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IApiResponse } from '../../../../../../models/apiResponseMapper';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PromoteDataList, PogPromoteDemote, PogCheckinCheckout, apiEndPoints } from 'src/app/shared/models';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
    providedIn: 'root',
})
export class PromoteDemoteService {
    private apiEndPoints = {
        apitogetLogs: '/api/planogram/GetLogs?pogIds=',
        promoteReport: '/api/pdfreport/GeneratePromoteBRReport',
    };

    constructor(private http: HttpClient,
        private readonly envConfig: ConfigService
        ) {}

    public pogCheckinCheckout(obj): Observable<IApiResponse<PogCheckinCheckout>> {
      let headers = new HttpHeaders();
      headers = headers.append('skipSuccessMsg', 'true');
      return this.http.post<IApiResponse<PogCheckinCheckout>>(`${this.envConfig.shelfapi}${apiEndPoints.pogCheckinCheckout}`, obj, {headers});
    }

    public pogPromoteDemote(obj): Observable<IApiResponse<PogPromoteDemote>> {
        let headers = new HttpHeaders();
        headers = headers.append('skipSuccessMsg', 'true');
        return this.http.post<IApiResponse<PogPromoteDemote>>(`${this.envConfig.shelfapi}${apiEndPoints.promoteapi}`, obj, {headers});
    }

    public getLogs(IdpogList): Observable<IApiResponse<number>> {
        return this.http.get<IApiResponse<number>>(this.apiEndPoints.apitogetLogs + IdpogList);
    }

    public getPromoteData(obj): Observable<IApiResponse<PromoteDataList>> {
      let headers = new HttpHeaders();
      headers = headers.append('skipSuccessMsg', 'true');
        return this.http.post<IApiResponse<PromoteDataList>>(`${this.envConfig.shelfapi}${apiEndPoints.apiPathGetPromoteData}`, obj, {headers});
    }

    public getPromoteBRReport(dataItem): Observable<IApiResponse<string>> {
        return this.http.get<IApiResponse<string>>(
            `${this.apiEndPoints.promoteReport}?idPog=${dataItem.IdPog}&brCode=${dataItem.Code}`,
        );
    }
}
