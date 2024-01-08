import { Store } from '../store/stores';

export interface PogTemplateRequestVM {
    IdPog: number;
    IdScenario: number;
    IdHierarchy: number;
    StoreData?: Store[],
    pogType: number;
}