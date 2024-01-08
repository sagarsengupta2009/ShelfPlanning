import { Injectable } from '@angular/core';
import { StandardShelf } from '../../classes';
import { ConfigService, PlanogramService } from '../common';
import { CommonSvgRenderService } from './common-svg-render.service';
import { StandardShelfSVG } from './svg-render-common/svg-standardshelf';
@Injectable({
    providedIn: 'root'
})
export class StandardshelfSvgRenderService {


    constructor(
        private readonly common: CommonSvgRenderService,
        private readonly config: ConfigService,
        private readonly planogramService: PlanogramService,
    ) {}

    public SVGShelfRenderer(shelf: StandardShelf, scale: number, params?: Parameters): Svg {
      let standardShelfSVG = new StandardShelfSVG();
      return standardShelfSVG.SVGShelfRenderer(shelf, scale, params, this.planogramService, this.config, window);
    }



}

// private

type Svg = string;

interface Parameters {

}
