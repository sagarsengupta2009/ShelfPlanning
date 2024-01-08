import { Injectable } from '@angular/core';
import { ConsoleLogService } from 'src/app/framework.module';
import { Orientation, Position } from '../../classes';
import { PlanogramService, PlanogramStoreService, SharedService, ConfigService } from '../common';
import { CommonSvgRenderService, Parameters } from './common-svg-render.service';
import { PositionSVG } from './svg-render-common/svg-position';
import { LabelsCommonService } from '../layouts';

declare const window: any;

@Injectable({
  providedIn: 'root',
})
export class PositionSvgRenderService {
  public orientation: Orientation = new Orientation();
  // private strokeWidth = 0.1;

  constructor(
    private readonly common: CommonSvgRenderService,
    private readonly sharedService: SharedService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly planogramService: PlanogramService,
    private readonly log: ConsoleLogService,
    private readonly config: ConfigService,
    private readonly labelsCommonService: LabelsCommonService,
  ) { }

  //----------position-----//
  public SVGPosition(itemData: Position, scale: number, params: Parameters): Svg {
    let clipboardparams ={};
    if (!params) {
      params = {};
    }
    if(params.mode == 'CBSVG'){
      clipboardparams ={origin : 'CB' , mode: 'CBSVG'}
    }
    params.Mode = 'SVG';
    let positionSVG = new PositionSVG();
    let parentItemData = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID);
    let sectionObj = this.sharedService.getObject(itemData.$sectionID, itemData.$sectionID);
    var SVGBlock = positionSVG.SVGPositionRenderer(itemData, scale, params, false, itemData.$sectionID, sectionObj, parentItemData, this.planogramService, this.planogramStore, this.labelsCommonService, this.config, window,clipboardparams);
    return SVGBlock;
  }


  public SVGPositionRenderer(position: Position, scale: number, params: Parameters, considerDisplayViewsFlag?: boolean, sectionID?: string): Svg {
    let positionSVG = new PositionSVG();
    let parentItemData = this.sharedService.getObject(position.$idParent, position.$sectionID);
    let sectionObj = this.sharedService.getObject(position.$sectionID, position.$sectionID);
    var SVGBlock = positionSVG.SVGPositionRenderer(position, scale, params, considerDisplayViewsFlag, sectionID, sectionObj, parentItemData, this.planogramService, this.planogramStore, this.labelsCommonService, this.config, window);
    return SVGBlock;
  }
}

// private

type Svg = string;


