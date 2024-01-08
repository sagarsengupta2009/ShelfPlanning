import { Pipe, PipeTransform } from '@angular/core';
import { distinct, orderBy } from '@progress/kendo-data-query';
import { Position } from 'src/app/shared/classes';
import { SearchProductList } from '../../models';

@Pipe({
  name: 'sortPipe'
})
export class SortPipe implements PipeTransform {
  tempFieldName: string;
  transform(items: Position[] | SearchProductList[], args: Object): any {
    let params = [];
    let sortDir: string = args['sortReverse'] ? "asc" : "desc";
    let orders: boolean[] = args['orders'] ? args['orders'] : [];
    if (Array.isArray(args['col'])) {
      args['col'].forEach((c: string, index: number) => {
        let ord: string = sortDir;
        if (c.startsWith("-")) {
          c = c.substr(1);
          ord = !args['sortReverse'] ? "asc" : "desc";
        } else {
          ord = orders[index] ? "asc" : "desc";
        }
        params.push({ field: c, dir: ord });
      });
    } else {
      params = [{ field: args['col'], dir: sortDir }];
    }
    let sortedList = [...this.multiSort(items, params)];
    return sortedList;
  }

  /**
   * Handle multi sort when you have 
   * @param items data to sort
   * @param params Sort params 
   * @returns Sorted array
   */
  private multiSort(items: Position[] | SearchProductList[], params: { field: string, dir?: 'asc' | 'desc' }[]): Position[] | SearchProductList[] {
    let result = items;
    if (items.length > 0) {
      let sortedData = [];
      params.forEach((sortParam, index) => {
        let temp = [];
        if (index == 0) {
          result = this.sortBy(items, sortParam);
        } else {
          if (sortedData.length > 0) {
            temp = this.subArraySorting(sortedData, params, index, sortParam);
            sortedData = temp;
          } else {
            temp = this.sortWithDistinctValueOfPreviousSort(result, params, index, sortParam);
            sortedData = temp;
          }
        }
      });
      result = sortedData.length > 0 ? this.flatten(sortedData) : result;
    }
    return result;
  }

  /**
   * Sort the array by maintaining last sort
   * @param items Items to sort can be type any as its might a 'n' length of multidimasional array (type needed as any)
   * @param params Sort parameters
   * @param index current sort index
   * @param sortParam Current sort param
   * @returns Returns sorted array(type needed as any)
   */
  private sortWithDistinctValueOfPreviousSort(items: any[], params: { field: string, dir?: 'asc' | 'desc' }[], index: number, sortParam: { field: string, dir?: 'asc' | 'desc' }): any[] {
    let temp = [];
    items = this.flatten(items);
    const distinctValueOfPreviousSort = distinct(items, params[index - 1].field).map(ele => {
      return this.getValue(ele, params[index - 1].field);
    });
    distinctValueOfPreviousSort.forEach((sortedValue) => {
      const subList = items.filter(ele => this.getValue(ele, params[index - 1].field) === sortedValue);
      let sortedList = this.sortBy(subList, sortParam);
      temp.push(sortedList);
    });
    return temp;
  }

  /**
   * Sort the array, if its string(Alphanumeric) use custom comparator or use kendo-data-query function
   * @param items Items to sort can be type any as its might a 'n' length of multidimasional array, type needed as any 
   * @param sortParam Current sort param
   * @returns Sorted array
   */
  private sortBy(items: any[], sortParam: { field: string, dir?: 'asc' | 'desc' }): any[] {
    let result = items;
    if (items.length > 0) {
      this.tempFieldName = sortParam.field;
      if (typeof (this.getValue(items[0], sortParam.field)) === 'string') {
        result = items.sort(this.sortAlphaNum);
        if (sortParam.dir === 'desc') {
          result = result.reverse();
        }
      } else {
        result = orderBy(items, [sortParam])
      }
    }
    return result;
  }

  //Need this function as using it in expression evaluation
  private sortAlphaNum = (a, b): 0 | 1 | -1 => {
    const reA = /[^a-zA-Z]/g;
    const reN = /[^0-9]/g;
    a = this.getValue(a, this.tempFieldName);
    b = this.getValue(b, this.tempFieldName);
    const aA = a.replace(reA, "");
    const bA = b.replace(reA, "");
    if (aA === bA) {
      let aN = parseInt(a.replace(reN, ""), 10);
      let bN = parseInt(b.replace(reN, ""), 10);
      return aN === bN ? 0 : aN > bN ? 1 : -1;
    } else {
      return aA > bA ? 1 : -1;
    }
  }

  /**
   * Fetch object value
   * @param obj Object from which needs to fetch value
   * @param fieldName Field Name
   * @returns Returns the value of field from object
   */
  private getValue = (obj: Position | SearchProductList, fieldName: string) => {
    const strArray = fieldName.split('.');
    let value = obj;
    strArray.forEach(ele => {
      value = value[ele];
    });
    return value;
  }

  /**
   * It merge multidimansion array and returns signle level array
   * @param arr Multidimension array for multisort(type needed as any)
   * @returns Returns the single array
   */
  private flatten(arr: any[]): Position[] | SearchProductList[] {
    return arr.reduce((flat, toFlatten) => {
      return flat.concat(Array.isArray(toFlatten) ? this.flatten(toFlatten) : toFlatten);
    }, []);
  }

  /**
   * When We have multilevel sort applied then needs to handle 'n' dimensional array for 'n' level sorting
   * @param sortedData Multidimantional arrray when multisort is available(type needed as any)
   * @param params Sorting parameters
   * @param index current index
   * @param sortParam current sort param
   * @returns returns the multidimenssional array for current sort(type needed as any)
   */
  private subArraySorting(sortedData: any[], params: { field: string, dir?: 'asc' | 'desc' }[], index: number, sortParam: { field: string, dir?: 'asc' | 'desc' }): any[] {
    let temp = [];
    sortedData.forEach(subArr => {
      if (Array.isArray(subArr[0])) {
        let sortedDataArr = this.subArraySorting(subArr, params, index, sortParam);
        temp.push(sortedDataArr);
      } else {
        const subDataSortedArr = this.sortWithDistinctValueOfPreviousSort(subArr, params, index, sortParam);
        temp.push(subDataSortedArr);
      }
    });
    return temp;
  }
}
