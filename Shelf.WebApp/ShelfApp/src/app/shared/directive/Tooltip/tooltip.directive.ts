import { Directive, ElementRef, HostListener, Input, Renderer2, } from '@angular/core';
import { SharedService } from '../../services/common/shared/shared.service';

@Directive({
  selector: '[appTooltip]'
})
export class TooltipDirective {
  @Input('appTooltip') tooltipTitle: string;
  tooltip: HTMLElement;
  delay: number = 2000;
  tooltipHeader: HTMLElement;
  offset = 16;
  placement = 'right'


  constructor(private el: ElementRef, private renderer: Renderer2,private sharedService : SharedService) { }

  ngOnInit() {
    //this.showTooltip();
  }
//   @HostListener('mouseover')
//   onMouseIn() {
//     if (!this.tooltip){
//       window.setTimeout(() => { 
//       this.showTooltip();
//     }, this.delay); 
//     }
//   }

//   @HostListener('mouseleave')
//   onMouseOut() {
//     if (this.tooltip) this.hideTooltip();
//   }

//   @HostListener('mousemove')
// onMousemove() {
//   let elements = document.getElementsByClassName('ng-tooltip-show');
//   if(elements.length > 0){
//       elements[0].parentNode.removeChild(elements[0]);
//   }
// }

  showTooltip() {
    if(this.tooltipTitle != ''){
    let elements = document.getElementsByClassName('ng-tooltip-show');
    if(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
    this.tooltip = this.renderer.createElement('div');
    this.tooltipHeader = this.renderer.createComment('span');

    var doc = new DOMParser().parseFromString(this.tooltipTitle, "text/xml");
    this.tooltip.innerHTML = this.tooltipTitle;

    this.renderer.appendChild(document.body, this.tooltip);

    this.renderer.addClass(this.tooltip, 'ng-tooltip');
    this.renderer.addClass(this.tooltip, `ng-tooltip-right`);

    this.setPosition();
    this.renderer.addClass(this.tooltip, 'ng-tooltip-show');
  }
  }

  hideTooltip() {
    // clearTimeout(this.delay);
    // var elements = document.getElementsByClassName('ng-tooltip-show');
    // if(elements.length > 0){
    //     elements[0].parentNode.removeChild(elements[0]);
    // }
    //  this.tooltip = null;
    // this.renderer.removeClass(this.tooltip, 'ng-tooltip-show');
    // this.renderer.removeChild(document.body, this.tooltip);
    // this.tooltip = null;
  }

  setPosition() {
    const hostPos = this.el.nativeElement.getBoundingClientRect();

    const tooltipPos = this.tooltip.getBoundingClientRect();

    const scrollPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

    let top, left;

    // if (this.placement === 'top') {
    //   top = hostPos.top - tooltipPos.height - this.offset;
    //   left = hostPos.left + (hostPos.width - tooltipPos.width) / 2;
    // }
    if (this.placement === 'right') {
      top = hostPos.top + (hostPos.height - tooltipPos.height) / 2;
      left = hostPos.right + this.offset;
    }

    this.renderer.setStyle(this.tooltip, 'top', `${top + scrollPos}px`);
    this.renderer.setStyle(this.tooltip, 'left', `${left}px`);
  }
}