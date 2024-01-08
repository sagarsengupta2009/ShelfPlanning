import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IApiResponse } from '../../../../../../models/apiResponseMapper';
import { HttpClient } from '@angular/common/http';
import { ItemsAddDelete, LookUpChildOptions, apiEndPoints } from '../../../../../../models';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
    providedIn: 'root',
})
export class ImportTemplateService {
    constructor(private http: HttpClient,
        private readonly envConfig: ConfigService) {}

    public importItems = (data): Observable<IApiResponse<ItemsAddDelete>> => {
        return this.http.post<IApiResponse<ItemsAddDelete>>(`${this.envConfig.shelfapi}${apiEndPoints.importItems}`, data);
    };
}
