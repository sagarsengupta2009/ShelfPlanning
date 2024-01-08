export class OrientationBase {
  View = {
       Front: 0,
       Left: 1,
       Top: 2,
       Back: 3,
       Right: 4,
       Bottom: 5
   };

  Orientation = {
       Front_Bottom: 0,
       Front_Right: 1,
       Front_Top: 2,
       Front_Left: 3,
       Left_Bottom: 4,
       Left_Front: 5,
       Left_Top: 6,
       Left_Back: 7,
       Top_Front: 8,
       Top_Right: 9,
       Top_Back: 10,
       Top_Left: 11,
       Back_Bottom: 12,
       Back_Left: 13,
       Back_Top: 14,
       Back_Right: 15,
       Right_Bottom: 16,
       Right_Back: 17,
       Right_Top: 18,
       Right_Front: 19,
       Bottom_Back: 20,
       Bottom_Right: 21,
       Bottom_Front: 22,
       Bottom_Left: 23
   };

   LayoverOrientation = [
       this.Orientation.Top_Front,
       this.Orientation.Left_Front,
       this.Orientation.Bottom_Front,
       this.Orientation.Right_Front,
       this.Orientation.Top_Left,
       this.Orientation.Back_Left,
       this.Orientation.Bottom_Left,
       this.Orientation.Front_Left,
       this.Orientation.Back_Top,
       this.Orientation.Left_Top,
       this.Orientation.Front_Top,
       this.Orientation.Right_Top,
       this.Orientation.Top_Back,
       this.Orientation.Right_Back,
       this.Orientation.Bottom_Back,
       this.Orientation.Left_Back,
       this.Orientation.Top_Right,
       this.Orientation.Front_Right,
       this.Orientation.Bottom_Right,
       this.Orientation.Back_Right,
       this.Orientation.Front_Bottom,
       this.Orientation.Left_Bottom,
       this.Orientation.Back_Bottom,
       this.Orientation.Right_Bottom
   ];

   LayoverOrientationCoffinTypes = [
       this.Orientation.Bottom_Back,
       this.Orientation.Right_Back,
       this.Orientation.Top_Back,
       this.Orientation.Left_Back,
       this.Orientation.Bottom_Right,
       this.Orientation.Front_Right,
       this.Orientation.Top_Right,
       this.Orientation.Back_Right,
       this.Orientation.Front_Bottom,
       this.Orientation.Right_Bottom,
       this.Orientation.Back_Bottom,
       this.Orientation.Left_Bottom,
       this.Orientation.Bottom_Front,
       this.Orientation.Left_Front,
       this.Orientation.Top_Front,
       this.Orientation.Right_Front,
       this.Orientation.Bottom_Left,
       this.Orientation.Back_Left,
       this.Orientation.Top_Left,
       this.Orientation.Front_Left,
       this.Orientation.Back_Top,
       this.Orientation.Right_Top,
       this.Orientation.Front_Top,
       this.Orientation.Left_Top
     ];

   ImageViewElement = {
       Face: 0,
       Rotation: 1
   };

   ImageViews = [
       [1, 0],
       [1, 90],
       [1, 180],
       [1, 270],
       [2, 0],
       [2, 90],
       [2, 180],
       [2, 270],
       [3, 0],
       [3, 90],
       [3, 180],
       [3, 270],
       [7, 0],
       [7, 90],
       [7, 180],
       [7, 270],
       [8, 0],
       [8, 90],
       [8, 180],
       [8, 270],
       [9, 0],
       [9, 90],
       [9, 180],
       [9, 270]
   ];

  ViewOrientation = [
       [this.Orientation.Front_Bottom, this.Orientation.Left_Bottom, this.Orientation.Top_Front, this.Orientation.Back_Bottom, this.Orientation.Right_Bottom, this.Orientation.Bottom_Back],
       [this.Orientation.Front_Right, this.Orientation.Bottom_Right, this.Orientation.Left_Front, this.Orientation.Back_Right, this.Orientation.Top_Right, this.Orientation.Right_Back],
       [this.Orientation.Front_Top, this.Orientation.Right_Top, this.Orientation.Bottom_Front, this.Orientation.Back_Top, this.Orientation.Left_Top, this.Orientation.Top_Back],
       [this.Orientation.Front_Left, this.Orientation.Top_Left, this.Orientation.Right_Front, this.Orientation.Back_Left, this.Orientation.Bottom_Left, this.Orientation.Left_Back],
       [this.Orientation.Left_Bottom, this.Orientation.Back_Bottom, this.Orientation.Top_Left, this.Orientation.Right_Bottom, this.Orientation.Front_Bottom, this.Orientation.Bottom_Right],
       [this.Orientation.Left_Front, this.Orientation.Bottom_Front, this.Orientation.Back_Left, this.Orientation.Right_Front, this.Orientation.Top_Front, this.Orientation.Front_Right],
       [this.Orientation.Left_Top, this.Orientation.Front_Top, this.Orientation.Bottom_Left, this.Orientation.Right_Top, this.Orientation.Back_Top, this.Orientation.Top_Right],
       [this.Orientation.Left_Back, this.Orientation.Top_Back, this.Orientation.Front_Left, this.Orientation.Right_Back, this.Orientation.Bottom_Back, this.Orientation.Back_Right],
       [this.Orientation.Top_Front, this.Orientation.Left_Front, this.Orientation.Back_Top, this.Orientation.Bottom_Front, this.Orientation.Right_Front, this.Orientation.Front_Bottom],
       [this.Orientation.Top_Right, this.Orientation.Front_Right, this.Orientation.Left_Top, this.Orientation.Bottom_Right, this.Orientation.Back_Right, this.Orientation.Right_Bottom],
       [this.Orientation.Top_Back, this.Orientation.Right_Back, this.Orientation.Front_Top, this.Orientation.Bottom_Back, this.Orientation.Left_Back, this.Orientation.Back_Bottom],
       [this.Orientation.Top_Left, this.Orientation.Back_Left, this.Orientation.Right_Top, this.Orientation.Bottom_Left, this.Orientation.Front_Left, this.Orientation.Left_Bottom],
       [this.Orientation.Back_Bottom, this.Orientation.Right_Bottom, this.Orientation.Top_Back, this.Orientation.Front_Bottom, this.Orientation.Left_Bottom, this.Orientation.Bottom_Front],
       [this.Orientation.Back_Left, this.Orientation.Bottom_Left, this.Orientation.Right_Back, this.Orientation.Front_Left, this.Orientation.Top_Left, this.Orientation.Left_Front],
       [this.Orientation.Back_Top, this.Orientation.Left_Top, this.Orientation.Bottom_Back, this.Orientation.Front_Top, this.Orientation.Right_Top, this.Orientation.Top_Front],
       [this.Orientation.Back_Right, this.Orientation.Top_Right, this.Orientation.Left_Back, this.Orientation.Front_Right, this.Orientation.Bottom_Right, this.Orientation.Right_Front],
       [this.Orientation.Right_Bottom, this.Orientation.Front_Bottom, this.Orientation.Top_Right, this.Orientation.Left_Bottom, this.Orientation.Back_Bottom, this.Orientation.Bottom_Left],
       [this.Orientation.Right_Back, this.Orientation.Bottom_Back, this.Orientation.Front_Right, this.Orientation.Left_Back, this.Orientation.Top_Back, this.Orientation.Back_Left],
       [this.Orientation.Right_Top, this.Orientation.Back_Top, this.Orientation.Bottom_Right, this.Orientation.Left_Top, this.Orientation.Front_Top, this.Orientation.Top_Left],
       [this.Orientation.Right_Front, this.Orientation.Top_Front, this.Orientation.Back_Right, this.Orientation.Left_Front, this.Orientation.Bottom_Front, this.Orientation.Front_Left],
       [this.Orientation.Bottom_Back, this.Orientation.Left_Back, this.Orientation.Front_Bottom, this.Orientation.Top_Back, this.Orientation.Right_Back, this.Orientation.Back_Top],
       [this.Orientation.Bottom_Right, this.Orientation.Back_Right, this.Orientation.Left_Bottom, this.Orientation.Top_Right, this.Orientation.Front_Right, this.Orientation.Right_Top],
       [this.Orientation.Bottom_Front, this.Orientation.Right_Front, this.Orientation.Back_Bottom, this.Orientation.Top_Front, this.Orientation.Left_Front, this.Orientation.Front_Top],
       [this.Orientation.Bottom_Left, this.Orientation.Front_Left, this.Orientation.Right_Bottom, this.Orientation.Top_Left, this.Orientation.Back_Left, this.Orientation.Left_Top]
   ]

   DimensionMap = {
       Width: 0,
       Height: 1,
       Depth: 2
   };


   OrientationToDim = [
       [this.DimensionMap.Width, this.DimensionMap.Height, this.DimensionMap.Depth],
       [this.DimensionMap.Height, this.DimensionMap.Width, this.DimensionMap.Depth],
       [this.DimensionMap.Width, this.DimensionMap.Height, this.DimensionMap.Depth],
       [this.DimensionMap.Height, this.DimensionMap.Width, this.DimensionMap.Depth],
       [this.DimensionMap.Depth, this.DimensionMap.Height, this.DimensionMap.Width],
       [this.DimensionMap.Height, this.DimensionMap.Depth, this.DimensionMap.Width],
       [this.DimensionMap.Depth, this.DimensionMap.Height, this.DimensionMap.Width],
       [this.DimensionMap.Height, this.DimensionMap.Depth, this.DimensionMap.Width],
       [this.DimensionMap.Width, this.DimensionMap.Depth, this.DimensionMap.Height],
       [this.DimensionMap.Depth, this.DimensionMap.Width, this.DimensionMap.Height],
       [this.DimensionMap.Width, this.DimensionMap.Depth, this.DimensionMap.Height],
       [this.DimensionMap.Depth, this.DimensionMap.Width, this.DimensionMap.Height],
       [this.DimensionMap.Width, this.DimensionMap.Height, this.DimensionMap.Depth],
       [this.DimensionMap.Height, this.DimensionMap.Width, this.DimensionMap.Depth],
       [this.DimensionMap.Width, this.DimensionMap.Height, this.DimensionMap.Depth],
       [this.DimensionMap.Height, this.DimensionMap.Width, this.DimensionMap.Depth],
       [this.DimensionMap.Depth, this.DimensionMap.Height, this.DimensionMap.Width],
       [this.DimensionMap.Height, this.DimensionMap.Depth, this.DimensionMap.Width],
       [this.DimensionMap.Depth, this.DimensionMap.Height, this.DimensionMap.Width],
       [this.DimensionMap.Height, this.DimensionMap.Depth, this.DimensionMap.Width],
       [this.DimensionMap.Width, this.DimensionMap.Depth, this.DimensionMap.Height],
       [this.DimensionMap.Depth, this.DimensionMap.Width, this.DimensionMap.Height],
       [this.DimensionMap.Width, this.DimensionMap.Depth, this.DimensionMap.Height],
       [this.DimensionMap.Depth, this.DimensionMap.Width, this.DimensionMap.Height]
   ]

   constructor(){}

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
       let NewOrient = (Lay == 1) ? this.LayoverOrientation[Orient] : Orient;
       let ImageView = this.ImageViews[this.ViewOrientation[NewOrient][View]];
       // ImageView.Face = ImageView[0];
       // ImageView.Rotation = ImageView[1];
       let newImageView = { 'Face': ImageView[0], 'Rotation': ImageView[1] };
       return newImageView;
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
       GetDimensions =  (Orient, Lay, View, Width, Height, Depth) => {
           const DimMap = [Width, Height, Depth];
           const NewOrient = (Lay == 1) ? this.LayoverOrientation[Orient] : Orient;
           const Dims = this.OrientationToDim[this.ViewOrientation[NewOrient][View]];
           let dims = [];
           dims = [DimMap[Dims[0]], DimMap[Dims[1]], DimMap[Dims[2]]];
           let NewDims = { 'X': dims[0], 'Y': dims[1], 'Z': dims[2], 'Width': dims[0], 'Height': dims[1], 'Depth': dims[2] };
           return NewDims;
       }
}
