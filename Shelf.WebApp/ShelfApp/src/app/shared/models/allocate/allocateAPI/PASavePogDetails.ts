export interface PAPSavePogDetails {
    pogID: number | string;
    ruleSetId: number;
    scenarioID: number;
    azureBlobToken: string;
    pogType: string;
    dateRefreshed: string;
}
