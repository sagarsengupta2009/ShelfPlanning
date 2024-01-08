import { Injectable} from '@angular/core';
import { Observable } from 'rxjs';
import {  mergeMap, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Performance, apiEndPoints, IApiResponse, POGLibraryListItem, PackageAttributes} from 'src/app/shared/models';
import { SharedService } from '../../common/shared/shared.service';
import { PlanogramService } from '../../common/planogram/planogram.service';
import { PlanogramStoreService } from '../../common';
import { Section } from 'src/app/shared/classes';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';
import { Utils } from 'src/app/shared/constants';


@Injectable({
  providedIn: 'root'
})
export class PlanogramPerformanceService {
  private rootFlags: {};

  constructor(
    private readonly sharedService: SharedService,
    private readonly http: HttpClient,
    private readonly envConfig: ConfigService,
    private readonly planogramService: PlanogramService,
    private readonly planogramStore: PlanogramStoreService
  ) { }

  public initBySectionId(sectionID: string): void {
    this.rootFlags[sectionID] = {};
    let that = this;
    let performancePeriodList = this.planogramStore.lookUpHolder["PerformancePeriod"].options;
    performancePeriodList.forEach((val, index, arr) => {
      that.rootFlags[sectionID][val.value] = false;
    });
  }
  private updateSectionDirtyFlag(pogObj: Section, sectionID: string): void {
      let curObj: POGLibraryListItem = this.sharedService.getObjectFromIDPOG(pogObj.IDPOG);
      if(!curObj.IsReadOnly){
          this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = true;
          this.planogramService.updateSaveDirtyFlag(true);
        }
  };
  public getPerformanceData(sectionID: string, perfID: number):  Observable<IApiResponse<Performance[]>> {
    let that = this;
    let pogObj = this.sharedService.getObject(sectionID, sectionID) as Section;
    let packageAttributes = pogObj.PackageAttributes;
    //if no local exist, lets pull it from server
    return this.getPOGPerformanceData(pogObj.IDPOG, perfID).pipe(tap((performanceData: IApiResponse<Performance[]>) => {
      if (performanceData) {
        that.applyToAllPos(pogObj, performanceData.Data, packageAttributes);
        this.updateSectionDirtyFlag(pogObj,sectionID);
        
      }
    }));
  }

  public getPOGPerformanceData(IDPOG: number, perfID: number): Observable<IApiResponse<Performance[]>> {
    let data = { "idpog": IDPOG, "idperfperiod": perfID }
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<Performance[]>>(`${this.envConfig.shelfapi}${apiEndPoints.getPerformanceData}`, data, { headers });
  }
    private generateUniqueProdIDPackID(idProduct: number,idPackage: number):string{
        const posIdProduct = idProduct.toString();
        const posIdPackage = idPackage.toString(); 
        return `${posIdProduct}@${posIdPackage}`;    
    }

  public applyToAllPos(pogObj, perforData, packageAttributes): void {
    let perforIDs = {};
    for (let posAttributes of perforData) {
      const uniqueProdIDPackID = this.generateUniqueProdIDPackID(posAttributes.IDProduct, posAttributes.IDPackage);
      perforIDs[uniqueProdIDPackID] = posAttributes;
      if (packageAttributes[uniqueProdIDPackID] != undefined) {
        packageAttributes[uniqueProdIDPackID]['CurrAdjGrossProfit'] = posAttributes.AdjGrossProfit;
        packageAttributes[uniqueProdIDPackID]['CurrGrossProfit'] = posAttributes.GrossProfit;
        packageAttributes[uniqueProdIDPackID]['CurrMovt'] = posAttributes.Movt;
        packageAttributes[uniqueProdIDPackID]['CurrMovtAdj'] = posAttributes.MovtAdj;
        packageAttributes[uniqueProdIDPackID]['CurrMovtLY'] = posAttributes.MovtLY;
        packageAttributes[uniqueProdIDPackID]['CurrNoOfStores'] = posAttributes.NoOfStore;
        packageAttributes[uniqueProdIDPackID]['CurrPSW'] = posAttributes.PSW;
        packageAttributes[uniqueProdIDPackID]['CurrSales'] = posAttributes.Sales;
        packageAttributes[uniqueProdIDPackID]['CurrSalesLY'] = posAttributes.SalesLY;
        packageAttributes[uniqueProdIDPackID]['CurrTrueProfit'] = posAttributes.TrueProfit;
        packageAttributes[uniqueProdIDPackID]['ActualMargin'] = posAttributes.ActualMargin;
        packageAttributes[uniqueProdIDPackID]['Cost'] = posAttributes.Cost;
        packageAttributes[uniqueProdIDPackID]['Profit'] = posAttributes.Profit; 
        packageAttributes[uniqueProdIDPackID]['Retail'] = posAttributes.Retail;
      }
    }
    let allPos = pogObj.getAllPositions();
    allPos.forEach((itm) => {
      let uniqueProdIDPackID = this.generateUniqueProdIDPackID(itm.Position.IDProduct, itm.Position.IDPackage);
      if (packageAttributes[uniqueProdIDPackID] && perforIDs[uniqueProdIDPackID]) {
        itm.Position.attributeObject.CurrAdjGrossProfit = packageAttributes[uniqueProdIDPackID]['CurrAdjGrossProfit'];
        itm.Position.attributeObject.CurrGrossProfit = packageAttributes[uniqueProdIDPackID]['CurrGrossProfit'];
        itm.Position.attributeObject.CurrMovt = packageAttributes[uniqueProdIDPackID]['CurrMovt'];
        itm.Position.attributeObject.CurrMovtLY = packageAttributes[uniqueProdIDPackID]['CurrMovtLY'];
        itm.Position.attributeObject.CurrNoOfStores = packageAttributes[uniqueProdIDPackID]['CurrNoOfStores'];
        itm.Position.attributeObject.CurrPSW = packageAttributes[uniqueProdIDPackID]['CurrPSW'];
        itm.Position.attributeObject.CurrSalesLY = packageAttributes[uniqueProdIDPackID]['CurrSalesLY'];
        itm.Position.attributeObject.CurrTrueProfit = packageAttributes[uniqueProdIDPackID]['CurrTrueProfit'];
        itm.Position.attributeObject.CurrMovtAdj = packageAttributes[uniqueProdIDPackID]['CurrMovtAdj'];
        itm.Position.attributeObject.CurrSales = packageAttributes[uniqueProdIDPackID]['CurrSales'];
        itm.Position.attributeObject.ActualMargin = packageAttributes[uniqueProdIDPackID]['ActualMargin'];
        itm.Position.attributeObject.Cost = packageAttributes[uniqueProdIDPackID]['Cost'];
        itm.Position.attributeObject.Profit = packageAttributes[uniqueProdIDPackID]['Profit'];
        itm.Position.attributeObject.Retail = packageAttributes[uniqueProdIDPackID]['Retail'];
      }

    });
    perforIDs = null;
  }


