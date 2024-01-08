import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[disableKeyboardEvents]'
})

/**
 * most of the keyboard events are handled on keyup event for better performance.
 * To prevent browser shortcut keys which will trigger on keydown events on the document,
 * preventing default behaviour by assuming any ctrl action is a shortcut key action.
 * conflicts are with ctrl actions.
 * allow copy paste for inputs
 */
export class DisableKeyboardEventsDirective {
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    let element = <HTMLElement>event.target
    if (event.ctrlKey && element.nodeName !== 'INPUT' && element.nodeName !== 'TEXTAREA') {
      return false;
    }
  }
}
