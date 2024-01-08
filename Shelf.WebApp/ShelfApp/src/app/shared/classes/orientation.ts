import { OrientationBase } from "../services/svg-render/svg-render-common/svg-orientation";

export interface OrientationDimensions {
  X: number;
  Y: number;
  Z: number;
  Width: number;
  Height: number;
  Depth: number;
}

export class Orientation {
  private OrientBase;
  public View;
  public Orientation;
  public LayoverOrientation;
  public LayoverOrientationCoffinTypes;
  public ImageViewElement;
  public ImageViews;
  public ViewOrientation;
  public DimensionMap;
  public OrientationToDim;

  constructor() {
    this.OrientBase = new OrientationBase();
    this.View = this.OrientBase.View;
    this.Orientation = this.OrientBase.Orientation;

    this.LayoverOrientation = this.OrientBase.LayoverOrientation;

    this.LayoverOrientationCoffinTypes = this.OrientBase.LayoverOrientationCoffinTypes;

    this.ImageViewElement = this.OrientBase.ImageViewElement;

    this.ImageViews = this.OrientBase.ImageViews;

    this.ViewOrientation = this.OrientBase.ViewOrientation;

    this.DimensionMap = this.OrientBase.DimensionMap;


    this.OrientationToDim = this.OrientBase.OrientationToDim;
  }

  // GetDimensions
  // Returns an array containing the product dimensions
  // based on the orientation, whether it is a layover or not, and the position view from
  // Inputs:
  //     Orient: One of the 24 values found in the "Orientation" hash table (above)
  //     Lay: Whether this is a LayOver or not (0 or 1)
  //     View: One of the six directions the product is viewed from. Found in the "View" hash table (above)
  //     Width, Height, Depth: The product dimensions
  // Returns:
  // An array of three elements containing the new dimensions.
  // use the "DimensionMap" to access the appropriate element (above).
  // Also returns the dimension as Width, Height, Depth, X, Y, and Z attributed
  GetImageFaceAndRotation = (Orient, Lay, View) => {
   return this.OrientBase.GetImageFaceAndRotation(Orient, Lay, View);
  }


  // GetImageFaceAndRotation
  // Returns the Image face and rotation
  // based on the orientation, whether it is a layover or not, and the position view from
  // Inputs:
  //     Orient: One of the 24 values found in the "Orientation" hash table (above)
  //     Lay: Whether this is a LayOver or not (0 or 1)
  //     View: One of the six directions the product is viewed from. Found in the "View" hash table (above)
  // Returns:
  // An array of two element containing the Image Face and the Rotation for the image.
  // use the "ImageViewElement" to access the appropriate element (above).
  // Also returns the dimension as Face and Rotation attributed
  public GetDimensions = (Orient, Lay, View, Width, Height, Depth, data?): OrientationDimensions => {
    return this.OrientBase.GetDimensions(Orient, Lay, View, Width, Height, Depth);
  }
}
