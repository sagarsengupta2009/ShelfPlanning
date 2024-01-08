import { Injectable } from '@angular/core';
import { PlanogramService } from 'src/app/shared/services/common/planogram/planogram.service';
import { ObjectListItem, SharedService } from 'src/app/shared/services/common/shared/shared.service';
import { Utils } from 'src/app/shared/constants';
import { PlanogramStoreService, ConfigService } from 'src/app/shared/services';
import { RecursiveSVG } from './svg-render-common/svg-recursive';
import { Section } from '../../classes';
import { CommonSvgRenderService, Parameters, Svg } from './common-svg-render.service';

declare const window: any;

@Injectable({
  providedIn: 'root',
})
export class PlanogramSvgRenderService {

  // private staticParams = { nextX: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  constructor(
    private readonly planogramService: PlanogramService,
    private readonly sharedService: SharedService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly config: ConfigService
  ) { }



  //----------//


  public getAuthCodeForView(itemData?: ObjectListItem) {
    if (this.planogramService.ruleSets || this.planogramService.isReviewMode) {
      if (window.parent.currentProjectType != 'NICI') {
        return 'auth-code-pattern0';
      }
    }
    let patternID = '';
    if (itemData.Position.Product.ProdAuth == undefined) return patternID;
    if (Utils.isNullOrEmpty(itemData.Position.Product.ProdAuth.AuthFlag)) return patternID;
    return 'auth-code-pattern' + itemData.Position.Product.ProdAuth.AuthFlag;
  }

  //--------------------------//

  // Clipping may not work well if the scale is other than 1
  public ModeCls(itemData: ObjectListItem,): string {
    if (this.planogramService.rootFlags[itemData.$id]) {
      // temp fix need to remove
      return 'planoDrawMode' + this.planogramService.rootFlags[itemData.$id].mode;
    }
    return 'planoDrawMode' + 0;
  };
  public SVG(itemData: Section, scale: number, parameters: Parameters): string {
    //services
    let planogSvc = this.planogramService;
    let planogStore = this.planogramStore;
    let sharedSvc = this.sharedService;
    let jquerySvc;
    let recursive = new RecursiveSVG();
    //
    return recursive.SVG(itemData, scale, parameters, planogSvc, planogStore, sharedSvc, null, this.config, window);

  }


  public SVGElement(element: ObjectListItem, scale: number, params: Parameters, cbFixture = null): string {
    let staticParams = { nextX: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let recursive = new RecursiveSVG();
    const sectionObj = this.sharedService.getObject(element.$sectionID, element.$sectionID) as Section;
    return recursive.SVGElement(element, scale, params, staticParams, this.planogramService, this.planogramStore, this.sharedService, sectionObj, this.config, window, cbFixture);

  }




}
