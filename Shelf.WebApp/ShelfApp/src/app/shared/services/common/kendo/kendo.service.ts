import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { ConfigService } from '../configuration/config.service';
import { UserService } from '../user/user.service';
import { KendoColumnSetting } from 'src/app/shared/models';

@Injectable({
    providedIn: 'root',
})
export class KendoService {

    constructor(
        private readonly httpClient: HttpClient,
        private readonly config: ConfigService,
        private readonly user: UserService
    ) { }

    public removeConfirmationSubject: Subject<object> = new Subject<object>();

    public updateGridConfig(data: string, gridId: string, ignoreSpinner?: boolean | string): Observable<void> {
        const dataToSend = {};
        dataToSend[`ScreenGridName`] = gridId;
        dataToSend[`ApplicationId`] = 8;
        dataToSend[`columns`] = JSON.parse(data);
        let headers = new HttpHeaders();
        headers.set('Content-Type', 'application/json');
        headers = headers.append('ignoreLoader', ignoreSpinner === 'true' || ignoreSpinner === true ? 'true' : 'false');
        const url = `/api/UserPreference/InsertApplicationGridColumnMapping`;
        return this.httpClient.post<void>(url, dataToSend, { headers });
    }

    public confirmRemove(item: object): void {
        this.removeConfirmationSubject.next(item);
    }

    // TODO @karthik eliminate any once ag-grid config is complete, can eliminate kendo if all grids are migrated.
    public resetGridConfig(columns: KendoColumnSetting[] | any, gridId: string): Observable<void> {
        const headers = new HttpHeaders();
        headers.set('Content-Type', 'application/json');
        const dataToSend = {};
        dataToSend[`ScreenGridName`] = gridId;
        dataToSend[`ApplicationId`] = 1;
        dataToSend[`columns`] = columns;
        dataToSend[`UserId`] = this.user.emailId;
        const url = `/api/common/ResetApplicationGridColumnMapping?code=${this.config.apiKey}&gridid=${gridId}`;
        return this.httpClient.post<void>(url, dataToSend, { headers });
    }

}
