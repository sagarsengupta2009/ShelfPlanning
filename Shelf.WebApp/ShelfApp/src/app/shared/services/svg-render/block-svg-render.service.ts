import { Injectable } from '@angular/core';
import { Block } from '../../classes';
import { BlockSVG } from './svg-render-common/svg-block';

@Injectable({
  providedIn: 'root'
})
export class BlockSvgRenderService {
  private blockSVG;
  constructor() {
    this.blockSVG = new BlockSVG();
  }

  public renderBlockSvg(itemData: Block): string {
    return this.blockSVG.renderBlockSvg(itemData);
  }

  public renderBlockElement(itemData: Block, scale: number): string {
    return this.blockSVG.renderBlockElement(itemData, scale);
  }

}
