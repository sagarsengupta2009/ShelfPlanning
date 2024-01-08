import { Injectable } from '@angular/core';
import { ColorService, ConfigService } from '..';
import { Modular, Section } from '../../classes';
import { CommonSvgRenderService, Svg } from './common-svg-render.service';
import { ModularSVG } from './svg-render-common/svg-modular';

@Injectable({
  providedIn: 'root'
})
export class ModularSvgRenderService {
  private modularSVG;
  constructor(
    private readonly common: CommonSvgRenderService,
    private readonly config: ConfigService,
    private readonly color: ColorService,
  ) {
    this.modularSVG = new ModularSVG();
  }

  public SVGModularRenderer(modular: Modular, scale: number): Svg {
    return this.modularSVG.SVGModularRenderer(modular, scale, this.config, window);
  };

  //-------------//

  //----Modular front------//
  public SVGModularFront(itemData: Section, scale: number): Svg {
    return this.modularSVG.SVGModularFront(itemData, scale, this.config, window);
  }

  private SVGModularFrontRenderer(itemData: Section, scale: number): Svg {
    return this.modularSVG.SVGModularFrontRenderer(itemData, scale, this.config, window);
  };

}
