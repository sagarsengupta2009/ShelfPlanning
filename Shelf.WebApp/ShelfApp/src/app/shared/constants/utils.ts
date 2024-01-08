import { AppConstantSpace } from 'src/app/shared/constants';
import { Dictionary, LookUpChildOptions } from 'src/app/shared/models';
import { AllFixtureList, FixtureList, ObjectListItem, PositionParentList } from '../services/common/shared/shared.service';
import { Basket, Block, BlockFixture, Coffincase, Crossbar, Divider, Fixture, Grill, Modular, PegBoard, Position, Section, ShoppingCart, SlotWall, StandardShelf } from '../classes';
import { PlanogramService } from '../services';
import { UtilsSVG } from '../services/svg-render/svg-render-common/svg-utils';

export class Utils {

    public static isRubberBandDrag: boolean = false;
    public static isFreeFlowDrag: boolean = false;
    public static objectDrag: boolean = false;
    public static isAnnotationDrag: boolean = false;
    public static shoppingCartFound: boolean;
    public static zIndex: number = 1;
    public static performanceColumns = [];

    public static generateGUID(): string {
        return UtilsSVG.generateGUID();
    }

    public static preciseRound(num: number, decimals: number): number {
        let sign = num >= 0 ? 1 : -1;
        // TODO: @malu - Do we need this big calculation? What are we doing?
        // Beware ! referred in 77 places in 11 files.
        // http://www.javascriptkit.com/javatutors/formatnumber.shtml
        let value = (Math.round((num * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
        return Number(value);
    };

    public static degToRad(degrees: number): number {
        return UtilsSVG.degToRad(degrees);
    };

    // used by console info
    public static getNextZIndexForBay(): number {
        Utils.zIndex += 10;
        return Utils.zIndex;
    }

    // The following statement handles FixtureType in a generic way
    // In the future we could have a PositionType and it would be uses for rendering
    // The format takes the ObjectType stirng append the word "Type" and looks for that name property in the property named the same as the ObjectType string
    // So for itemdata.ObjectType = "Fixture" we use itemdata.Fixture.FixtureType if it exists
    // Else we use itemdata.ObjectType
    // for POG there is no POGObjectType
    public static getFullObjectType(item?: { ObjectDerivedType: string }): string | undefined {
        return item?.ObjectDerivedType.toLowerCase();
    }

    public static findPropertyValue(obj: any, key: string, keyValue: number | string = '', fieldPath?: string): number {
        if (obj && key) {
            const fieldsArray = fieldPath?.split('.') ?? key.split('.');
            if (fieldsArray.length) {
                keyValue = obj;
                for (var i = 0; i < fieldsArray.length; i++) {
                    keyValue = keyValue[fieldsArray[i]];
                }
            } else if (Utils.isNullOrEmpty(keyValue)) {
                for (let keys in obj) {
                    if (keyValue != '') break;
                    if (keys == key) {
                        keyValue = obj[keys];
                        break;
                    } else if (typeof obj[keys] == 'object') {
                        keyValue = Utils.findPropertyValue(obj[keys], key, keyValue);
                    }
                }
            }
        }
        return keyValue == null ? 0 : keyValue as any;
    }

    public static checkIfFixture(item: { ObjectType: string; Fixture?: any }): item is AllFixtureList {
        return UtilsSVG.checkIfFixture(item);
    }

    public static checkIfDivider(item: ObjectListItem): item is Divider {
        return UtilsSVG.checkIfFixture(item) && item.Fixture.FixtureType == AppConstantSpace.DIVIDERS;
    }

    public static checkIfPosition(item: ObjectListItem): item is Position {
        return (
            item !== undefined &&
            item.Position !== undefined &&
            item.ObjectType == AppConstantSpace.POSITIONOBJECT &&
            typeof item.Position === AppConstantSpace.OBJECT
        );
    }

    public static checkIfGrill(item: ObjectListItem): item is Grill {
        return UtilsSVG.checkIfFixture(item) && item.Fixture.FixtureType === AppConstantSpace.GRILLOBJ;
    }

    public static checkIfMMShelfType(item: ObjectListItem, type: string): boolean {
        return (
            UtilsSVG.checkIfFixture(item) &&
            item.Fixture.IsMovable &&
            item.Fixture.IsMerchandisable &&
            item.Fixture.FixtureType === type
        );
    }

    public static checkIfBay(item: ObjectListItem): item is Modular {
        return (
            UtilsSVG.checkIfFixture(item) &&
            item.Fixture.IsMovable &&
            !item.Fixture.IsMerchandisable &&
            item.Fixture.FixtureType === AppConstantSpace.MODULAR
        );
    }

    public static checkIfstandardShelf(item: ObjectListItem): item is StandardShelf {
        return Utils.checkIfMMShelfType(item, AppConstantSpace.STANDARDSHELFOBJ);
    }

    public static checkIfPegboard(item: ObjectListItem): item is PegBoard {
        return Utils.checkIfMMShelfType(item, AppConstantSpace.PEGBOARDOBJ);
    }

    public static checkIfSlotwall(item: ObjectListItem): item is SlotWall {
        return Utils.checkIfMMShelfType(item, AppConstantSpace.SLOTWALLOBJ);
    }

    public static checkIfCrossbar(item: ObjectListItem): item is Crossbar {
        return Utils.checkIfMMShelfType(item, AppConstantSpace.CROSSBAROBJ);
    }

    public static checkIfBasket(item: ObjectListItem): item is Basket {
        return Utils.checkIfMMShelfType(item, AppConstantSpace.BASKETOBJ);
    }

    public static checkIfCoffincase(item: ObjectListItem): item is Coffincase {
        return UtilsSVG.checkIfFixture(item) && item.Fixture.IDFixtureType == 8;
    }

    public static checkIfShoppingCart(item: ObjectListItem): item is ShoppingCart {
        return UtilsSVG.checkIfFixture(item) && item.Fixture.FixtureNumber == -1;
    }

    public static checkIfBlock(item: ObjectListItem): item is BlockFixture {
        return (
            UtilsSVG.checkIfFixture(item) &&
            !item.Fixture.IsMerchandisable &&
            item.Fixture.FixtureType === AppConstantSpace.BLOCK_FIXTURE
        );
    }

    public static checkIfPegType(item: ObjectListItem): item is (PegBoard | SlotWall | Crossbar) {
        return (
            UtilsSVG.checkIfFixture(item) &&
            item.Fixture.IsMovable &&
            item.Fixture.IsMerchandisable &&
            (item.Fixture.FixtureType === AppConstantSpace.PEGBOARDOBJ ||
                item.Fixture.FixtureType === AppConstantSpace.SLOTWALLOBJ ||
                item.Fixture.FixtureType === AppConstantSpace.CROSSBAROBJ)
        );
    }

    public static findObjectKey(objects: { value: number; text: string }[], key: number): string {
        return objects.find(it => it.value == key)?.text || '';
    }

    /** false for readonly : true for r/w */
    public static getAccessType(rec: { Owner: string; AccessType: string; }): boolean {
        if (['Product', 'ProductPackage'].includes(rec.Owner)) return false;
        return rec.AccessType == 'R/W';
    }

    public static typeForPropGrid(dataType: number): string {
        return {
            1: 'text',
            2: 'date',
            3: 'bool',
            4: 'float',
            // 4: 'text',
            5: 'text',
            6: 'int',
            7: 'int',
            8: 'color',
        }[dataType] || 'text';
    }

    public static makeFormatType(FormatType: string): string {
        return Object.entries({
            string: ['BLOBType', 'StringType', 'UPCType'],
            number: ['WeightType', 'ShortDimensionType', 'CubicDimensionType', 'DecimalType', 'IntergerType'],
            date: ['DateType'],
            bool: ['BooleanTrueFalse']
        })
            .find(([key, value]) => value.includes(FormatType))
            ?.[0] || 'string';
    }

    public static makeExtendedField(dataType: number): string {
        return {
            1: 'DescData', // String Data
            2: 'DateData',
            3: 'FlagData', //bool
            4: 'ValData', //Float
            5: 'ImageData', //blob
            6: 'ValData', //long
            7: 'ValData', //int
            0: 'INVALIDFIELD', //NULL
        }[dataType] || 'DescData';
    }

    // shelf.comp highlight-setting.comp
    public static makeCalculatedFieldFromDict(dataDict: Dictionary, calculateFlag: boolean): string {
        return Utils.baseMakeFieldFromDict(dataDict, calculateFlag, true);
    }
    public static makeFieldFromDict(dataDict: Dictionary): string {
        return Utils.baseMakeFieldFromDict(dataDict, true, false);
    }

    private static baseMakeFieldFromDict(dataDict: Dictionary, calculateFlag: boolean = true, isCalculated = false): string {
        if (!dataDict?.Owner) {
            return dataDict?.DictionaryName;
        }
        let preText = '';
        let positionPath = 'Position.attributeObject';
        if (dataDict.AttributeType == 'Calculated' && dataDict.Expression != null
            && calculateFlag) {
            if (['PackageInventoryModel', 'PackageAttributes'].includes(dataDict.Owner)) {
                preText = 'Calc_';
            } else if (['Fixture', 'Position', 'Planogram'].includes(dataDict.Owner) || isCalculated) {
                preText = '_CalcField.';
            }
        }
        switch (dataDict.Owner) {
            case 'Position':
                if (dataDict.DictionaryName.startsWith('_')) {
                    if (dataDict.AttributeType == 'Calculated' && dataDict.Expression != null && calculateFlag) {
                        return preText + 'Position.' + dataDict.DictionaryName;
                    } else {
                        const extendedDataField = Utils.makeExtendedField(dataDict.DataType);
                        return preText + 'Position.' + dataDict.DictionaryName + '.' + extendedDataField;
                    }
                } else {
                    if (dataDict.DictionaryName.includes('@')) {
                        return preText + 'Position.' + dataDict.DictionaryName.split('@').join('.');
                    } else if (!dataDict.DictionaryName.includes('.')) {
                        return preText + 'Position.' + dataDict.DictionaryName;
                    }
                }
                break;
            case 'ProductPackage':
                if (dataDict.DictionaryName.startsWith('_')) {
                    if (isCalculated && dataDict.AttributeType == 'Calculated' && dataDict.Expression != null && calculateFlag) {
                        return preText + 'Position.ProductPackage.' + dataDict.DictionaryName;
                    } else {
                        const extendedDataField = Utils.makeExtendedField(dataDict.DataType);
                        return `${preText}Position.ProductPackage.${dataDict.DictionaryName}.${extendedDataField}`;
                    }
                } else {
                    if (dataDict.DictionaryName.includes('@')) {
                        return preText + 'Position.ProductPackage.' + dataDict.DictionaryName.split('@').join('.');
                    } else if (!dataDict.DictionaryName.includes('.')) {
                        return preText + 'Position.ProductPackage.' + dataDict.DictionaryName;
                    }
                }
                break;
            case 'Product':
                if (dataDict.DictionaryName.startsWith('_')) {
                    if (isCalculated && dataDict.AttributeType == 'Calculated' && dataDict.Expression != null && calculateFlag) {
                        return preText + 'Position.Product.' + dataDict.DictionaryName;
                    } else {
                        const extendedDataField = Utils.makeExtendedField(dataDict.DataType);
                        return preText + 'Position.Product.' + dataDict.DictionaryName + '.' + extendedDataField;
                    }
                } else {
                    if (dataDict.DictionaryName.includes('@')) {
                        return preText + 'Position.Product.' + dataDict.DictionaryName.split('@').join('.');
                    } else if (!dataDict.DictionaryName.includes('.')) {
                        return preText + 'Position.Product.' + dataDict.DictionaryName;
                    }
                }
                break;
            case 'Fixture':
                if (dataDict.DictionaryName.startsWith('_')) {
                    if (dataDict.AttributeType == 'Calculated' && dataDict.Expression != null && calculateFlag) {
                        return preText + 'Fixture.' + dataDict.DictionaryName;
                    } else {
                        const extendedDataField = Utils.makeExtendedField(dataDict.DataType);
                        return preText + 'Fixture.' + dataDict.DictionaryName + '.' + extendedDataField;
                    }
                } else {
                    if (dataDict.DictionaryName.includes('@')) {
                        return preText + 'Fixture.' + dataDict.DictionaryName.split('@').join('.');
                    } else if (!dataDict.DictionaryName.includes('.')) {
                        return preText + 'Fixture.' + dataDict.DictionaryName;
                    }
                }
                break;
            case 'Planogram':
                if (dataDict.DictionaryName.startsWith('_')) {
                    if (dataDict.AttributeType !== 'Calculated' || dataDict.Expression == null || !calculateFlag) {
                        const extendedDataField = Utils.makeExtendedField(dataDict.DataType);
                        return preText + dataDict.DictionaryName + '.' + extendedDataField;
                    }
                } else {
                    if (dataDict.DictionaryName.includes('@')) {
                        return preText + dataDict.DictionaryName.split('@').join('.');
                    } else if (!dataDict.DictionaryName.includes('.')) {
                        return preText + dataDict.DictionaryName;
                    }
                }
                break;
            case 'POGInventoryModel':
                return (isCalculated ? ('InventoryModel.' + preText) : (preText + 'InventoryModel.')) + dataDict.DictionaryName;
            case 'PackageInventoryModel':
                return 'Position.inventoryObject.' + preText + dataDict.DictionaryName;
            case 'PackageAttributes':
                if (dataDict.DictionaryName.startsWith('_') && (dataDict.AttributeType != 'Calculated' && dataDict.Expression == null || !calculateFlag)) {
                    const extendedDataField = this.makeExtendedField(dataDict.DataType);
                    return `${positionPath}.${preText}${dataDict.DictionaryName}.${extendedDataField}`
                } else {
                return `${positionPath}.${preText}${dataDict.DictionaryName}`;
                }

            default:
                return '';
        }
        return preText + dataDict.DictionaryName;
    }

    // property-grid.comp classes
    public static sortByYPos<T>(obj: T[]): T[] {
        return Utils.sortPositions(obj, [{ fun: 'getLocationY' }], [Utils.ascendingOrder]);
        /*return obj.sort(function (a, b) {
            return a.Location.Y - b.Location.Y;
        });*/
    }

    public static sortByXPos<T>(obj: T[]): T[] {
        return Utils.sortPositions(obj, [{ fun: 'getXPosToPog' }], [Utils.ascendingOrder]);
        /*return obj.sort(function (a, b) {
            return a.getXPosToPog() - b.getXPosToPog();
        });*/
    }

    // position section
    //bottom to top numbering and left to right counting the fixture numbering
    public static sortByXYPos<T>(obj: T[]): T[] {
        return Utils.sortPositions(
            obj,
            [{ fun: 'getLocationX' }, { fun: 'getLocationY' }],
            [Utils.ascendingOrder, Utils.ascendingOrder],
        );
    }

    // classes
    public static ascendingOrder(priority: { arg: {}; fun: string }, a: {}, b: {}) {
        return a[priority.fun].apply(a, priority.arg) - b[priority.fun].apply(b, priority.arg);
    }

    // classes
    public static descendingOrder(priority: { arg: {}; fun: string }, a: {}, b: {}) {
        return b[priority.fun]?.apply(b, priority.arg) - a[priority.fun]?.apply(a, priority.arg);
    }

    // classes d&d
    //right to left traffic flow and bottom to top calculation for fixture numbers
    public static sortPositions<T>(obj: T[], priorities: {}[], sortOrders: (({ }, { }, { }) => number)[], tolerance?: number): T[] {
        if (obj == undefined) {
            return obj;
        }
        if (obj.sort != undefined) {
            return obj.sort((a, b) => {
                const recursiceSort = (priorities: {}[], sortOrders: (({ }, { }, { }) => number)[], index: number) => {
                    if (!(priorities[index] == undefined)) {
                        var val = sortOrders[index](priorities[index], a, b);
                        if (val == 0 || Math.abs(val) < tolerance) {
                            index = index + 1;
                            return recursiceSort(priorities, sortOrders, index);
                        } else return val;
                    }
                };
                return recursiceSort(priorities, sortOrders, 0);
            });
        }
    }

    // classes
    public static sortByYPosDesendingOrder<T>(obj: T[]): T[] {
        return Utils.sortPositions(obj, [{ fun: 'getLocationY' }], [Utils.descendingOrder]);
    }

    // section pog.svc
    public static findFitCheckStatusText(options: LookUpChildOptions[], value: number): string | undefined {
        return options.find(it => it.value == value)?.text;
    }

    // classes shopping-cart.comp pog-common.svc pog-save.svc
    public static generateUID(): string {
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
    }

    public static isNullOrEmpty(obj: unknown): boolean {
        return UtilsSVG.isNullOrEmpty(obj);
    }

    public static getShoppingCartObj(children: ObjectListItem[]): ShoppingCart {
        return (children || []).find(Utils.checkIfShoppingCart);
    }

    // pog-renderer.svc 3d-pog.svc
    public static generateProductAuthSVGPattern(authPatternImageCollection): string {
        let SVG = '<svg height="2" width="2" xmlns="http://www.w3.org/2000/svg" version="1.1"><defs>';
        for (var attr in authPatternImageCollection) {
            SVG += `<pattern id="auth-code-pattern${attr}" patternUnits="userSpaceOnUse" width="2" height="2">
            <rect fill="white" height="100%" width="100%" />
            <image xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${authPatternImageCollection[attr]}"
                x="0" y="0" width="2" height="2" style="transform: rotate(180deg);transform-origin:center;">
                </image></pattern>`;
        }
        SVG += '</defs></svg>';
        return SVG;
    };

    // pog-renderer.svc 3d-pog.svc
    public static generateProductAuthCSS(authPatternImageCollection, mode?: 'SVG' | 'DOM'): string {
        const cdata = mode == 'SVG' ? ['<![CDATA[', ']]>'] : ['', ''];
        let dynCSS = `<style type="text/css">${cdata[0]}`;
        for (const attr in authPatternImageCollection) {
         dynCSS += `.planoDrawMode0 .posSKU.auth-code-pattern${attr},.planoDrawMode1 .posSKU.auth-code-pattern${attr},.planoDrawMode2 .posSKU.auth-code-pattern${attr}{fill: url(#auth-code-pattern${attr}) !important;display: block !important;}`;
        }
        return `${dynCSS}${cdata[1]}</style>`;
    }

    // pog-renderer.svc 3d-pog.svc
    public static generateLabelBGSVGPattern({ labelItem }: PlanogramService,label): string {
        const labelBackground = labelItem['POSITION_LABEL']["LABEL_"+label]["BACKGROUND_COLOR"];
        const labelBorder =  labelItem['POSITION_LABEL']["LABEL_"+label]["STROKE_COLOR"];
        return `<svg height="1" width="1" xmlns="http://www.w3.org/2000/svg" version="1.1" class="customlabelbackgroundcolorSVG">
            <defs><filter x="0" y="0" width="1" height="1" id="customlabelbackgroundcolor${label}">
            <feFlood flood-color="${labelBackground}"></feFlood>
            <feComposite in="SourceGraphic"></feComposite></filter></defs><filter id="customLabelBorder${label}">
            <feMorphology in="SourceAlpha" result="expanded" operator="dilate" radius="0.2"/>
            <feFlood flood-color="${labelBorder}"/>
            <feComposite in2="expanded" operator="in"/>
            <feComposite in="SourceGraphic"/>
          </filter></svg>`;
    }

    private static reUnescapedHtml = /[&<>"']/g;
    private static htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }

    // pog-renderer.svc 3d-pog.svc
    public static replacedHTMLEntityString(str: string): string {
        return UtilsSVG.replacedHTMLEntityString(str);
    }

    // pog-classes
    public static formatAssortMessage(toIndex: number, p: PositionParentList, IDProduct: number) {
        return {
            Left: toIndex == 0 ? null : p.Children[toIndex - 1].Position.IDProduct,
            Right: toIndex == p.Children.length - 1 ? null : p.Children[toIndex + 1].Position.IDProduct,
            IDProduct,
            FixtureNumber: p.Fixture.FixtureNumber,
            FixtureDesc: p.Fixture.FixtureType,
            Position: p.Children[toIndex].Position.PositionNo,
        };
    }


    // section quadtree.svc 2d-planogram.svc
    public static getAllTypeShelves<T>(types: string[], data: Section): T[] {
//        console.log('getAllTypeShelves', types,data.$id);
        const allShelfs: T[] = [];

        const recurseFixtureObjects = (objs: ObjectListItem[], types: string[]) => {
            if (objs && objs.length) {
                for (const fixtureRef of objs) {
                    if (types.includes(fixtureRef.ObjectDerivedType)) {
                        allShelfs.push(fixtureRef as any);
                        if ([AppConstantSpace.STANDARDSHELFOBJ, AppConstantSpace.BLOCKOBJECT]
                            .includes(fixtureRef.ObjectDerivedType)) {
                            recurseFixtureObjects(fixtureRef.Children, types);
                        }
                    } else if (fixtureRef.ObjectDerivedType === AppConstantSpace.MODULAR) {
                        recurseFixtureObjects(fixtureRef.Children, types);
                    }
                }
            }
        };

        recurseFixtureObjects(data.Children, types);
        return allShelfs;
    }

    //top to bottom numbering and left to right counting the fixture numbering
    public static sortByYDesXPos(obj: AllFixtureList[]): AllFixtureList[] {
        return Utils.sortPositions(
            obj,
            [{ fun: 'getLocationX' }, { fun: 'getLocationY' }],
            [Utils.ascendingOrder, Utils.descendingOrder],
        );
    }

    //right to left traffic flow and bottom to top calculation for fixture numbers
    public static sortByXEndYPos(obj: AllFixtureList[]): AllFixtureList[] {
        return Utils.sortPositions(
            obj,
            [{ fun: 'getPosEndX' }, { fun: 'getLocationY' }],
            [Utils.descendingOrder, Utils.ascendingOrder],
        );
    }

    // right to left traffic flow and top to bottom calculation for fixture numbers
    public static sortByYDecXEndPos(obj: AllFixtureList[]): AllFixtureList[] {
        return Utils.sortPositions(
            obj,
            [{ fun: 'getPosEndX' }, { fun: 'getLocationY' }],
            [Utils.descendingOrder, Utils.descendingOrder],
        );
    }
    public static getWidthOfTextByCanvas  (txt, fontname, fontsize, fontweight?) {
      return UtilsSVG.getWidthOfTextByCanvas(txt, fontname, fontsize, fontweight)
    }
}
