import { Injectable } from '@angular/core';
import { Utils } from 'src/app/shared/constants';
import { Dictionary } from 'src/app/shared/models';
import { ColorSVG } from '../../svg-render/svg-render-common/svg-color';

@Injectable({
    providedIn: 'root'
})
export class ColorService {

    // pog-renderer.svc 3d-pog.svc
    public getIntColor(stringColor: string, defaultColor: number): number {
      let colorSVG = new ColorSVG();
      return colorSVG.getIntColor(stringColor, defaultColor);
    }

    // shelf.comp config.svc
    public addColorCode(dictObj: Dictionary): `#${string}` {

        if (dictObj.Owner == 'Product' || dictObj.Owner == 'ProductPackage') {
            return '#BBDEFB'; //blue
        }

        if (dictObj.Owner == 'PackageAttributes') {
            let colorCode: `#${string}` = '#BBDEFB'; //blue
            if (dictObj.FieldQualifier == 'R') {
                colorCode = '#FFCC80'; //orange
            }
            if (dictObj.FieldQualifier == 'P') {
                colorCode = '#C5E1A5'; //green
                if (Utils.performanceColumns.indexOf(dictObj.IDDictionary) == -1) {
                    Utils.performanceColumns.push(dictObj.IDDictionary);
                }
            }
            return colorCode;
        }

        if (dictObj.Owner == 'PackageInventoryModel') {
            return '#F4FF81'; //yellow
        }

        return '#EEEEEE'; //grey
    }



    // reference: https://stackoverflow.com/questions/3018313/algorithm-to-convert-rgb-to-hsv-and-hsv-to-rgb-in-range-0-255-for-both
    private hsv2rgb(h: number, s: number, v: number): string {
        if (s == 0) {
            return this.toHexadecimalString(v, v, v);
        }

        let r: number, g: number, b: number;

        let var_h = h * 6;
        if (var_h == 6) { var_h = 0; }

        const var_i = Math.floor(var_h);

        let var_1 = v * (1 - s);
        let var_2 = v * (1 - s * (var_h - var_i));
        let var_3 = v * (1 - s * (1 - (var_h - var_i)));

        switch (var_i) {
            case 0:
                r = v; g = var_3; b = var_1;
                break;
            case 1:
                r = var_2; g = v; b = var_1;
                break;
            case 2:
                r = var_1; g = v; b = var_3;
                break;
            case 3:
                r = var_1; g = var_2; b = v;
                break;
            case 4:
                r = var_3; g = var_1; b = v;
                break;
            default:
                r = v; g = var_1; b = var_2;
                break;
        }

        return this.toHexadecimalString(r, g, b);
    }

    private toHexadecimalString(r: number, g: number, b: number): string {

        const decimalColor = Math.round(r * 255)
            + 256 * Math.round(g * 255)
            + 65536 * Math.round(b * 255);

        return decimalColor.toString(16);
    }

    private h: number = Math.random();
    private s: number = 0.5;
    private v: number = 0.95;

    public generateRandomRgbColor(): `#${string}` {
        let range = 0.618033988749895;
        this.h = (this.h + range) % 1;
        return `#${this.hsv2rgb(this.h, this.s, this.v)}`;
    }

    public isValidHEXColor(str: string): boolean {
        return str.match(/^#[a-f0-9]{6}$/i) !== null;
    }

    public validateItemColor(itemColor: string): string {
        if (isNaN(Number(itemColor))) {
            return this.isValidHEXColor(itemColor) ? itemColor : '#FFFFFF';
        } else {
            return `#${Number(itemColor).toString(16).padStart(6, '0')}`;
        }
    }
}
