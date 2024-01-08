import {
  Component, OnDestroy, OnInit,
  AfterViewInit,
  Input
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Position } from 'src/app/shared/classes';
import { LabelCustomizedObject, labelData } from 'src/app/shared/models';
import { PlanogramStoreService, PlanogramService, ThreedPlanogramService, ShoppingCartService, LabelsCommonService } from 'src/app/shared/services';
import { SafeHtml } from '@angular/platform-browser';
import { LabelNumber } from 'src/app/shared/models/planogram-enums';

@Component({
  selector: 'sp-shopping-cart-label',
  templateUrl: './shopping-cart-label.html',
  styleUrls: ['./shopping-cart-label.scss'],
})
export class ShoppingCartLabelComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() public data: Position;
  @Input() public noImage: boolean;
  private subscriptions = new Subscription();
  public svg1: SafeHtml;
  public viewBox1: string;
  public xPos1: number;
  public yPos1: number;
  public rotation1: number;
  public labelData1: labelData;
  public labelData2: labelData;
  public transform1: string;
  public labelText1: string;
  public svg2: SafeHtml;
  public viewBox2: string;
  public xPos2: number;
  public yPos2: number;
  public rotation2: number;
  public transform2: string;
  public labelText2: string;
  private labelFieldObj1:LabelCustomizedObject;
  private labelFieldObj2:LabelCustomizedObject;
  constructor(private readonly planogramStore: PlanogramStoreService,
    public readonly planogramService: PlanogramService,
    private readonly threeDPlanogramService: ThreedPlanogramService,
    private readonly shoppingCartService: ShoppingCartService,
   private readonly labelsCommonService:LabelsCommonService) {
  }

  ngOnInit(): void {
    this.labelsCommonService.fromService = "SC";
    const currentLabel1 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'];
    const currentLabel2 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'];
    this.labelFieldObj1 = this.data.getLabelCustomizedObject({}, this.planogramService.labelField1,currentLabel1);
   this.labelFieldObj2 = this.data.getLabelCustomizedObject({}, this.planogramService.labelField2,currentLabel2); 
    this.updateSVGRenderer(this.data);
  }

  ngAfterViewInit(): void {
    this.updateSVGRenderer(this.data);
    this.subscriptions.add(
      this.shoppingCartService.updateLabelsInCart.subscribe((result) => {
        if (result) {
          this.updateSVGRenderer(this.data);
        }
      }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public labelsOn(): boolean {
    if (this.noImage && this.planogramStore.appSettings.showLabelIfNoPackageImage) return true;
    return this.planogramService.labelOn;
  }

  public getLabel1(itemData: Position): labelData {
    const labelData1 = this.threeDPlanogramService.createLabelPositionCanvas(itemData, true,LabelNumber.LABEL1);
    return labelData1;
  }
  public getLabel2(itemData: Position): labelData {
    const labelData2 = this.threeDPlanogramService.createLabelPositionCanvas(itemData, true,LabelNumber.LABEL2);
    return labelData2;
  }
  public updateSVGRenderer(itemData: Position): void {
    this.threeDPlanogramService.overlapOccured= false;
    this.threeDPlanogramService.bothVerticelOrientation = false;
    this.threeDPlanogramService.bothHorizontalOrientation = false;
    this.threeDPlanogramService.bothDifferentOrientation = {
        status: false,
        labelHorizontal: 0
    };
    this.threeDPlanogramService.labelFieldDetails = {};
    let shrinkFitFlag = false;
    if (this.labelsCommonService.checkLabelsShrinkFitStatus(this.labelFieldObj1,this.labelFieldObj2)) {
        shrinkFitFlag = true;
        this.labelData1 = this.getLabel1(itemData);
        this.labelData2 = this.getLabel2(itemData);
        this.labelsCommonService.checkForLabelHeights(itemData,this.threeDPlanogramService.labelFieldDetails,this.labelFieldObj1,this.labelFieldObj2,this.threeDPlanogramService,true)
        if(this.threeDPlanogramService.overlapOccured){
          this.labelData1 = this.getLabel1(itemData);
          this.labelData2 = this.getLabel2(itemData);
        }
      
    }
    if (this.planogramService.labelFeild1isEnabled && this.planogramService.labelField1.length) {
      this.labelData1 = this.threeDPlanogramService.overlapOccured && shrinkFitFlag ?this.labelData1:this.getLabel1(itemData);
      if (this.labelData1) {
        this.viewBox1 = `0 0 ${this.labelData1.imgWidth} ${this.labelData1.imgHeight}`;
        this.xPos1 = this.labelData1.svgTextObject.xPos;
        this.yPos1 = this.labelData1.imgHeight - this.labelData1.svgTextObject.yPos;
        this.rotation1 = this.labelData1.svgTextObject.rotateDeg == 90 ? 270 : 0;
        this.transform1 = `translate(${this.xPos1},${this.yPos1}) rotate(${this.rotation1})`;
        this.labelText1 = this.labelData1.svgTextObject.textSVG;
      }
    }
    if (this.planogramService.labelFeild2isEnabled && this.planogramService.labelField2.length) {
     this.labelData2 = this.threeDPlanogramService.overlapOccured && shrinkFitFlag?this.labelData2:this.getLabel2(itemData);
     if (this.labelData2) {
        this.viewBox2 = `0 0 ${this.labelData2.imgWidth} ${this.labelData2.imgHeight}`;
        this.xPos2 = this.labelData2.svgTextObject.xPos;
        this.yPos2 = this.labelData2.imgHeight - this.labelData2.svgTextObject.yPos;
        this.rotation2 = this.labelData2.svgTextObject.rotateDeg == 90 ? 270 : 0;
        this.transform2 = `translate(${this.xPos2},${this.yPos2}) rotate(${this.rotation2})`;
        this.labelText2 = this.labelData2.svgTextObject.textSVG;
      }
    }
  }
}
