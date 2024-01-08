import { Position } from "../../classes";
import { PogObject, Dimension, Planogram, Fixture } from "../planogram/";
import { GalleryFixture } from "./gallery-fixture";

export interface FixtureGalleryDataVM extends GalleryFixture {
    ChildOffset: Location;
    ChildDimension: Dimension;
    Children?: PogObject[];
    Color: string;
    Dimensions: Dimension;
    Fixture: Fixture;
    IdCorp?: number;
    IDPOGObject?: number;
    IDPOGObjectParent?: number;
    Location: Location;
    ObjectType: string;
    ParentPogObject?: PogObject;
    Planogram: Planogram;
    Position: Position;
    Rotation: Location;
    RotationOrigin: Location;
    TempId: string;
    TempParentId: string;
}