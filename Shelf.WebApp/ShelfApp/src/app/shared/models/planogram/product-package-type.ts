import { ProductPackageSummary } from '../planogram-transaction-api';

export interface ProductPackageType {
    AvailablePackageTypes: ProductPackageSummary[];
    Idproduct: number;
}
