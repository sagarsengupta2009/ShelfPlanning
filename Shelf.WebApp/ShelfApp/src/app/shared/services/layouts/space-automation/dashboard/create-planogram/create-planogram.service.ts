import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import * as _ from 'lodash';
import { HistoryService, PlanogramStoreService, PlanogramCommonService, UprightService } from 'src/app/shared/services/';
import { Utils } from 'src/app/shared/constants/utils';
import {
  apiEndPoints, IApiResponse, UprightType,
  Store, StoreHierarchyView, Stores, Planogram,
  PogTemplate,
  SectionResponse,
  SelectedStoreData,
} from 'src/app/shared/models';
import { DeletePogTemplateResponseVM, PogTemplateRequestVM } from 'src/app/shared/models/planogram/';
import { Section } from 'src/app/shared/classes/section';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service'
@Injectable({
  providedIn: 'root'
})
export class CreatePlanogramService {
  public updateSelection = new Subject<Store[]>();
  private sectionID;
  private allBays;
  private allFixtures;
  public selectedStores: {id: number, selectedStoes: SelectedStoreData[] | Store[]}[] = [];

  constructor(
    private readonly httpClient: HttpClient,
    private readonly planogramStore: PlanogramStoreService,
    private readonly planogramCommonService: PlanogramCommonService,
    private readonly historyService: HistoryService,
    private readonly uprightService: UprightService,
    private readonly envConfig: ConfigService
  ) { }

  //Getting System Section Templates
  public getAllTemplateList(): Observable<IApiResponse<Array<PogTemplate>>> {
    return this.httpClient.get<IApiResponse<Array<PogTemplate>>>(`${this.envConfig.shelfapi}${apiEndPoints.getPogTemplates}`);
  }

  public getHierarchyBasedOnCorp(corpID: number, isImmediateChildren: boolean): Observable<IApiResponse<Array<PogTemplate>>> {
    return this.httpClient.get<IApiResponse<Array<PogTemplate>>>(`${this.envConfig.shelfapi}${apiEndPoints.apiTOGetHierarchyChildren}${corpID}${'&isImmediateChildren='}${isImmediateChildren}`)
  }

  public getStoreHierarchyLevels(): Observable<Array<StoreHierarchyView>> {
    return this.httpClient.get<Array<StoreHierarchyView>>(apiEndPoints.apiTogetStoreHierarchyLevels);
  }

  public getHierarchyStores(ID: number): Observable<Stores> {
    return this.httpClient.get<Stores>(apiEndPoints.apiToGetHierarchyStores + ID);
  }

  public getSectionTemplate(data: PogTemplateRequestVM): Observable<IApiResponse<SectionResponse>> {
    return this.httpClient.post<IApiResponse<SectionResponse>>(apiEndPoints.apiToCreateTemplate, data);
  }

  public getSectionTemplateData(data: PogTemplateRequestVM): Observable<IApiResponse<Planogram>> {
    return this.httpClient.get<IApiResponse<Planogram>>(apiEndPoints.apiToGetTemplateData + data.IdPog);
  }

  public deletePogTemplates(data: number[]): Observable<IApiResponse<Array<DeletePogTemplateResponseVM>>> {
    //only return the IAPIResponse
    return this.httpClient.post<IApiResponse<Array<DeletePogTemplateResponseVM>>>(`${this.envConfig.shelfapi}${apiEndPoints.apiToDeletePogTemplates}`, { idPogs: data });
  }

