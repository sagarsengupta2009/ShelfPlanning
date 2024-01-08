import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export class FormattingService {

  constructor() { }


  removeNullFields(item: any) {
    for (let key in item) {
      if (item[key] === null) {
        delete item[key];
      }
    }
  }

  // TODO: @og move to data utilties service
  parseInts<T>(target: T, ...keys: (keyof T)[]) {
    for (const key of keys) {
      if (typeof (target[key]) == 'string') {
        target[key] = parseInt(target[key] as any) as any;
      }
    }
  }

  // TODO: @og move to data utilties service
  parseFloats<T>(target: T, ...keys: (keyof T)[]) {
    for (const key of keys) {
      if (typeof (target[key]) == 'string') {
        target[key] = parseFloat(target[key] as any) as any;
      }
    }
  }

}
