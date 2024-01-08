import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'planogramfilter'
})
export class PlanogramfilterPipe implements PipeTransform {
  transform(items: any[], filter): any {
    return items;
  }
}