  public appendSection(toDatasource: Section, newDatasource: Planogram) {
    //Add additional dimensions to the active section
    //Check if both datasources has modulars or not, if not create new modular and append
    //Push the additional modular to the datasource children
    this.sectionID = toDatasource.$sectionID;
    let oldChild;
    const oldDimen = {...toDatasource.Dimension};
    const oldFitCheck = toDatasource.fitCheck;
    toDatasource.fitCheck ? toDatasource.fitCheck = false : '';

    if (newDatasource.ModularCount <= 0 && toDatasource.ModularCount > 0) {
      //get modular template
      let modularTemplate = this.planogramStore.modularTemplate;
      newDatasource.isBayPresents = true;
      let clonedModularTemplate = Object.assign(modularTemplate);
      clonedModularTemplate.Fixture.Height = newDatasource.Dimension.Height;
      clonedModularTemplate.Fixture.Width = newDatasource.Dimension.Width;
      clonedModularTemplate.Fixture.Depth = newDatasource.Dimension.Depth;
      clonedModularTemplate.IsLikePosition = false;
      clonedModularTemplate.IsMerchandisable = false;
      clonedModularTemplate.IsMovable = true;
      clonedModularTemplate.Fixture.IsMerchandisable = false;
      clonedModularTemplate.Fixture.IsMovable = true;

      //add modular related required info to the cloned objec
      clonedModularTemplate.ChildDimension = newDatasource.Dimension;
      clonedModularTemplate.ChildOffset = { X: 0, Y: 0, Z: 0 };
      clonedModularTemplate.Dimension = newDatasource.Dimension;
      clonedModularTemplate.Rotation = { X: 0, Y: 0, Z: 0 };
      clonedModularTemplate.RotationOrigin = { X: 0, Y: 0, Z: 0 };
      clonedModularTemplate.IDPOGObject = null;
      clonedModularTemplate.Fixture.IDPOGObject = null;
      clonedModularTemplate.IDPOGObjectParent = null;
      clonedModularTemplate.Children = newDatasource.Children.filter(obj => {
        Utils.checkIfFixture(obj) && !Utils.checkIfShoppingCart(obj);
      });
      newDatasource.Children = [clonedModularTemplate];
      newDatasource.ModularCount = 1;
    }
    if (newDatasource.ModularCount > 0 && toDatasource.ModularCount > 0) {
      this.allBays = [];
      let allSecBays = this.getAllBays(toDatasource, newDatasource, null);

      if (toDatasource.uprightType == UprightType.Variable) {
        // TODO: @malu should be able to use toDatasource.uprightIntervals
        let upright = toDatasource.Upright.split(',').map(arr => Number(arr));
        if (upright.length > 1) {
          const appendedSectionUprights = newDatasource.Upright.split(',').map(arr => Number(arr));
          if(appendedSectionUprights.length > 1) {
            upright.push(...newDatasource.Upright.split(',').map(arr => Utils.preciseRound(Number(arr) + toDatasource.Dimension.Width, 2)));
          } else {
            let uprightCntForAppendedSection = newDatasource.Dimension.Width / Number(newDatasource.Upright);
            while(uprightCntForAppendedSection !== 0) {
              upright.push(...newDatasource.Upright.split(',').map(arr => Utils.preciseRound(Number(arr) + toDatasource.Dimension.Width, 2)));
              toDatasource.Dimension.Width += Number(newDatasource.Upright); 
              uprightCntForAppendedSection--;
            }
          }
          upright=this.uprightService.clean(upright);
          toDatasource.Upright = upright.toString();
          toDatasource.uprightIntervals = upright;
        }
      }

      toDatasource.Dimension.Height = Math.max(newDatasource.Dimension.Height, toDatasource.Dimension.Height);
      toDatasource.Dimension.Depth = Math.max(newDatasource.Dimension.Depth, toDatasource.Dimension.Depth);
      allSecBays.forEach((child) => {
        let addLeft;
        const index = addLeft ? 0 : toDatasource.Children.length;
        child.Dimension.Height = toDatasource.Dimension.Height;
        child.Fixture.Height = toDatasource.Dimension.Height;
        child.Dimension.Depth = toDatasource.Dimension.Depth;
        child.Fixture.Depth = toDatasource.Dimension.Depth;
        toDatasource.addModularByIndex([{ "index": index, "bay": child }]);
        const revert = ((old, index, dimens, fitcheck) => {
          return () => {
            old.removeModularByIndex([index]);
            old.Dimension.Height = dimens.Height;
            old.Dimension.Width = dimens.Width;
            old.Dimension.Depth = dimens.Depth;
            old.fitCheck = fitcheck;
            this.uprightService.updateUpright(old, old.Upright);
          }
        })(toDatasource, { 'index': toDatasource.Children.length, "$id": child.$id }, oldDimen, oldFitCheck);

        const original = ((old, bay, dimens, fitcheck) => {
          return () => {
            old.addModularByIndex([bay]);
            old.Dimension.Height = dimens.Height;
            old.Dimension.Width = dimens.Width;
            old.Dimension.Depth = dimens.Depth;
            old.fitCheck = fitcheck;
            this.uprightService.updateUpright(old, old.Upright);
          }
        })(toDatasource, { 'index': toDatasource.Children.length, "bay": child }, {...toDatasource.Dimension}, toDatasource.fitCheck);

        this.historyService.captureActionExec({
          'funoriginal': original,
          'funRevert': revert,
          'funName': 'Append'
        });
      });
      if (toDatasource.uprightType === UprightType.Variable) {
        const upright = this.uprightService.clean(toDatasource.uprightIntervals);
        toDatasource.Upright = upright.toString();
      }
    } else if (toDatasource.ModularCount <= 0) {
      this.allFixtures = [];
      let allSecFixtures = this.getAllFixtures(toDatasource, newDatasource, null);
      const refWidth = toDatasource.Dimension.Width;
      toDatasource.Dimension.Width = Utils.preciseRound(newDatasource.Dimension.Width + toDatasource.Dimension.Width, 2);
      toDatasource.Dimension.Height = Math.max(newDatasource.Dimension.Height, toDatasource.Dimension.Height);
      allSecFixtures.forEach((child) => {
        child.Fixture.SnapToLeft = false;
        child.Fixture.SnapToRight = false;
        child.addFixtureFromGallery(toDatasource, refWidth + child.Location.X, child.Location.Y, child.Dimension.Width);
      });
    }
    if (oldFitCheck) {
      toDatasource.checkInitFitCheckErrors();
    }
    const revert = ((children, old, dimens, fitcheck) => {
      return () => {
        old.Dimension.Height = dimens.Height;
        old.Dimension.Width = dimens.Width;
        old.Dimension.Depth = dimens.Depth;
        old.fitCheck = fitcheck;
      }
    })(oldChild, toDatasource, oldDimen, oldFitCheck);
    const original =((children, old, dimens, fitcheck) => {
      return () => {
        old.Dimension.Height = dimens.Height;
        old.Dimension.Width = dimens.Width;
        old.Dimension.Depth = dimens.Depth;
        old.fitCheck = fitcheck;
      }
    })('', toDatasource, Object.assign(toDatasource.Dimension), toDatasource.fitCheck);

    this.historyService.captureActionExec({
      'funoriginal': original,
      'funRevert': revert,
      'funName': 'Append'
    });
  }