  public applyPerformanceData (sectionID: string, perfID: number, perfData): void {
    let pogObj = this.sharedService.getObject(sectionID, sectionID) as  Section;
    let packageAttributes = pogObj.PackageAttributes;
    let that = this;

    //manual
    if (perfID === -1) {
      for (let [key,posAttributesData] of Object.entries(packageAttributes)) {
        if (posAttributesData && !Utils.isNullOrEmpty(posAttributesData['ManualPerfData'])) {
          const manualPerfDataObj = JSON.parse(posAttributesData['ManualPerfData']);
          posAttributesData['CurrAdjGrossProfit'] = manualPerfDataObj.CurrAdjGrossProfit;
          posAttributesData['CurrGrossProfit'] = manualPerfDataObj.CurrGrossProfit;
          posAttributesData['CurrMovt'] = manualPerfDataObj.CurrMovt;
          posAttributesData['CurrMovtAdj'] = manualPerfDataObj.CurrMovtAdj;
          posAttributesData['CurrMovtLY'] = manualPerfDataObj.CurrMovtLY;
          posAttributesData['CurrNoOfStores'] = manualPerfDataObj.CurrNoOfStores;
          posAttributesData['CurrPSW'] = manualPerfDataObj.CurrPSW;
          posAttributesData['CurrSales'] = manualPerfDataObj.CurrSales;
          posAttributesData['CurrSalesLY'] = manualPerfDataObj.CurrSalesLY;
          posAttributesData['CurrTrueProfit'] = manualPerfDataObj.CurrTrueProfit;
          posAttributesData['ActualMargin'] = manualPerfDataObj.ActualMargin;
          posAttributesData['Cost'] = manualPerfDataObj.Cost;
          posAttributesData['Profit'] = manualPerfDataObj.Profit; 
          posAttributesData['Retail'] = manualPerfDataObj.Retail;
        }
      }
    } else if (perfID === 0) {   //recommended
      for (let [key,posAttributes]  of Object.entries(packageAttributes)) {
        posAttributes['CurrAdjGrossProfit'] = null;
        posAttributes['CurrGrossProfit'] = null;
        posAttributes['CurrMovt'] = null;
        posAttributes['CurrMovtAdj'] = null;
        posAttributes['CurrMovtLY'] = null;
        posAttributes['CurrNoOfStores'] = posAttributes.RecNoOfStores;
        posAttributes['CurrPSW'] = posAttributes.RecPSW;
        posAttributes['CurrSales'] = null;
        posAttributes['CurrSalesLY'] = null;
        posAttributes['CurrTrueProfit'] = null;
        posAttributes['ActualMargin'] = null;
        posAttributes['Cost'] = null;
        posAttributes['Profit'] = null; 
        posAttributes['Retail'] = null;
      }      
    } else {
       that.applyToAllPos(pogObj, perfData, packageAttributes);     
    }
    this.updateSectionDirtyFlag(pogObj,sectionID);
  }

  public cleanBySectionId(sectionID: string): void {
    if (this.rootFlags && this.rootFlags[sectionID])
      delete this.rootFlags[sectionID]
  }

  public getPOGPerformanceCalculation(pogId: number,perfPeriod:number): Observable<IApiResponse<Performance[]>> {
    return this.http.post<IApiResponse<Performance>>(`${this.envConfig.shelfapi}${apiEndPoints.apiPathToGetPerformanceCalculation}`, [pogId]).pipe(mergeMap((res)=>{
        return this.getPOGPerformanceData(pogId,perfPeriod);
    }));
  }

}
