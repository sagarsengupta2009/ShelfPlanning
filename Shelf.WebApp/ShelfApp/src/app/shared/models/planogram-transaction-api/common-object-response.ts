import { Dimension } from '../planogram';
import { Location } from './pog-object-response';

export interface CommonResponseObject {
  Location: Location;
  Dimension: Dimension;
}
