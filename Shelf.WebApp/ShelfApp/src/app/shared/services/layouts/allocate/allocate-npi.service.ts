import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConsoleLogService } from 'src/app/framework.module';
import { Position, Section } from 'src/app/shared/classes';
import { AllocateAPIService } from '..';
import { PlanogramStoreService } from '../../common';
import { PASettingNames as NAME_KEYS } from 'src/app/shared/constants';

@Injectable({
  providedIn: 'root'
})
export class AllocateNpiService {

  private npiUpdated: { [key: string]: boolean } = {};
  private productKeySource: string;

  constructor(
    private readonly allocateApi: AllocateAPIService,
    private readonly log: ConsoleLogService,
    private readonly planogramStore: PlanogramStoreService,
  ) { }

  public hasNpiUpdated(sectionId: string): boolean {
    return this.npiUpdated[sectionId];
  }

  public setNpiUpdated(sectionId: string, hasChanged = false): void {
    this.npiUpdated[sectionId] = hasChanged;
  }

  public updateItemPAAzure(data): Observable<string> {
    let items = [], itemKeys = { 'productKeys': [] };
    if(!this.productKeySource){
      this.setProductKeySource();
    } 
    data.forEach((pos, index) => {
      if (index != "PerfData") {
        let item = pos.Product ? pos : pos.Position;
        items.push(this.getProductKey(item.Product));
      }
    }, this);
    itemKeys.productKeys = items;
    return this.allocateApi.updateNpiItem(itemKeys);
  }

  //TODO @karthik move it to allocate service
  public updateProductKeys(positions: Position[], pog: Section): void {
    try {
      let count = 0;  
      if(!this.productKeySource){
        this.setProductKeySource();
      }   
      positions.forEach((position) => {
        const uniqueProdPkg = position.Position.Product.IDProduct.toString() + "@" + position.Position.ProductPackage.IDPackage.toString();
        const productKey = this.getProductKey(position.Position.Product  as Object);
        const packName = position.Position.ProductPackage.Name.toUpperCase();
        // position level
        position.Position.ProductKey = position.Position.Product.ProductKey = productKey;
        position.Position.PackName = packName;
        position.IDPOGObject = position.IDPOGObject ?? -Date.now() - count++;
        // pog level
        pog.PackageInventoryModel[uniqueProdPkg].ProductKey = pog.PackageAttributes[uniqueProdPkg].ProductKey = productKey;
        pog.PackageInventoryModel[uniqueProdPkg].PackName = pog.PackageAttributes[uniqueProdPkg].PackName = packName;
        pog.PackageInventoryModel[uniqueProdPkg].UniqueProdPkg = pog.PackageAttributes[uniqueProdPkg].UniqueProdPkg = uniqueProdPkg
      })
    } catch (e) {
      this.log.error(" Error updating productKey for newly added products!");
    }
  }

  private setProductKeySource(): void {
    let config = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.find(val => val.KeyName === NAME_KEYS.paConfigurations);
    if (config) {
      this.productKeySource = JSON.parse(config.KeyValue as string)['ProductKey_Source'];
    }      
  }

  private getProductKey(product: Object): string {
    let isValid = product.hasOwnProperty(this.productKeySource);
    return isValid ? product[this.productKeySource] : product['UPC'];    
  }
}
