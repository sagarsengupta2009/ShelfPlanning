export interface PACheckinCheckOut {
    checkedOutTo: string;
    // TODO @karthik if we are to depreciate direct blob access, neeed to get rid of this as well.
    jsonAccessInfo?: string;
    svgAccessInfo?: string;
}
