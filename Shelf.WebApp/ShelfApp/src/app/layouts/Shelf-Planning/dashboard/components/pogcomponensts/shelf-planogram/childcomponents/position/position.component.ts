import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Utils } from 'src/app/shared/constants/utils';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { Position, Section } from 'src/app/shared/classes';
import { StoreAppSettings, SvgToolTip } from 'src/app/shared/models';
import {
  ToolTipService,
  PlanogramStoreService,
  PlanogramService,
  SharedService,
  LocalSearchService,
  PositionSvgRenderService,
} from '../../../../../../../../shared/services';
import { PogComponent } from '../pog.component';
import { UtilsSVG } from 'src/app/shared/services/svg-render/svg-render-common/svg-utils';
@Component({
  selector: 'sp-position',
  templateUrl: './position.component.html',
  styleUrls: ['./position.component.scss'],
})
export class PositionComponent extends PogComponent implements OnInit, OnDestroy {

  @ViewChild('position', { static: true }) position: ElementRef;
  @Input() data: Position;
  @ViewChild('dataContainer') dataContainer: ElementRef;

  public SVGBlock: string;
  public get AppSettingsSvc(): StoreAppSettings {
    return this.planogramStore.appSettings;
  }
  public positionStyle: {
    filter: string,
    opacity: number
  }
  public ToolTipData: Array<{ keyName: string; value: string | number }>;

  constructor(
    public sharedService: SharedService,
    private planogramService: PlanogramService,
    private planogramStore: PlanogramStoreService,
    public localSearchService: LocalSearchService,
    private cdr: ChangeDetectorRef,
    private tooltipService: ToolTipService,
    private positionSvgRender: PositionSvgRenderService,
  ) { super(); }

  ngOnInit(): void {
    this.renderAgain();
    // TODO optimize
    this.subscriptions.add(
      this.sharedService.updatePosition.subscribe((id) => {
        if (id == this.data.$id) {
          this.updateFacingx();
          this.renderAgain();
          this.updateSvg(this.SVGBlock);
          this.planogramService.updateNestedStyleDirty = true;;
          this.cdr.detectChanges();
        }
        this.sharedService.updateFooterNotification.next(true);
      }),
    );

    this.subscriptions.add(
      this.sharedService.renderPositionAgainEvent.subscribe((res) => {
        if (res) {
          this.renderPositionAgain();
        }
      }),
    );

    this.subscriptions.add(
      this.sharedService.renderDividersAgainEvent.subscribe((res) => {
        if (res) {
          this.renderPositionAgain();
        }
      }),
    );

    this.subscriptions.add(
      this.sharedService.updateValueInPlanogram.subscribe((result) => {
        const activeSectionID = this.sharedService.getActiveSectionId();
        if(activeSectionID === this.data.$sectionID || (result?.['updateInInactiveSection']?.flag && result?.['updateInInactiveSection']?.sectionID === this.data.$sectionID)){
          if (result && result[`products`]) {
            if (result[`products`].length === 1) {
              let matchProduct = result[`products`].filter(
                (element) => element.IDPOGObject === this.data['IDPOGObject'],
              )[0];
              if (matchProduct) {
                this.updateFacingx();
                this.renderAgain();
                this.updateSvg(this.SVGBlock);
              }
            }
            else {
              this.updateFacingx();
              this.renderAgain();
              this.updateSvg(this.SVGBlock);
            }
          }
          this.planogramService.updateNestedStyleDirty = true;;
          this.cdr.detectChanges();
        }
      }),
    );

    this.subscriptions.add(
      this.sharedService.turnoNOffSub.subscribe((res) => {
        this.cdr.markForCheck();
      }),
    );
    this.subscriptions.add(
      this.planogramService.highlightPositionEmit.subscribe((res) => {
        this.positionStyle = this.stylePosition(this.data);
        this.cdr.detectChanges();
      }),
    );
  }

  private renderPositionAgain(): void{
    this.renderAgain();
    if (this.dataContainer) {
      this.updateSvg(this.SVGBlock);
      this.cdr.markForCheck();
    }
  }

  ngAfterViewInit(): void {
    this.positionStyle = this.stylePosition(this.data);
    this.updateSvg(this.SVGBlock);
  }

