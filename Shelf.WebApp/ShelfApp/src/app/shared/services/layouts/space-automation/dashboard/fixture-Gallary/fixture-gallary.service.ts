import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';

import { Utils } from 'src/app/shared/constants/utils';
import { IApiResponse } from 'src/app/shared/models/apiResponseMapper';
import { FixtureGalleryDataVM, GalleryFixture } from 'src/app/shared/models/fixture-gallary';
import { Planogram, PogObject } from 'src/app/shared/models/planogram/';
import { LocalStorageService } from 'src/app/framework.module';
import { catchError, map, tap } from 'rxjs/operators';
import { db } from 'src/app/framework.module/db/db';
import { ConfigService } from '../../../../common/configuration/config.service';
@Injectable({
  providedIn: 'root'
})
export class FixtureGallaryService {
  public searchProductsData: GalleryFixture[] = [];
  public isLoaded: boolean = false;
  public searchText: string = '';
  public galleryItemDataList: Array<FixtureGalleryDataVM> = [];
  public allProductsData: GalleryFixture[] = [];
  private allFixtureComponents: Planogram[] = null;

  constructor(private readonly http: HttpClient,
    private readonly envConfig: ConfigService) { }

  public fetchFixtureGalleryResult(searchText: string, searchableColumn: string, isAzSearch: boolean): Observable<IApiResponse<GalleryFixture[]>> {
    const postObj = {
      isAzSearch: isAzSearch,
      searchText: searchText,
      searchableColumn: searchableColumn
    };
    const apiFixtureGallery = `${this.envConfig.shelfapi}/api/Search/SearchFixtures?searchText=`;
    return this.http.post<IApiResponse<GalleryFixture[]>>(apiFixtureGallery, postObj);
  }

  public setupFixtureMixin(fixDataItemList: Planogram[], galleryFixList: GalleryFixture[]): void {
    let galleryItemDataList = galleryFixList;
    for (let fixDataItem of fixDataItemList) {

      const pog = galleryItemDataList.find(ele => ele.IDPOG == fixDataItem.IDPOG);
      const index = galleryItemDataList.findIndex(ele => ele.IDPOG == fixDataItem.IDPOG);

      let pogData = fixDataItem;

      let recursiveSearch = function (obj) {
        let fixObj = obj.Children.find(a => a.Fixture && a.Fixture.IDFixtureType > 0 && Utils.checkIfFixture(a));
        if (Utils.isNullOrEmpty(fixObj)) {
          for (let child of obj.Children) {
            if ((!Utils.isNullOrEmpty(child.Children)) && child.Children.length > 0) {
              fixObj = recursiveSearch(child);
              if (fixObj) {
                break;
              }
            }
          }
        }
        return fixObj;
      }
      let fixtureObj = recursiveSearch(pogData);
      if (!fixtureObj) {
        continue;
      }
      const filterFixture = galleryItemDataList.find(e => e.IDPOG == pogData.IDPOG);
      fixtureObj.Name = filterFixture?.Name
      fixtureObj.Image = filterFixture?.Image


      fixtureObj.isLoaded = true;
      fixtureObj.isPOGDataReturnFail = false;
      fixtureObj.Length = pog.Length;
      fixtureObj.Height = pog.Height;
      fixtureObj.Depth = pog.Depth;
      fixtureObj.IDPOGObject = null;
      fixtureObj.Fixture.IDPOGObject = null;
      fixtureObj.IDPOGObjectParent = null;
      fixtureObj.IDPOG = pogData.IDPOG;
      let recursive = function (fixtureObjChild: PogObject) {
        if (fixtureObjChild.Children.length > 0 && Utils.checkIfFixture(fixtureObjChild)) {
          for (let fixObjChild of fixtureObjChild.Children) {
            fixObjChild.IdPogObject = null;
            fixObjChild.Fixture.IDPOGObject = null;
            fixObjChild.IdPogObjectParent = null;
            if (!fixObjChild.Children && fixObjChild.Children.length > 0) {
              recursive(fixObjChild);
            }
          }

        }
      }
      recursive(fixtureObj);
      // TODO insert into fixtureDB
      this.galleryItemDataList[index] = fixtureObj;
      galleryItemDataList[index] = fixtureObj;
    }

    galleryItemDataList.forEach(ele => ele.isLoaded = true);

  }


  getFixturesByIds(fixList: Array<number>, refreshLibrary: boolean = false): Observable<Planogram[]> {
    const result$ = new Subject<Array<Planogram>>();
    const updateResult = (data: Planogram[]) => {
      this.allFixtureComponents = data;
      result$.next(this.allFixtureComponents);
    }

    //service data
    if (this.allFixtureComponents && !refreshLibrary) {
      updateResult(this.allFixtureComponents);
    }
    //indexDb
    db.allFixtureComponents.toArray().then((res) => {
      if (res.length && !refreshLibrary) {
        updateResult(JSON.parse(res[0].allFixtureComponents));
      } else {
        // API
        let headers = new HttpHeaders();
        headers = headers.append('ignoreLoader', 'true');
        const URL = `/api/PlanogramTransaction/GetAllFixtureComponents`;
        this.http
          .post<IApiResponse<Planogram[]>>(URL, fixList, { headers: headers })
          .pipe(
            map((response) => {
              return response.Data;
            }),
          )
          .pipe(
            tap((response) => {
              db.allFixtureComponents.add({ allFixtureComponents: JSON.stringify(response) });
              updateResult(response);
            }),
          )
          .pipe(
            catchError((err) => {
                throw new Error('Error while retriveing all the fixture components');
            }),
          )
          .subscribe(
              () => {},
              (err) => {
                  result$.error(err);
              },
          );

      }
    });
    return result$;
  }

}
