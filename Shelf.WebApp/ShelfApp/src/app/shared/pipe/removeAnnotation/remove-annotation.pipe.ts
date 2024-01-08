import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'removeAnnotation'
})
export class RemoveAnnotationPipe implements PipeTransform {

  transform(copiedObjs: any): any {
    var copiedFixnPos = [];
    copiedObjs.forEach(obj => {
        obj.ObjectDerivedType != 'Annotation' ? copiedFixnPos.push(obj) : '';
    });
    return copiedFixnPos;
  }
}
