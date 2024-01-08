import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, of } from 'rxjs';
import { SetupItemConfirmationComponent } from './setup-products/setup-item-confirmation.component';
import { PaBroadcasterService } from '../pa-broadcaster.service';
import { PlanogramStoreService } from '../../../common';
import { AllocateAPIService, PanelService } from '../..';
import { PAProductCorpDetail, PAProductDetails, PAProductPackageDetails } from 'src/app/shared/models';
import { LocalStorageKeys } from 'src/app/shared/constants';
import { LocalStorageService } from 'src/app/framework.module';

@Injectable({
  providedIn: 'root'
})
export class AllocateValidationService {

  constructor(private readonly dialog: MatDialog,
    private readonly planogramStore: PlanogramStoreService,
    private readonly panelService: PanelService,
    private readonly allocateApi: AllocateAPIService,
    private readonly localStorage: LocalStorageService,
    private readonly paBroadcast: PaBroadcasterService) { }


  /**
   * checks if user is in national corp, then if the product is a different corp than the pog,
   *  then it will fetch the product valid for that corp and returns.
   *
   * @param productList
   * @returns true if products are setup and valid. false if user cancels setup or are invalid.
   */
  public validateProducts(productList: PAProductDetails[]): Observable<boolean> {
    try {
      // validate only if user is in national corp.
      if (!this.isNationalCorp()) {
        return of(true);
      }

      // generate product keys  upc pair from the product list.
      let productCorpDetails = this.getproductCorpInfo(productList);
      // no products from different corp.
      if (!productCorpDetails.products.length) {
        return of(true);
      }
      const isValid = new Subject<boolean>();
      const apiData = {
        productKeys: productCorpDetails.products.map(product => product.productKey),
        targetCorpId: productCorpDetails.targetCorpId,
        sourceCorpId: productCorpDetails.sourceCorpId
      }

      // call validation API and check if products are valid,
      this.allocateApi.validateProductsForCorp(apiData).subscribe((response: PAProductPackageDetails[]) => {
        const invalidProducts = response.filter(item => item.IsValid === false);
        const validProducts = response.filter(item => item.IsValid === true);
        //for invalid items, show confirmation dialog and once ok,
        if (invalidProducts.length) {
          this.paBroadcast.expandFrame(true);
          this.dialog.open(SetupItemConfirmationComponent, { data: { productCorpDetails, invalidProducts } }).afterClosed().subscribe((doSetup: boolean) => {
            if (doSetup) {
              // call second api to setup the product and update the product details and complete the observable.
              const secondApiData = {
                productKeys: invalidProducts.map(product => product.ProductKey),
                targetCorpId: productCorpDetails.targetCorpId,
                sourceCorpId: productCorpDetails.sourceCorpId
              }
              this.allocateApi.setupProductForDivision(secondApiData).subscribe((secondApiResponse: PAProductPackageDetails[]) => {
                const invalidProducts = secondApiResponse.filter(item => item.IsValid === false);
                const validNPIProducts = secondApiResponse.filter(item => item.IsValid === true);
                if (invalidProducts.length) {
                  const productKeys = invalidProducts.map(product => product.ProductKey);
                  this.paBroadcast.toastMessage(`Failed to setup NPI ${productKeys.toString()}`);
                }
                if (validNPIProducts.length) {
                  this.updateProductDetails(productList, [...validNPIProducts, ...validProducts], productCorpDetails);
                }
                isValid.next(true);
                isValid.complete();
              })
            } else {
              isValid.next(false);
              isValid.complete();
            }
            this.paBroadcast.expandFrame(false);

          },
            (error) => {
              this.apiErrorHandler(error, isValid);
            }
          );
        } else {
          this.updateProductDetails(productList, validProducts, productCorpDetails);
          isValid.next(true);
          isValid.complete();
        }
      },
        (error) => {
          this.apiErrorHandler(error, isValid);
        }
      )

      return isValid;
    } catch (e) {
      this.paBroadcast.toastMessage("Failed to Validate the products");
      console.log(e);
      return of(false);
    }
  }

  private apiErrorHandler(error: unknown, isValid: Subject<boolean>): void {
    console.log(error);
    this.paBroadcast.toastMessage("Failed to Validate the products");
    isValid.next(false);
    isValid.complete();
  }

  private isNationalCorp(): boolean {
    return this.getUserCorp().Name.toUpperCase() === 'NATIONAL';
  }

  private getUserCorp(): { "Name": string, "IdCorp": number } {
    return this.localStorage.get(LocalStorageKeys.PA.CORP_DETAILS);
  }

  /**
   *
   * @param products can be clipboard item,product library item,item scanning item.
   * @returns if there are products of different corp or unknown corp such as from product library.
   * If there are products from multiple corps will return user corp as corpid.
   */
  private getproductCorpInfo(products: PAProductDetails[]): PAProductCorpDetail {
    const idPog = this.panelService.panelPointer[this.panelService.activePanelID].IDPOG;
    const pogCorpId = this.planogramStore.mappers.filter(pog => pog.IDPOG === idPog)[0].corpId;
    const response = { sourceCorpId: null, targetCorpId: pogCorpId, products: [] };

    products.forEach((product) => {
      // source corp unknown. Hence assuming product is from different corp.
      if (!product.corpId || product.corpId != pogCorpId) {
        // for items from item scan, product lib, productKey will not be available. hence hard coding it to csc_id.
        const productKey = product.Product.ProductKey ? product.Product.ProductKey : product.Product.Csc_Id;
        response.products.push({ productKey: productKey, upc: product.Product.UPC, corpId: product.corpId });
      }
    })
    if(response.products.length) {
      //for multiple source corp, setting 1 as default corp.
      const soruceCorps = [...new Set(response.products.map(e => e.cropId != undefined))]
      if (soruceCorps.length > 1) {
        response.sourceCorpId = this.getUserCorp().IdCorp;
      } else {
        response.sourceCorpId = response.products[0].corpId ? response.products[0].corpId : this.getUserCorp().IdCorp;
      }
    }
    return response;
  }

  // Update Corp specific product level information.
  private updateProductDetails(productList: PAProductDetails[], updatedDetails: PAProductPackageDetails[], productCorpDetails: PAProductCorpDetail) {
    // check if original idpackage exists, if yes use it else default to unit.
    updatedDetails.forEach((updatedProduct) => {
      // some items may not have product key but api provides productKey, hence need to match with productKeys and UPCs
      const upc = productCorpDetails.products.filter(e => e.productKey === updatedProduct.ProductKey)[0].upc;
      const product = productList.filter(product => product.Product.UPC === upc)[0];
      product.ProductPackage = updatedProduct.Children.ProductPackages.filter(e => e.IDPackage === product.ProductPackage.IDPackage)[0];
      // package may have changed and not match with any ID, then default to unit.
      if (!product.ProductPackage) {
        product.ProductPackage = updatedProduct.Children.ProductPackages.filter(e => e.Name.toUpperCase() === 'UNIT')[0];
      }
      product.Product = updatedProduct.Children.Product;
      product.IDProduct = updatedProduct.Children.Product.IDProduct;
      product.IDPackage = product.ProductPackage.IDPackage;
      product.AvailablePackages = updatedProduct.Children.ProductPackages;
    })
  }
}