  getAllBays(parent: Section, planogram: Planogram, pogObject?: Section) {
    let obj = planogram !== null ? planogram : pogObject;
    if (obj.hasOwnProperty('Children')) {
      obj.Children.forEach((child) => {

        if (Utils.checkIfFixture(child) && !Utils.checkIfShoppingCart(child)) {
          this.planogramCommonService.modelFixture(child, obj);
          this.planogramCommonService.extend(child, false, this.sectionID);
          if (!Utils.checkIfBay(child)) {
            parent = obj as Section ;
          } else {
            this.allBays.push(child);
          }
          this.planogramCommonService.setParent(child, parent);

        } else if (Utils.checkIfPosition(child)) {
          this.planogramCommonService.modelPosition(child, parent);
          this.planogramCommonService.extend(child, false, this.sectionID);
          this.planogramCommonService.setParent(child, obj);

        }
        this.getAllBays(parent, null, child);
      }, obj);
    }
    return this.allBays;
  }
  getAllFixtures(parent: Section, planogram: Planogram, pogObject?: Section) {
    let obj = planogram !== null ? planogram : pogObject;
    if (obj.hasOwnProperty('Children')) {
      obj.Children.forEach((child) => {
        if (Utils.checkIfFixture(child) && !Utils.checkIfShoppingCart(child) && !Utils.checkIfBay(child)) {
          this.planogramCommonService.modelFixture(child, obj);
          this.planogramCommonService.extend(child, false, this.sectionID);
          this.allFixtures.push(child);
          this.planogramCommonService.setParent(child, parent);
          child.Location.X = (obj.Location ? obj.Location.X : 0) + child.Location.X;
        } else if (Utils.checkIfPosition(child)) {
          this.planogramCommonService.modelFixture(child, parent);
          this.planogramCommonService.extend(child, false, this.sectionID);
          this.planogramCommonService.setParent(child, obj);

        }
        this.getAllFixtures(parent, null, child);
      }, obj);
    }

    return this.allFixtures;
  }

}
