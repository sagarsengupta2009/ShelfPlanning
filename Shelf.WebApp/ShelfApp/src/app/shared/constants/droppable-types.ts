import { AppConstantSpace } from './appConstantSpace';

export const FixtureTypeObjects = [
  AppConstantSpace.STANDARDSHELFOBJ,
  AppConstantSpace.PEGBOARDOBJ,
  AppConstantSpace.COFFINCASEOBJ,
  AppConstantSpace.SLOTWALLOBJ,
  AppConstantSpace.CROSSBAROBJ,
  AppConstantSpace.BASKETOBJ,
  AppConstantSpace.FIXTUREOBJ
];

/** Types which can be dropped to Fixtures */
export const DropTypesToFixtures = [AppConstantSpace.POSITIONOBJECT, ...FixtureTypeObjects];

/** This constant is added for readability. It is same as DropTypesToFixtures. */
export const DropTypesToPositions = DropTypesToFixtures;

export const DropTypesToSections = [
  AppConstantSpace.MODULAR,
  AppConstantSpace.ANNOTATION,
  AppConstantSpace.FIXTUREOBJ
];

export const DropTypesToModulars = [
  ...FixtureTypeObjects,
  AppConstantSpace.MODULAR,
  AppConstantSpace.ANNOTATION,
  AppConstantSpace.BLOCK_FIXTURE,
  AppConstantSpace.BAGSHELF,
];

export const EmptyArray = [];
