export interface BlockConfig {
  attr1: string;
  isRefresh?: boolean;
  ruleAttributes?: BlockRuleAttributesConfig;
  sectionId: string;
  isAutoBlocks: true;
  objId: string;
  onlyNonStdFixtures?: boolean;
}

export interface BlockRuleAttributesConfig {
  IdRuleSet: number;
  IsSelecetd: boolean;
  Name: string;
  OrderId: number;
  Value: string;
}

export interface AutoBlocks {
  IdRuleSet: number;
  IsSelecetd: boolean;
  Name: string;
  OrderId: number;
  Value: string;
}

export interface CombinedBlock {
  $idParent: string;
  attribute: string;
  idBlock: number;
  blockColor: string;
  children: string[];
  blockType: string;
  blockName: string;
}

export enum BlockDisplayType {
  DEFAULT = 0,
  HIDE_BLOCKS = 1,
  HIDE_POSITIONS = 2,
  POSITIONS_WITHOUT_BLOCKS = 3
}
