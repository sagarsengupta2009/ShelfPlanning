
export enum PogSideNaveView{ // TODO: @salma need to remove and use PogSideNaveViewDefault interface
    SHOPPING_CART="SC",
    PROPERTYGRID = 'PG',
    HIGHLIGHT = 'HL',
    PRODUCT_LIBRARY = 'PL',
    CHARTS = 'AC',
    POG_INFO = 'PI',
    POST_MESSAGE = 'PM',
    SHOPPING_CART_TOP = 'top',
    CLIPBOARD_BOTTOM = 'bottom'
}
export interface SideNavViewSetting{
    id:PogSideNaveView
    width:number;
    isPinned:boolean;
    pos?: string;
}
export enum PogSideNaveViewDefault{
    sappShoppingCartDialog="SC",
    sappPropertyGridDialog = 'PG',
    sappHighlightTool = 'HL',
    sappProductsSearchListDialog = 'PL',
    CHARTS = 'AC'
}

