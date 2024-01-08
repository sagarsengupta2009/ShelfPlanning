import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ViewChild,
  SimpleChanges,
  OnChanges,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Section } from 'src/app/shared/classes';
import { AppConstantSpace } from 'src/app/shared/constants';
import { StyleModularFarFront } from 'src/app/shared/models';
import { PanelService, ModularSvgRenderService, PlanogramService, SharedService } from 'src/app/shared/services';
@Component({
  selector: 'sp-modular-farfront',
  templateUrl: './modular-farfront.component.html',
  styleUrls: ['./modular-farfront.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModularFarfrontComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('farfrontRef') farfrontRef;
  @Input() itemData: Section;
  public farfrontStyle: StyleModularFarFront;
  private _subscriptions = new Subscription();
  private SVGBlock: string = '';

  constructor(
    private readonly planogramService: PlanogramService,
    private readonly modularSvgRender: ModularSvgRenderService,
    private readonly sharedService: SharedService,
    private readonly panelService: PanelService,
    private readonly cd: ChangeDetectorRef,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.itemData) {
      this.farfrontRef?.nativeElement?.innerHTML ? (this.farfrontRef.nativeElement.innerHTML = '') : '';
      this.clearAndRecreate();
      this.farfrontStyle = this.styleFarFront();
    }
  }

  ngOnInit(): void {
    this._subscriptions.add(
      this.sharedService.updateImageInPOG.subscribe((result: string) => {
        if (result === AppConstantSpace.MODULAR) {
          this.clearAndRecreate();
        }
      }),
    );
    this._subscriptions.add(
      this.sharedService.updateValueInPlanogram.subscribe((res: object) => {
        this.clearAndRecreate();
      }),
    );
  }

  ngAfterViewInit(): void {
    this.farfrontRef ? (this.farfrontRef.nativeElement.innerHTML = this.SVGBlock) : '';
  }

  ngOnDestroy(): void {
    this.farfrontRef?.nativeElement?.innerHTML ? (this.farfrontRef.nativeElement.innerHTML = '') : '';
    this._subscriptions.unsubscribe();
  }

  private clearAndRecreate(): void {
    this.farfrontRef?.nativeElement?.innerHTML ? (this.farfrontRef.nativeElement.innerHTML = '') : '';
    this.drawFarFront(this.itemData);
    this.farfrontRef ? (this.farfrontRef.nativeElement.innerHTML = this.SVGBlock) : '';
    this.cd.markForCheck();
  }

  private styleFarFront(): StyleModularFarFront {
    if (this.itemData && this.panelService.ActivePanelInfo.sectionID === this.itemData.$sectionID) {
      const style: StyleModularFarFront = {
        pointerEvents: 'none',
        position: 'absolute',
        width: this.planogramService.convertToPixel(
          this.itemData.Dimension.Width,
          this.itemData.$sectionID,
        ),
        height: this.planogramService.convertToPixel(
          this.itemData.Dimension.Height,
          this.itemData.$sectionID,
        ),
        bottom: this.planogramService.convertToPixel(0, this.itemData.$sectionID),
        left: this.planogramService.convertToPixel(0, this.itemData.$sectionID),
        zIndex: Math.ceil(this.itemData.Dimension.Depth * 101),
      };
      return style;
    } else {
      return;
    }
  }

  private drawFarFront(itemData: Section): void {
    if (this.panelService.ActivePanelInfo.sectionID === itemData.$sectionID) {
      let farFrontExists = false;
      for (let child of this.itemData.Children){
        if (child.ObjectDerivedType == AppConstantSpace.MODULAR && child.Fixture.FrontImage?.FarFrontUrl){
          farFrontExists = true;
          break;
        }
      }
      if (farFrontExists) {
        const scale = this.planogramService.convertToScale(this.itemData.$sectionID);
        const H = scale * itemData.Dimension.Height;
        const W = scale * itemData.Dimension.Width;
        const SVGBlock = `<svg  version="1.1" width="${W}" height="${H}" style="overflow: visible;" xmlns="http://www.w3.org/2000/svg">
                  <g transform="translate(0,${H}) scale(${scale},${-scale})">${this.modularSvgRender.SVGModularFront(itemData, scale)}</g></svg>`;
        this.SVGBlock = SVGBlock;
      } else {
        this.SVGBlock = "";
      }
    }
  }

}
