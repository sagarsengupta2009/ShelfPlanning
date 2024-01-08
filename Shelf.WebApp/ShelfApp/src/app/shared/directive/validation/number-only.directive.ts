import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: 'input[NumberOnly]'
})
export class NumberOnlyDirective {

 constructor(private el: ElementRef) {
 }
 
//  @HostListener('input', ['$event']) onInputChange(event) {
//   const initalValue = this.el.nativeElement.value;
//   this.el.nativeElement.value = initalValue.replace(/[^0-9]*/g, '');
//   if ( initalValue !== this.el.nativeElement.value) {
//     event.stopPropagation();
//   }
// }


// Allow decimal numbers and negative values
private regex: RegExp = new RegExp(/[^0-9]*/g);
// Allow key codes for special events. Reflect :
// Backspace, tab, end, home
private specialKeys: Array<string> = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Del', 'Delete','Decimal','Minus'];


@HostListener('keydown', ['$event'])
onKeyDown(event: KeyboardEvent) {
  (this.el.nativeElement.value);
  // Allow Backspace, tab, end, and home keys
  if (event.key.length === 1 && (event.which < 48 || event.which > 57)) {
    event.preventDefault();
  }
}

}
