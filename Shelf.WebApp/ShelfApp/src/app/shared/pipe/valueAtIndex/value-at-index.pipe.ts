import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'valueAtIndex'
})
export class ValueAtIndexPipe implements PipeTransform {

  public transform(value: string, index: number) {
    if (value === undefined || value === '' || value === null) {
      return '';
    }
    const splitedValue = value.split('-');
    return splitedValue[index];
  }

}