  public stylePosition(child: Position): { filter: string; opacity: number } {
    let style: { filter: string; opacity: number } = {
      filter: '', opacity: undefined
    };
    const sectionId = this.sharedService.getActiveSectionId();
    const settingsBySection = this.planogramService.getSettingsBySectionId(sectionId);
    //added condition to revert opacity if local serch is removed
    if (!this.localSearchService.localSearchStatus) {
      [...this.position.nativeElement.children].forEach((element) => {
        element.style.opacity = '1';
      });
    }
    if (settingsBySection.isEnabled && !this.planogramService.localSearchStatus) {
      style.filter = 'grayscale(100%)';
      style.opacity = 0.7;
    }
    if (child.hasAbilityForLocalSearch && this.localSearchService.localSearchStatus) {
      if (!child.localSearchFlag) {
        [...this.position.nativeElement.children].forEach((element) => {
          element.style.opacity = '0.1';
        });
      } else {
        [...this.position.nativeElement.children].forEach((element) => {
          element.style.opacity = '1';
        });
      }
    }
    return style;
  }

  public updateFacingx(): void {
    const currentFixture = this.sharedService.getParentObject(this.data, this.data.$sectionID);
    // currentFixture.computePositionsAfterChange(ctx);
    const planogramObject = this.sharedService.getObject(currentFixture.$sectionID, currentFixture.$sectionID) as Section;
    if (!planogramObject.fitCheck) {
      this.planogramService.rootFlags[this.data.$sectionID].isActionPerformed++;
    }
  }


  public renderAgain(): void {
    const scale = this.planogramService.convertToScale(this.data.$sectionID);
    this.SVGBlock = this.DOM(this.data, scale);
    /*setTimeout(() => {
      document.querySelectorAll('.posImage').forEach((item) => {
        //@Sagar: Needs to be handled in a different user story - 123621 related to DOM manipulation
        item.addEventListener('error', (event: any) => {
          // event.target.setAttribute('xlink:href', "/Areas/ShelfPlanning/ClientApp/assets/images/errors/broken_image_black.png")
        });
      });
    });*/
  }

  public DOM(itemData: Position, scale: number): string {
    let w: number;
    let h = scale * itemData.Dimension.Height;
    const parentItemData = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID);
    if (
      parentItemData.Fixture.DisplayViews != '1' &&
      (parentItemData.ObjectDerivedType === AppConstantSpace.BASKETOBJ ||
        parentItemData.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ)
    ) {
      h = scale * itemData.Dimension.Depth;
    }

    // check for whitespace for svg space allocation
    if (
      !Utils.isNullOrEmpty(itemData.Position.attributeObject.WhiteSpacePosition) &&
      itemData.Position.attributeObject.WhiteSpacePosition != 0
    ) {
      w += itemData.Position.attributeObject.WhiteSpaceWidth;
    }
    w = scale * itemData.Dimension.Width;
    let params = { "Mode": 'DOM' };

    let svgHeight = h;
    if (parentItemData.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ && itemData.Position.EdgeImage?.Url) {
      svgHeight += (scale * parentItemData.Fixture.Thickness * Math.cos(UtilsSVG.degToRad(parentItemData.Rotation.X)));
    }
    //in extremely large sections standard shelfs are not selectable.
    //so below style is added to DOM
    let SVGHeader =
      `<svg class="svgPosition" data-itemdataID="${itemData.$id}" version="1.1" height="${svgHeight}" width="${w}" \
      xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> \
      <g transform="translate(0,${h}) scale(${scale}, ${-scale})">`;
    // Foreshortening for sloped shelves
    let YScaleFactor = 1;
    if ('FrontScale' in itemData.$packageBlocks && itemData.$packageBlocks.FrontScale != 1) {
      YScaleFactor = itemData.$packageBlocks.FrontScale;
    }

    if (YScaleFactor != 1) {
      SVGHeader += `<g transform="scale(1,${YScaleFactor})">`;
    } else {
      SVGHeader += '<g>';
    }

    const SVGTail = `</g></g></svg>`;
    const SVGBlock = SVGHeader + this.positionSvgRender.SVGPositionRenderer(itemData, scale, params, true, itemData.$sectionID) + SVGTail;
    return SVGBlock;
  }

  public templateData(object): string {
    // @Sagar: this function is not getting called so couldn't derive the type of the param, need to see later
    if (this.sharedService.turnoff_tooltip) {
      return this.tooltipService.createTemplate(object);
    }
  }

  public getToolTipData(): SvgToolTip[] {
    return this.planogramService.getPlanogramToolTipData(this.data);
  }

  public checkplanogram(): string {
    this.ToolTipData = this.getToolTipData();
    const image = this.ToolTipData.find((x) => x.keyName === 'Image').value as string;
    const index = this.ToolTipData.indexOf(
      this.ToolTipData.find((x) => x.keyName == 'Image'),
      0,
    );
    if (index > -1) {
      this.ToolTipData.splice(index, 1);
    }
    return image;
  }

}
