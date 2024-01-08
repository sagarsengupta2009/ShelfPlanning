import { Directive, ElementRef, HostListener } from '@angular/core';
import { ConfigService } from 'src/app/shared/services';
 
@Directive({
    selector: '[positionImgFallback]'
})
export class ImgFallbackDirective {
 
    constructor(private element: ElementRef, private config : ConfigService) {
        this.element.nativeElement.addEventListener('error', this.displayFallbackImg.bind(this));
    }

    displayFallbackImg(): void {
        this.element.nativeElement.src = `${this.config?.fallbackImageUrl}`;
        this.removeEvent();
    }

    private removeEvent(): void {
        this.element.nativeElement.removeEventListener('error', this.displayFallbackImg.bind(this));
    }

    ngOnDestroy() {
        this.removeEvent();
    }
 
}