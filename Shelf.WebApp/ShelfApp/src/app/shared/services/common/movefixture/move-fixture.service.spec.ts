/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { MoveFixtureService } from './move-fixture.service';

describe('Service: MoveFixture', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [MoveFixtureService],
        });
    });

    it('should ...', inject([MoveFixtureService], (service: MoveFixtureService) => {
        expect(service).toBeTruthy();
    }));
});
