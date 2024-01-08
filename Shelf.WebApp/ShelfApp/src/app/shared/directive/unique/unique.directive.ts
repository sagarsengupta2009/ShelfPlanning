import {
  AbstractControl,
  NG_VALIDATORS,
  Validator,
  ValidatorFn
} from '@angular/forms';
import {Directive, Input} from '@angular/core';

export function checkIfDuplicate( existingItemList): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null =>
      !existingItemList.includes(control.value)
          ? null : {isDuplicate: true};
}

@Directive({
  selector: '[checkIfDuplicate]',
  providers: [{
      provide: NG_VALIDATORS,
      useExisting: UniqueDirective,
      multi: true
  }]
})
export class UniqueDirective implements Validator {
  @Input() existingItemList: any[];
  validate(control: AbstractControl): { [key: string]: any } | null {
      return checkIfDuplicate(this.existingItemList)(control);
  }
}
