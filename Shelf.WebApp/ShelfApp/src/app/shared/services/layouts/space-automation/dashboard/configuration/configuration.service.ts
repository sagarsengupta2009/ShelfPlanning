import { Injectable } from '@angular/core';
import { Utils } from 'src/app/shared/constants/utils';
import { Dictionary, WorksheetType } from 'src/app/shared/models';
import { ColorService, SharedService } from 'src/app/shared/services';

interface Record {
  fieldConfig: FieldConfig
  attributes: Attributes
  headerAttributes: HeaderAttributes
  color: string,
  field: string,
  template: string,
  title: string,
  type: string,
  editable: boolean,
  format: string,
  editor: string,
  group: string,
  DataType: number,
  filterable: boolean
  width: string
}

interface FieldConfig {
  validation: Editable

}
interface Editable {
  editable: boolean
}

interface Attributes {
  class: string
  style: string
}

interface HeaderAttributes {
  class: string
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  constructor(
    private readonly color: ColorService,
    private readonly sharedService: SharedService,
  ) { }

  public StatusBarCustomConfigFromDict = (res) => {
    let record: any = {};
    record.field = Utils.makeFieldFromDict(res);
    record.title = res.ShortDescription;
    record.type = Utils.typeForPropGrid(res.DataType);
    record.value = '';
    record.LkUpGroupName = res.LkUpGroupName;
    return record;
  };

  public worksheetConfigFromDict(res: Dictionary, worksheetType: WorksheetType): Record {
    const hasAccess = Utils.getAccessType(res);
    const colorCode = this.color.addColorCode(res);
    const formatType = Utils.makeFormatType(res.FormatType);
    const gridPropertyType = Utils.typeForPropGrid(res.DataType);

    const isPositionWorkSheet = worksheetType === WorksheetType.PositionWS
    const isPositionOrInventoryWS = isPositionWorkSheet || worksheetType === WorksheetType.InventoryWS;

    let record: Record = {
      color: colorCode,
      attributes: {
        class: (!hasAccess) ? 'cell-readonly-color' : "",
        style: undefined
      },
      headerAttributes: {
        class: 'cell-header-color ' + colorCode.slice(1),
      },
      field: Utils.makeFieldFromDict(res),
      title: res.ShortDescription,
      type: formatType,// string or number
      editable: hasAccess,
      fieldConfig: {
        validation: { editable: hasAccess }
      },
      template: undefined,
      format: undefined,
      editor: undefined,
      group: undefined,
      DataType: res.DataType || undefined,
      filterable: undefined,
      width: undefined,
    };

    if (formatType == 'date') {
      record.template = '#= kendo.toString(kendo.parseDate(' + record.field + '), "yyyy-MMM-dd HH:mm")#'
    }

    if (record.type == "number") {
      record.attributes.style = "text-align: right;";
      record.format = '{0:0}';
    } else if (gridPropertyType == 'color') {
      record.attributes.style = "color: transparent; background-color: #=Position.attributeObject.Color_color#; ";
      record.editor = res.DictionaryName;
      record.filterable = false;
    }

    if (gridPropertyType == 'float') {
      record.format = '{0:' + this.sharedService.iSHELF['roundValue'] + '}';
    }

    if (record.type == 'bool') {
      if (record.editable) {
        if (isPositionOrInventoryWS) {
          record.template = "<input type='checkbox' style='position:static;' title='" + record.field + "' data-bind='checked: " + record.field + "' id='SelectedCB' #= " + record.field + " ? checked='checked' : '' # />";
        } else {
          record.template = "<input class='fixWsCB' style='position:static;' type='checkbox' title='" + record.field + "' data-bind='checked: " + record.field + "' id='SelectedCB' #= " + record.field + " ? checked='checked' : '' # />";
        }
      } else {
        if (isPositionOrInventoryWS) {
          record.template = "<input type='checkbox' style='position:static;' id='SelectedCB' #= " + record.field + " ? checked='checked' : '' # disabled='disabled'/>";
        } else {
          record.template = "<input class='fixWsCB' style='position:static;' type='checkbox' id='SelectedCB' #= " + record.field + " ? checked='checked' : '' # disabled='disabled'/>"
        }
      }
    }

    if (typeof res.LkUpGroupName != "undefined" && ((res.LkUpGroupName != "NULL") && (res.LkUpGroupName != null))) {
      record.editor = res.DictionaryName;
      record.group = res.LkUpGroupName;
    }

    //lockable/locked
    if (isPositionOrInventoryWS) {
      this.makeLockedColumn(record);
    }
    return record;
  }

  //make EYC global
  private makeLockedColumn(rec) {
    if (['Fixture.ModularNumber', 'Position.PositionNo', 'Fixture.FixtureNumber', 'Position.Product.UPC']
      .includes(rec.field)) {
      rec.lockable = false;
      rec.locked = true;
    }
  }
}
