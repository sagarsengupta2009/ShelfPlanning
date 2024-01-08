import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterInfoBy'
})
export class FilterByPipe implements PipeTransform {
    // transform(items: any[], filter: Object): any {
    transform(items: any[], type: string, key: string): any {
        if (items.length > 0 && type !== '') {
            return items.filter(item => item[`${key}`] === type);
        } else {
            return items;
        }
    }
}
