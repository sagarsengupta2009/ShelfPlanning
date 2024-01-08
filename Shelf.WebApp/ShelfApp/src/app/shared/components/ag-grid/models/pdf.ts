export const PDF_CONST_PARAMS = {
    PDF_HEADER_COLOR: "#f8f8f8",
    PDF_INNER_BORDER_COLOR: "#dde2eb",
    PDF_OUTER_BORDER_COLOR: "#babfc7",
    PDF_LOGO:
        "https://raw.githubusercontent.com/AhmedAGadir/ag-grid-todo-list-react-typescript/master/src/assets/new-ag-grid-logo.png",
    PDF_PAGE_ORITENTATION: "landscape",
    PDF_WITH_HEADER_IMAGE: false,
    PDF_WITH_FOOTER_PAGE_COUNT: true,
    PDF_HEADER_HEIGHT: 25,
    PDF_ROW_HEIGHT: 15,
    PDF_ODD_BKG_COLOR: "#fcfcfc",
    PDF_EVEN_BKG_COLOR: "#ffffff",
    PDF_WITH_CELL_FORMATTING: true,
    PDF_WITH_COLUMNS_AS_LINKS: true,
    PDF_SELECTED_ROWS_ONLY: false,
}

export interface PDF_PARAMS {
    PDF_HEADER_COLOR: string;
    PDF_INNER_BORDER_COLOR: string;
    PDF_OUTER_BORDER_COLOR: string;
    PDF_LOGO: string;
    PDF_PAGE_ORITENTATION: string;
    PDF_WITH_HEADER_IMAGE: boolean;
    PDF_WITH_FOOTER_PAGE_COUNT: boolean;
    PDF_HEADER_HEIGHT: number;
    PDF_ROW_HEIGHT: number;
    PDF_ODD_BKG_COLOR: string;
    PDF_EVEN_BKG_COLOR: string;
    PDF_WITH_CELL_FORMATTING: boolean;
    PDF_WITH_COLUMNS_AS_LINKS: boolean;
    PDF_SELECTED_ROWS_ONLY: boolean;
}

export interface DOC_DEFINATIONS {
    pageOrientation: string;
    header: {
        image: string;
        width: number;
        alignment: string;
        margin: number[];
    };
    footer: (currentPage: any, pageCount: any) => {
        text: string;
        margin: number[];
    };
    content: {
        style: string;
        table: {};
        layout: {};
    }[];
    images: {};
    styles: {};
    pageMargins: number[];
} 