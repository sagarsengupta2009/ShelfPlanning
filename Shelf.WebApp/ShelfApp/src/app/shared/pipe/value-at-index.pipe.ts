import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'valueAtIndex'
})
export class ValueAtIndexPipe implements PipeTransform {
  transform(value: string, index: number) {
    // tslint:disable-next-line: triple-equals
    if (value === undefined || value === '') {
      return '';
    }
    const splitedValue = value.split('-');
    return splitedValue[index];
  }
}
