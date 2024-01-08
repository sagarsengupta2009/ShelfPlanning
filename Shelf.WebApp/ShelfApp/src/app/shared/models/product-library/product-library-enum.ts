export enum ProductLibraryMenus {
    pogProductLibView_VIEW_LIST = 'pogProductLibView_VIEW_LIST',
    pogProductLibView_VIEW_GRID = 'pogProductLibView_VIEW_GRID',
    pogProductLibView_VIEW_PRODHIRARCHY = 'pogProductLibView_VIEW_PRODHIRARCHY',
    pogProductLibView_SORT_UPC = 'pogProductLibView_SORT_UPC',
    pogProductLibView_SORT_BRAND = 'pogProductLibView_SORT_BRAND',
    pogProductLibView_SORT_SIZE = 'pogProductLibView_SORT_SIZE',
    pogProductLibView_SORT_NAME = 'pogProductLibView_SORT_NAME',
    pogProductLibView_SORT_SKU = 'pogProductLibView_SORT_SKU',
    pogProductLibView_SORT_RETAIL = 'pogProductLibView_SORT_RETAIL',
    pogProductLibView_PIN = 'pogProductLibView_PIN',
    pogProductLibView_UNPIN = 'pogProductLibView_UNPIN',
    pogProductLibView_PIN_WINDOW = 'pogProductLibView_PIN_WINDOW',
    pogProductLibView_OPENINWINDOW = 'pogProductLibView_OPENINWINDOW',
    PohHighlightView_CLOSE = 'PohHighlightView_CLOSE',
    pogProductLibView_SELECTALL = 'pogProductLibView_SELECTALL',
    pogProductLibView_SETTTINGS = 'pogProductLibView_SETTTINGS',
    pogProductLibView_FILTERITEMINSHELF_CHECK = 'pogProductLibView_FILTERITEMINSHELF_CHECK',
    pogProductLibView_FILTERITEMINSHELF = 'pogProductLibView_FILTERITEMINSHELF',
    pogProductLibView_ADDCART = 'pogProductLibView_ADDCART',
    pogProductLibView_REMOVE = 'pogProductLibView_REMOVE'
}

export enum ProductLibraryViewMode {
    ListView = 1,
    ProductHierarchyView = 2,
    GridView = 3
}

export enum OrderByAscAndDesc  {
    UPC = 'Product.UPC',
    BRAND = 'Product.Brand',
    SIZE = 'Product.Size',
    NAME = 'Product.Name',
    SKU = 'Product.SKU',
    RETAIL = 'ProductPackage.Retail'
}
