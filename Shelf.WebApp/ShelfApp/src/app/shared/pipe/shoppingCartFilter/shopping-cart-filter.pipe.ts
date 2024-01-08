import { Pipe, PipeTransform } from '@angular/core';
import { ShoppingCartService } from '../../services/layouts/space-automation/dashboard/shopping-cart/shopping-cart.service';

@Pipe({
  name: 'shoppingCartFilter'
})
export class ShoppingCartFilterPipe implements PipeTransform {
  constructor(private shoppingCartService: ShoppingCartService) { }

  transform(collection: any, str: any, from: string='loadedCart'): any {
    let output = [];
    let searchedText = str.toLowerCase()
    collection.forEach(item => {
      if (item.Position != undefined) {
        if ((item.Position.Product.Name && item.Position.Product.Name.toLowerCase().indexOf(searchedText) > -1) || (item.Position.Product.UPC && item.Position.Product.UPC.toLowerCase().indexOf(searchedText) > -1) || (item.Position.Product.SKU && item.Position.Product.SKU.toLowerCase().indexOf(searchedText) > -1)) {
          output.push(item);
        }
      }
      else if ((item.NAME && item.NAME.toLowerCase().indexOf(searchedText) > -1) || (item.UPC && item.UPC.toLowerCase().indexOf(searchedText) > -1) || (item.SKU && item.SKU.toLowerCase().indexOf(searchedText) > -1)) {
        output.push(item);
      } else {
        if(from == 'loadedCart'){
        const size = this.shoppingCartService.additionalFieldsToShow.length;
        for (var k = 0; k < size; k++) {
          const field = this.shoppingCartService.additionalFieldsToShow[k].field;
          let data = this.getCartColumnValue(item, field);
          if (!data) {
            continue;
          }
          data = "" + data;
          if (data.toLowerCase().indexOf(searchedText) > -1) {
            output.push(item);
            break;
          }
        }
      }
      }
    });
    return output;
  }

  getCartColumnValue(item, field) {
    let fieldArr = field.split('.');
    switch (fieldArr.length) {
      case 1:
        return item[fieldArr[0]]
        break;
      case 2:
        return item[fieldArr[0]][fieldArr[1]]
        break;
      case 3:
        if (fieldArr[2] == 'SKU' && item[fieldArr[0]][fieldArr[1]][fieldArr[2]]) {
          return '[' + item[fieldArr[0]][fieldArr[1]][fieldArr[2]] + ']';
        }
        return item[fieldArr[0]][fieldArr[1]][fieldArr[2]]
        break;
      case 4:
        return item[fieldArr[0]][fieldArr[1]][fieldArr[2]][fieldArr[3]]
        break;
      case 5:
        return item[fieldArr[0]][fieldArr[1]][fieldArr[2]][fieldArr[3]][fieldArr[4]]
        break;
    }
  }

}
