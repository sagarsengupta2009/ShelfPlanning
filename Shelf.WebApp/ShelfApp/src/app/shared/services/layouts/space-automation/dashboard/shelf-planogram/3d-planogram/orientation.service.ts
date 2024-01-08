import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PlanogramHelperService } from '../planogram-helper.service';
import { AppConstantSpace } from 'src/app/shared/constants';

@Injectable({
  providedIn: 'root'
})

export class OrientationService {
  public Orientation = {
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

  public ImageViewElement = {
    Face: 0,
    Rotation: 1
  };

  public ImageViews = [
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

  public View = {
    Front: 0,
    Left: 1,
    Top: 2,
    Back: 3,
    Right: 4,
    Bottom: 5
  };

  public ViewOrientation = [
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
  ];

  public DimensionMap = {
    Width: 0,
    Height: 1,
    Depth: 2
  };

  public OrientationToDim = [
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
  ];

  public orientationImages = {
    FRONTBOTTOM: '',
    FRONTRIGHT: '',
    FRONTTOP: '',
    FRONTLEFT: '',
    LEFTBOTTOM: '',
    LEFTFRONT: '',
    LEFTTOP: '',
    LEFTBACK: '',
    TOPFRONT: '',
    TOPRIGHT: '',
    TOPBACK: '',
    TOPLEFT: '',
    BACKBOTTOM: '',
    BACKLEFT: '',
    BACKTOP: '',
    BACKRIGHT: '',
    RIGHTBOTTOM: '',
    RIGHTBACK: '',
    RIGHTTOP: '',
    RIGHTFRONT: '',
    BOTTOMBACK: '',
    BOTTOMRIGHT: '',
    BOTTOMFRONT: '',
    BOTTOMLEFT: ''
  }

  constructor(
    private readonly httpClient: HttpClient,
    private planogramHelper: PlanogramHelperService
  ) { }

  public setOrientationImages() {
    Object.entries(AppConstantSpace.ORIENTATION).forEach(([key, value]) => { 
      if (this.orientationImages[key] == '') {
        this.httpClient.get(this.planogramHelper.deploymentPath + '/assets/icons/orientation/' + key + '.svg', { responseType: 'text' })
          .subscribe((data) => {
            this.orientationImages[key] = data;
          });
      }
    });
  }

  public getOrientationImage(orientationText: string, orientationKey: string): string {
    const firstOre = orientationText.split(' ').length > 0 ? orientationText.split(' ')[0].toUpperCase() : '';
    const secondOre = orientationText.split(' ').length > 1 ? orientationText.split(' ')[1].toUpperCase() : '';
    return this.orientationImages[orientationKey].replace('{{FIRST_ORE}}', firstOre).replace('{{SECOND_ORE}}', secondOre);
  }
}
