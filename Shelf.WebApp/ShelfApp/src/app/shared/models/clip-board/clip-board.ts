import { SafeHtml } from '@angular/platform-browser';
import { Annotation, Modular, Position } from '../../classes';
import { FixtureList } from '../../services/common/shared/shared.service';
import { Dimension, Product } from '../planogram';
import { ProductPackageResponse } from '../planogram-transaction-api';

export interface ClipBoardItem {
    ObjectDerivedType: string;
    clipId?: number;
    fixture?: FixtureList | Modular; // if fixture copied
    firstPosition?: ProductListItem; //if position copied
    productList?: ProductListItem[]; // if fixture or position copied
    annotations?: Annotation[]; //if annotation copied
    SVGBlock?: SafeHtml;
    isSelected?: boolean;
}

export interface ProductListItem extends Dimension {
    Product: Product;
    ProductPackage: ProductPackageResponse;
    temp: ClipBoardTempItem;
}

export interface ClipBoardTempItem {
    copiedFromPos?: Position;
    fromPOGId: number;
    fromPOGName: string;
}
