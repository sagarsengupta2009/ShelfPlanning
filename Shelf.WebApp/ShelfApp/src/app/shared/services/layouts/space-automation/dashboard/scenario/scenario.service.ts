import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    IApiResponse, apiEndPoints, PlanogramScenario,
    ScenarioStatus, CreatedScenario, UpdatedScenarioStatus, ScenarioStatusCode,
} from 'src/app/shared/models';
import { map } from 'rxjs/operators';
import { ConfigService } from '../../../../common/configuration/config.service'

@Injectable({
    providedIn: 'root',
})
export class ScenarioService {

    constructor(private readonly httpClient: HttpClient, public readonly envConfig: ConfigService) { }

    public GetPlanogramScenarios(): Observable<IApiResponse<PlanogramScenario[]>> {
        const url = this.envConfig.shelfapi + apiEndPoints.getPlanogramScenario;
        return this.httpClient.get<IApiResponse<PlanogramScenario[]>>(url);
    }

    public renameScenario(data: object) {
        return this.httpClient
            .post<IApiResponse<object>>(this.envConfig.shelfapi + apiEndPoints.getUpdateScenarioName, data)
            .pipe(map(response => {
                if (response?.Log?.Summary?.Error) {
                    return response.Log.Details[0].Message;
                }
                return undefined;
            }));
    }

    public deleteScenario(data: PlanogramScenario): Observable<string | undefined> {
        const postData = {
            ScenarioId: data.IdPOGScenario,
        };
        return this.httpClient.post<IApiResponse<object>>(this.envConfig.shelfapi + apiEndPoints.deleteScenario, postData)
            .pipe(map(response => {
                if (response?.Log?.Summary?.Error) {
                    return response.Log.Details[0].Message;
                }
                return undefined;
            }));
    }

    public getUpdateScenarioStatus(idPOGScenario: number, status: ScenarioStatusCode): Observable<IApiResponse<UpdatedScenarioStatus>> {
        const paramsRequest = new HttpParams().set('idPogScenario', idPOGScenario).set('Status', status);
        return this.httpClient.get<IApiResponse<UpdatedScenarioStatus>>(this.envConfig.shelfapi + apiEndPoints.getUpdateScenariostatus, {
            params: paramsRequest,
        });
    }

    public getScenarioStatus(): Observable<IApiResponse<ScenarioStatus[]>> {
        return this.httpClient.get<IApiResponse<ScenarioStatus[]>>(this.envConfig.shelfapi + apiEndPoints.getScenarioStatus);
    }

    public createScenario(scenario: CreatedScenario): Observable<CreatedScenario> {
        return this.httpClient.post<CreatedScenario>(this.envConfig.shelfapi + apiEndPoints.createScenario, scenario);
    }
}
