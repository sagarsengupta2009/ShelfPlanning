import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterPipe',
})
export class FilterPipe implements PipeTransform {
    transform(items: any[], filter: Object): any {
        if (!items || !filter || !filter['search']) {
            return items;
        }
        if (filter['col']) {
          return items.filter(item => item[filter['col']].toString().toLowerCase().indexOf(filter['search'].toString().toLowerCase()) !== -1);
        }

        let filteredList = [];
        if (items.length > 0) {
            let searchKeyword = filter['search'].toString().toLowerCase();
            items.forEach((item) => {
                //Object.values(item) => gives the list of all the property values of the 'item' object
                if (typeof item === 'object') {
                    let propValueList = Object.values(item);
                    for (let i = 0; i < propValueList.length; i++) {
                        if (propValueList[i]) {
                            if (propValueList[i].toString().toLowerCase().indexOf(searchKeyword) > -1) {
                                filteredList.push(item);
                                break;
                            }
                        }
                    }
                } else {
                    if (item) {
                        if (item.toString().toLowerCase().indexOf(searchKeyword) > -1) {
                            filteredList.push(item);
                        }
                    }
                }
            });
        }
        return filteredList;
    }
}
