import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { IApiResponse } from '../../../../../../models/apiResponseMapper';
import {
  NodeData, HierarchyStoreData,
  SelectedStoreData, ClonedData
} from '../../../../../../models';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';
import { apiEndPoints } from 'src/app/shared/models/apiEndPoints';
@Injectable({
  providedIn: 'root'
})
export class ClonePlanogramService {

  constructor(private http: HttpClient,private readonly envConfig: ConfigService) { }

  public getpogstores = (idPog: number, scenarioID: number) => {
    return this.http.get<IApiResponse<SelectedStoreData[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.getpogstores}${'?idPog='}${idPog}${'&idPogScenario='}${scenarioID}`
    );
  }

  public getStoreHierarchy = (): Observable<NodeData[]> =>  {
    return this.http.get<NodeData[]>(
      '/api/I2EStore/GetStoreHierarchy/?hierarchyGroupId=-1'
    );
  }

  public postCloneData = (obj: object): Observable<IApiResponse<ClonedData[]>> => {
    return this.http.post<IApiResponse<ClonedData[]>>(
      '/api/planogram/Clone', obj
    );
  }

  public getStores = (IdHierStr: number): Observable<HierarchyStoreData> => {
    return this.http.get<HierarchyStoreData>(
      '/api/I2EStore/GetStores/?storeHierarchyId=' + IdHierStr);
  }

  public clonePlanograms = (data): Observable<IApiResponse<ClonedData[]>> => {
    return this.http.post<IApiResponse<ClonedData[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.clonePlanograms}`, data);
  }

  public saveStores = (data): Observable<IApiResponse<any>> => {
    return this.http.post<IApiResponse<any>>(
      `${this.envConfig.shelfapi}${'/api/pogstore/AssignPogsToStore'}`, data);
  }

}
