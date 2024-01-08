
import { Utils } from "../constants/utils";
import * as _ from 'lodash-es';

export class SyncAuthCodeWithVM{
    constructor(private authCollection: any, private pogVM: any) {
        if (!_.isEmpty(this.authCollection)) {
            this.eachRecursive(this.pogVM);
        }
    }
    public syncAuth(obj) {
        const dyncID = obj.Position.Product.IDProduct.toString() + "@" + obj.Position.ProductPackage.IDPackage.toString();
        if (this.authCollection[dyncID] != undefined) {
            if (obj.Position.Product.ProdAuth == undefined) obj.Position.Product.ProdAuth = {};
            obj.Position.Product.ProdAuth.AuthFlag = this.authCollection[dyncID].AuthFlag;
            obj.Position.Product.ProdAuth.Remarks = this.authCollection[dyncID].Remarks;
        }
    }

    eachRecursive(obj) {
        if (obj.hasOwnProperty('Children')) {
            obj.Children.forEach(child => {              
                if (Utils.checkIfPosition(child)) {
                    this.syncAuth(child);
                }
                this.eachRecursive(child);
            }, obj);
        }
    }


}
