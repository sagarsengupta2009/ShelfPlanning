import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild,
  Component, ElementRef, Input, OnDestroy, OnInit, SimpleChanges
} from '@angular/core';
import { SharedService } from 'src/app/shared/services/common/shared/shared.service';
import { Subscription } from 'rxjs';
import { PanelBodyService } from 'src/app/shared/services/layouts/space-automation/dashboard/shelf-planogram/splitter-container/panel/panel-body/panel-body.service';
import { AnnotationSvgRenderService, PanelService } from 'src/app/shared/services';
import { AnnotationType, IAnnotationLine } from 'src/app/shared/models';
import { AnnotationService } from 'src/app/shared/services/common/planogram/annotation/annotation.service';

@Component({
  selector: 'sp-annotation-connector',
  templateUrl: './annotation-connector.component.html',
  styleUrls: ['./annotation-connector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnnotationConnectorComponent implements OnInit, AfterViewInit, OnDestroy {

  private _subscriptions = new Subscription();

  @Input() panelID: string;
  @Input() data;
  @Input() section;
  @Input() refSvg;

  private theLine: IAnnotationLine = null;

  @ViewChild('lineEle') lineEle: ElementRef;
  view = true;

  constructor(
    private readonly annotationSvgRender: AnnotationSvgRenderService,
    private readonly sharedService: SharedService,
    private readonly cd: ChangeDetectorRef,
    public readonly panelBodyService: PanelBodyService,
    private readonly annotationService: AnnotationService,
    public readonly panelService: PanelService) {
  };

  ngOnChanges(changes: SimpleChanges): void {
    this.cd.markForCheck();
  }

  ngOnInit() {
    this._subscriptions.add(
      this.panelBodyService.annotationUndoRedo.subscribe(result => {
        if (result && this.data.$belongsToID === result.$belongsToID) {
          this.data = result;
        }
      }));
      this._subscriptions.add(this.annotationService.updateAnnotationConnector.subscribe((id: string)=>{
          if(id == this.data.$belongsToID) {
            this.connector();
          }
      }))

    if (this.showOrHide()) {
      this.link();
    } else {
      document.querySelectorAll(`.removeline_${this.panelID}`).forEach((element: any) => {
        if (element.id != `removelineforPog_${this.section.IDPOG}`) {
          element.parentNode.removeChild(element);
        }
      });
    }
  }

  connector() {
    if (this.showOrHide() && this.section.showAnnotation) {
      this.view = false;
      this.theLine = (this.data.status != 'deleted')
        ? this.annotationSvgRender.DOMAnnotation(this.data, this.section)
        : null;
      this.renderer();
    }
    else {
      this.view = true;
      document.querySelectorAll(`.removeline_${this.panelID}`).forEach((element: any) => {
        if (element.classList.contains('removeline_' + this.data.$belongsToID)) {
          element.style.display = 'none';
        }
      });
    }
  }

  showOrHide() {
    if(this.section.showAnnotation == 0){
      this.view = true;
      return false;
    }
    if (this.data.status == 'deleted') {
      this.view = true;
      return false;
    }
    if (this.data.LkExtensionType == AnnotationType.TEXT_ANNOTATION && this.section.showAnnotation == 3) {
      this.view = true;
      return false;
    }
    if (this.data.LkExtensionType == AnnotationType.IMAGE_POP) {
      this.view = true;
      return false;
    }
    this.view = false;
    return true;
  }

  ngAfterViewInit() {
    this.renderer();
  }

  renderer() {
    this.sharedService.sectionStyleSub.next(true);
    if (this.lineEle != undefined) {
      if (this.theLine) {
        this.updateLinePropertiesToDOMElement();
        if (navigator.appVersion.indexOf('Trident/') > -1) {
          this.lineEle.nativeElement.parentNode.insertBefore(this.lineEle, this.lineEle);
        }
        this.updateConnector(this.theLine);
      } else {
        if (this.theLine) {
          this.updateLinePropertiesToDOMElement();
        } else {
          this.removeCurrentLineFromDOM()
        }
        this.updateConnector(this.theLine);
      }
      // this.lineEle there, but this.theLine not initialized
      this.resetWrapper();
    } else {
      this.removeCurrentLineFromDOM();
    }
    this.cd.markForCheck();
  }

  private updateLinePropertiesToDOMElement() {

    if (!this.lineEle?.nativeElement) { return; }
    if (!this.theLine) { return; }

    this.lineEle.nativeElement.setAttribute("x1", this.theLine.x1);
    this.lineEle.nativeElement.setAttribute("y1", this.theLine.y1);
    this.lineEle.nativeElement.setAttribute("x2", this.theLine.x2);
    this.lineEle.nativeElement.setAttribute("y2", this.theLine.y2);

    this.lineEle.nativeElement.style.stroke = this.theLine.stroke;

    const displayStyle = this.theLine.noCallOut ? 'none' : 'block';
    this.lineEle.nativeElement.style.display = displayStyle;

    //Some cases line attributes are not updating so use below way
    document.querySelectorAll(`.removeline_${this.panelID}`).forEach((el: any) => {
      if (el.classList.contains('removeline_' + this.data.$belongsToID)) {
        el.style.stroke = this.theLine.stroke;
        el.style.display = displayStyle;
        el.x1 != undefined ? el.x1.baseVal.value = this.theLine.x1 : '';
        el.y1 != undefined ? el.y1.baseVal.value = this.theLine.y1 : '';
        el.x2 != undefined ? el.x2.baseVal.value = this.theLine.x2 : '';
        el.y2 != undefined ? el.y2.baseVal.value = this.theLine.y2 : '';
      }
    })

  }

  private removeCurrentLineFromDOM() {
    document.querySelectorAll(`.removeline_${this.panelID}`).forEach((element: any) => {
      if (element.id != `removelineforPog_${this.section.IDPOG}`) {
        element.parentNode.removeChild(element);
      }
    });
  }

  private resetWrapper() {
    const wrapper = document.querySelector(`.removeWrapperPog_${this.panelID}`);
    if (wrapper != null) {
      wrapper.outerHTML = this.lineEle?.nativeElement?.outerHTML;
      return;
    }
    if (this.data.status == 'deleted') {
      const wrapper = document.querySelector('.removeline_' + this.data.$belongsToID);
      if (wrapper) {
        let parent = wrapper.parentElement;
        parent.removeChild(wrapper);
      }
    }
  }

  link() {
    this.theLine = this.annotationSvgRender.DOMAnnotation(this.data, this.section);
    this.updateConnector(this.theLine);
    // this._subscriptions.add(
    //   this.sharedService.selectedAnnotationInfo.subscribe(res => {
    //     if (res != null && res) {
    //       if (this.showOrHide()) {
    //         this.view = false;
    //         this.theLine = (this.data.status != 'deleted') ? this.sappAnnotationRendererService.DOMAnnotation(this.data, 1, this.section) : '';
    //         this.updateConnector(this.theLine);
    //         this.renderer();
    //       }
    //       else {
    //         this.view = true;
    //       }
    //     }
    //   }));

  }

  private updateConnector(theLine: IAnnotationLine): void {
    if (!this.lineEle?.nativeElement) { return; }

    if (theLine && theLine.stroke && (theLine.stroke != "#f00") &&
      ((this.refSvg.querySelector("marker#arrow" + theLine.stroke.substr(1)) == null) ||
        (this.refSvg.querySelector("marker#arrow" + theLine.stroke.substr(1)).length == 0))
    ) {
      let myDefs = this.refSvg.querySelector("marker").parentElement;
      const markerId = document.querySelector("marker")?.id;
      let newMarker = document.getElementById(markerId)?.cloneNode(true) as HTMLElement;
      if (newMarker) {
        let id = 'arrow' + theLine.stroke.substr(1);
        newMarker.id = id;
        newMarker.querySelector("path").setAttribute("fill", theLine.stroke);
        myDefs.append(newMarker);
        //this.lineEle.nativeElement.querySelector().setAttribute("marker-end", "url(#arrow" + theLine.stroke.substr(1) + ")");
        this.lineEle.nativeElement.style.markerEnd = "url(#arrow" + theLine.stroke.substr(1) + ")";
        document.querySelectorAll(`.removeline_${this.panelID}`).forEach((el: any) => {
          if (el.classList.contains('removeline_' + this.data.$belongsToID)) {
            el.style.markerEnd = "url(#arrow" + theLine.stroke.substr(1) + ")";
          }
        });
      }
      return;
    }
    if (theLine && theLine.stroke !== "#f00") {
      this.lineEle.nativeElement.style.markerEnd = "url(#arrow" + theLine.stroke.substr(1) + ")";
      document.querySelectorAll(`.removeline_${this.panelID}`).forEach((el: any) => {
        if (el.classList.contains('removeline_' + this.data.$belongsToID)) {
          el.style.markerEnd = "url(#arrow" + theLine.stroke.substr(1) + ")";
        }
      });
    } else {
      this.lineEle.nativeElement.style.markerEnd = "url(#arrow)";
      document.querySelectorAll(`.removeline_${this.panelID}`).forEach((el: any) => {
        if (el.classList.contains('removeline_' + this.data.$belongsToID)) {
          el.style.markerEnd = "url(#arrow)";
        }
      });
    }
  }

  ngOnDestroy() {
    if (this._subscriptions) { this._subscriptions.unsubscribe(); }
  }

}

