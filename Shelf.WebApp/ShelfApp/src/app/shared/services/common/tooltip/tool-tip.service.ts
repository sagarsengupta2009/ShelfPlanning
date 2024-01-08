import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Utils } from 'src/app/shared/constants';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { ConfigService, PlanogramStoreService } from 'src/app/shared/services';

@Injectable({
  providedIn: 'root'
})
export class ToolTipService {

  constructor(
    private readonly translate: TranslateService,
    private readonly config: ConfigService,
    private readonly planogramStore: PlanogramStoreService) { }

  createTemplate(object, for3D?: boolean) {
    let wid, tpl;
    //if(this.data.ObjectType == "Fixture"){
    if (object.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ || object.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ || object.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ || object.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ || object.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || object.ObjectDerivedType == AppConstantSpace.BASKETOBJ || object.ObjectDerivedType == AppConstantSpace.BLOCK_FIXTURE) { // for Shelf
      // toolTipObj = toolTipConfigFinal['fixtureToolTip'];
      wid = 325;
    } else if (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) { // for position
      // toolTipObj = toolTipConfigFinal['productToolTip'];
      wid = 410;
    } else if (object.ObjectDerivedType == AppConstantSpace.BLOCKOBJECT) { // for block in iAllocate mode
      // toolTipObj = toolTipConfigFinal['productToolTip'];
    } else {
      return;
    }
    if (for3D) {
      tpl = `<div style="visibility:visible;position:relative;border-color: rgba(100,100,100,.9);background-color: rgba(100,100,100,.9);color: #fff;"><div>`; //width:' + wid + 'px;
    } else if (for3D == undefined) {
      tpl = `<div style="visibility:visible;position:relative;"><div>`; //width:' + wid + 'px;
    }

    tpl += `<table><tbody>`;
    if (object.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT) { // for fixture
      let currFixobj = object;

      let notchNumberData = (object.Fixture.NotchNumber == null || object.Fixture.NotchNumber == undefined) ? "" : object.Fixture.NotchNumber;
      let LKCrunchModeData = (object.Fixture.LKCrunchMode == null || object.Fixture.LKCrunchMode == undefined) ? "" : object.Fixture.LKCrunchModetext;
      let MovementData = object._CalcField != undefined ? ((object._CalcField?.Fixture?._Movement == null || object._CalcField?.Fixture?._Movement == undefined) ? "" : object._CalcField?.Fixture?._Movement) : '';
      let linearAvailable = object._CalcField != undefined ? object._CalcField?.Fixture?.TotalWidth : '';
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("FIXTURE_TYPE")}</td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;"> ${object.Fixture.FixtureType}</td></tr >`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("FIXTURE_NAME")} </td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;line-height:10px;"> ${object.Fixture.FixtureDesc}</td></tr >`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("FIXTURE_DIMENSION")} </td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;line-height:12px"> ${Number(object.Dimension.Height).toFixed(2)} * ${Number(object.Dimension.Width).toFixed(2)} * ${Number(object.Dimension.Depth).toFixed(2)} </td></tr >`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("FIXTURE_NOTCHNO")}</td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;"> ${notchNumberData}</td></tr >`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("FIXTURE_LINEARAVAILABLE")} </td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;"> ${linearAvailable}</td></tr >`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("CRUNCH_MODE")} </td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;"> ${LKCrunchModeData}</td></tr >`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;line-height:12px">${this.translate.instant("FIXTURE_MOVEMENT")} </td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;"> ${MovementData}</td></tr >`;
    } else if (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
      let imgsrc = object.Position.ProductPackage.Images.front;
      if (!imgsrc) {
        imgsrc = AppConstantSpace.DEFAULT_PREVIEW_SMALL_IMAGE;
      }
      const imgFallback = `${this.config?.fallbackImageUrl}`;
      let uomData = (object.Position.Product.UOM == null || object.Position.Product.UOM == undefined) ? "" : object.Position.Product.UOM;
      let dosData = (object.Position.attributeObject.DOS == null || object.Position.attributeObject.DOS == undefined) ? "" : object.Position.attributeObject.DOS;
      let movementData = (object.Position.attributeObject.Movement == null || object.Position.attributeObject.Movement == undefined) ? "" : Number(object.Position.attributeObject.Movement).toFixed(2);
      let salesData = (object.Position.attributeObject.Sales == null || object.Position.attributeObject.Sales == undefined) ? "" : Number(object.Position.attributeObject.Sales).toFixed(2);
      let CapacityData = (object.Position.Capacity == null || object.Position.Capacity == undefined) ? "" : object.Position.Capacity;
      let casesData = (object.Position.Cases == null || object.Position.Cases == undefined) ? "" : object.Position.Cases;
      tpl += `<tr><td style="padding:20px" rowspan="13"><img src="${imgsrc}" style="max-height:120px;max-width:90px"   onerror="this.src='${imgFallback}'" alt="Washed Out" /></td></tr>`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("UPC")}</td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;">${object.Position.Product.UPC}</td></tr>`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("PRODUCT_NAME")}</td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;line-height:12px;white-space:pre-wrap; ">${object.Position.Product.Name}</td></tr>`;
      tpl += `<tr style="height:0px;line-height:10px;"><td style="padding:2px;padding-left: 9px;">${this.translate.instant("PRODUCT_SIZE")} / ${this.translate.instant("PRODUCT_UOM")}</td><td style="padding:2px;padding-left: 10px;">:</td> <td style="padding:2px;padding-left: 10px;">${object.Position.Product.Size} / ${uomData}</td></tr>`
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant('TOOLTIP_FACINGS')} </td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;">${object.Position.FacingsX}</td></tr>`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("INV_DOS")} </td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;">${dosData}</td></tr >`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("PACKAGEATTR_MOVEMENT")}</td ><td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;">${movementData}</td></tr >`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("PRODUCT_SIZE")} </td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;">${salesData}</td></tr >`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant('TOOLTIP_CAPACITY')} </td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;">${CapacityData}</td></tr >`;
      tpl += `<tr style="height:0px;line-height:2px;"><td style = "padding:10px;">${this.translate.instant("INV_CASES")} </td > <td style="padding:0px 10px 0px;">:</td> <td style="padding:10px;">${casesData}</td></tr >`;
    }
    tpl += `</tbody></table></div></div>`;
    return tpl;
  }

  public getToolTipConfig(isSvgTooltip: boolean): object[] {
    const settingName = isSvgTooltip ? 'TOOLTIP_SVG_SETTINGS' : 'TOOLTIP_SETTINGS';
    const settingValue = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.find(set => set.KeyName === settingName)?.KeyValue;
    return !Utils.isNullOrEmpty(settingValue) ? JSON.parse(settingValue as string) : [];
  }
}
