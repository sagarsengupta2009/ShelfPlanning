import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import {
  AllSettings,
  ProductGallery,
  ProductHierarchyList,
  SearchProductList,
  SuggestProducts, IApiResponse
} from 'src/app/shared/models';
import { PlanogramStoreService } from 'src/app/shared/services';
import { ConfigService } from '../../../../common/configuration/config.service';
@Injectable({
  providedIn: 'root'
})
export class ProductlibraryService {
  public isProductHierarchy = new Subject<boolean>();
  public ProductGallery: ProductGallery = {
    products: [],
    searchText: '',
    hierarchyProducts: [],
    suggestionData: [],
    isFilterExisting: true,
    existingProducts: [],
    isPosResultReturned: false,
    allProductList: []
  }
  public selectedProductList: SearchProductList[] = [];
  public selectedKeys: number[] = [];
  public productHierarchyList : ProductHierarchyList[] = [];
  constructor(private readonly httpClient: HttpClient, private readonly planogramStore: PlanogramStoreService,
    private readonly envConfig: ConfigService ) { }

  public GetProductSearch(term: string, isAzSearch: boolean): Observable<SuggestProducts[]>{
    let headers = new HttpHeaders();
    headers = headers.append('ignoreLoader', 'true');
    const url = `${this.envConfig.shelfapi}/api/Search/SuggestProducts?term=${term}&pogId=${isAzSearch}`;
    return this.httpClient.get<SuggestProducts[]>(url, { headers });
  }

  // get product hierarchy tree data
  public getProductHierarchy(): Observable<ProductHierarchyList[]>{
    const url = `/api/i2eproduct/GetProductHierarchy?hierarchyGroupId=-1`;
    return this.httpClient.get<ProductHierarchyList[]>(url);
  }


  public getSearchProducts(idProdHier: { isAzSearch: boolean, searchText: string, searchableColumn: string, idProdHier: number }): Observable<IApiResponse<SearchProductList[]>> {
    // Added 'skipSuccessMsg' as a header option to skip success message (toaster)
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.httpClient.post<IApiResponse<SearchProductList[]>>(`${this.envConfig.shelfapi}/api/Search/SearchProducts`, idProdHier, {headers});
  }
}
