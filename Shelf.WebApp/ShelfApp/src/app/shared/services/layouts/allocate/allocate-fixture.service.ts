import { Injectable } from '@angular/core';
import { Section } from 'src/app/shared/classes';
import { BayMappingFixtureDetails, PogFixtureDetails } from 'src/app/shared/models';
import { SharedService } from '../../common';
import { AllocateEventService } from './allocate-event.service';
import { AppConstantSpace } from 'src/app/shared/constants';

@Injectable({
  providedIn: 'root'
})
export class AllocateFixtureService {
  private pogwiseFixturedata: PogFixtureDetails = {};

  constructor(private readonly sharedService: SharedService,
    private readonly allocateEvent: AllocateEventService) { }

  public prepareFixtureData(pogObject: Section): PogFixtureDetails {
    let fixtureData = this.createFixtureData(pogObject);
    this.pogwiseFixturedata[pogObject.IDPOG] = fixtureData;
    return this.pogwiseFixturedata;
  }

  public createFixtureData(pogObject?: Section): BayMappingFixtureDetails[] {
    pogObject = pogObject ? pogObject : <Section>this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId());

    let fixtures = pogObject.getAllFixChildren();
    let fixtureData = [];

    for (let fixture of fixtures) {
      if(fixture.ObjectDerivedType != AppConstantSpace.DIVIDERS && fixture.ObjectDerivedType != AppConstantSpace.GRILLOBJ){
        let fix = {
          Depth: fixture.Dimension.Depth,
          FixtureId: fixture.Key,
          Height: fixture.Dimension.Height,
          Width: fixture.Dimension.Width,
          Thickness: fixture.Fixture.Thickness,
          StartXCoordinate: fixture.Location.X,
          YCoordinate: fixture.Location.Y,
          Type: fixture.ObjectDerivedType,
          CanJoin: fixture.Fixture.CanJoin,
          FixtureNumber: fixture.Fixture.FixtureNumber,
        };
  
        fixtureData.push(fix);
      }
    }
    return fixtureData;
  }

  public removePogFixture(IDPog: number): void {
    delete this.allocateEvent.originalFixtureData[IDPog];
  }
}
