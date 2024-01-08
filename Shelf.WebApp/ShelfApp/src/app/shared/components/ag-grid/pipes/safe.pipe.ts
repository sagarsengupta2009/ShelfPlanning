import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safe'
})
export class SafePipe implements PipeTransform {
  constructor(protected sanitizer: DomSanitizer) { }

  public transform(value: any): SafeHtml {
    if (typeof value === 'string' && value.includes('<img')) { return value };
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}