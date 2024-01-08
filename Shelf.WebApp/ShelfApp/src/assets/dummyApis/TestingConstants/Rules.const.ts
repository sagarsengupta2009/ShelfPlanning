export const RulesMockData = {
  rulesTypeMockList: {
    RulesTypes: [
      {
        name: 'Blocks',
        value: 'BLOCKS'
      },
      {
        name: 'Placement',
        value: 'PLACEMENT'
      },
      {
        name: 'Priority Based Inventory',
        value: 'PRIORITY BASED INVENTORY'
      },
      {
        name: 'Item Family',
        value: 'ITEM FAMILY'
      }

    ]
  },

  getRulesBlockMock: [
    {
      blockKey: 'F1_Block1',
      parentBlockKey: null,
      minBlockLinear: '0',
      fixtureType: 'StandardShelf',
      copyFromBlock: false,
      repeatShelf: false,
      linearSpace: 576.0,
      blockLinearPer: 12.5,
      blockScore: 100.0,
      blockSKUs: 46,
      color: '#99BADD',
      modelId: 1710524,
      rulesetId: 0,
      type: 'Block',
      partitionKey: '1221',
      rowKey: 'Block_1710524__F1_Block1',
      timestamp: '2020-11-09T15:26:38.8933482+00:00',
      eTag: 'W/"datetime\'2020-11-09T15%3A26%3A38.8933482Z\'"'
    }
  ],
  getAllPlanogramMock: [
    {
      isSsPogQueued: true,
      deltaWhiteSpace: 0.0,
      isSetSizeQueued: false,
      parentModel: 0,
      setSizes: 0,
      modelChangeReason: null,
      modelChanged: false,
      cPogScore: '0',
      isBlocked: true,
      groupId: 0,
      groupName: null,
      clusterName: null,
      pogName: 'Nor Cal/Premium-6 ft-SALAD DRESSING',
      modules: 1,
      fixtures: 7,
      footage: '80x72x20',
      pinned: false,
      cached: true,
      favorite: false,
      status: 2,
      approveState: 'N',
      qualifier: '006W_001M_007F',
      stockingSection: 'SALAD DRESSING',
      pogAssignmentType: 2,
      stores: 1,
      totalLinear: 504.0,
      availableLinear: 504.0,
      whiteSpace: 100.0,
      spaceUtilized: 0.0,
      corpId: 4,
      createdIn: 2,
      noOfProducts: 0,
      score: '99',
      pogType: 'M',
      l1: 'GROCERY',
      l2: 'MEALS INGREDIENTS',
      l3: 'SALAD DRESSING',
      l4: 'Nor Cal/Premium',
      l5: '06-00',
      l6: 'A-DS-ST-80',
      l7: null,
      l8: null,
      l9: null,
      l10: null,
      profile: null,
      p1: 'C-1.17-0',
      p2: 'N-0-0',
      p3: 'N-0-0',
      p4: 'N-0-0',
      p5: 'N-0-0',
      isOptimized: true,
      active: true,
      cOptimized: true,
      displayVersion: '1690375',
      noOfOffSets: 1,
      classification: 'Manual Set Size',
      createdBy: null,
      createdTime: null,
      modifiedBy: 'Varun.Joshi@symphonyretailai.com',
      statusCode: 'D',
      height: 80.0,
      width: 72.0,
      depth: 20.0,
      storePercentage: 0.35211268,
      isReadOnly: false,
      stockingSectionId: '604',
      lastUpdated: '2020-11-11T05:22:20.9167374Z',
      refStoreId: 0,
      bayProfile: null,
      partitionKey: '1119',
      rowKey: '1690375',
      timestamp: '2020-11-11T05:22:20.9370127+00:00',
      eTag: 'W/"datetime\'2020-11-11T05%3A22%3A20.9370127Z\'"'
    }
  ],

  GetProductOfProjectMock: [
    {
      corpId: 4,
      csc: '377878',
      descSize: '15 FZ',
      idProduct: 832156,
      internalStatus: 10,
      defaultMerchStyle: 0,
      defaultOrientation: 0,
      isNpi: false,
      l1: 'SALAD DRESSING',
      l2: 'MAYONNAISE, SALAD DRESSINGS & TOPPINGS',
      l3: 'LIQUID SALAD DRESSINGS',
      l4: 'WELLNESS LIQUID SALAD DRESSINGS',
      l5: 'WELLNESS LIQUID SALAD DRESSINGS',
      l6: 'WELLNESS LIQUID SALAD DRESSINGS',
      l7: null,
      l8: null,
      l9: null,
      l10: null,
      manufacturer: 'PINNACLE FOODS GRP LLC',
      brand: 'WISHBONE        ',
      name: 'WISHBONE SLD DRSG ITALIAN FAT FREE',
      packData: '{"UNIT":{"Name":"UNIT","IDPackage":182765,"Width":3.65,"MinDOS":0,"MaxDOS":99,"NestingX":0,"NestingY":0,"NestingZ":0,"ExpandPctX":0,"ExpandPctY":0,"ExpandPctZ":0,"Overhang":0,"OverhangX":0,"FingerSpace":0,"NumInnerPacks":0,"ShrinkPctX":0,"ShrinkPctY":0,"ShrinkPctZ":0,"XPegHole":0,"YPegHole":0,"Height":8.6,"Depth":1.7,"MinFacingsX":1,"MaxFacingsX":99,"MaxFacingsY":99,"MaxFacingsZ":99,"MaxLayoversY":99,"MaxLayoversZ":99,"OverhangZ":0,"Casepack":6}}',
      sku: '6041907',
      upc: '4132100545',
      refUPC: '4132100545',
      refSKU: '6041907',
      storeUPC: null,
      storeSKU: null,
      wic: false,
      imageData: '{"UNIT":{"2 ":"https://cusarmswy.blob.core.windows.net/subdir/MNAsSW03vLkEatp9XAVjPOvUrUlRrpa6oV0LRwGAuQs=.png","3 ":"https://cusarmswy.blob.core.windows.net/subdir/S6JHmuJ6XsN03iLVfu50ynjqJg36Y2z1FgemsOYB7dg=.png","1 ":"https://cusarmswy.blob.core.windows.net/subdir/zgrcc58NZw1TVEzKFSvx1kW66HqOkYnujXVjwMTJLF8=.png"}}',
      color: null,
      casePack: 6,
      packageInfo: {
        UNIT: {
          idPackage: 182765,
          overhangZ: 0.0,
          overhang: 0.0,
          overhangX: 0.0,
          fingerSpace: 0,
          numInnerPacks: 0,
          expandPctX: 0.0,
          expandPctY: 0.0,
          expandPctZ: 0.0,
          name: 'UNIT',
          minFacingsX: 1,
          maxLayoversZ: 99,
          maxLayoversY: 99,
          maxFacingsZ: 99,
          maxFacingsY: 99,
          maxFacingsX: 99,
          height: 8.6,
          width: 3.65,
          depth: 1.7,
          minDOS: 0.0,
          maxDOS: 99.0,
          casepack: 6,
          nestingX: 0.0,
          nestingY: 0.0,
          nestingZ: 0.0,
          shrinkPctX: 0.0,
          shrinkPctY: 0.0,
          shrinkPctZ: 0.0,
          xPegHole: 0.0,
          yPegHole: 0.0,
          packageType: 0
        }
      },
      packageImage: {
        UNIT: {
          2: 'https://cusarmswy.blob.core.windows.net/subdir/MNAsSW03vLkEatp9XAVjPOvUrUlRrpa6oV0LRwGAuQs=.png',
          3: 'https://cusarmswy.blob.core.windows.net/subdir/S6JHmuJ6XsN03iLVfu50ynjqJg36Y2z1FgemsOYB7dg=.png',
          1: 'https://cusarmswy.blob.core.windows.net/subdir/zgrcc58NZw1TVEzKFSvx1kW66HqOkYnujXVjwMTJLF8=.png'
        }
      },
      partitionKey: '4',
      rowKey: '377878',
      timestamp: '0001-01-01T00:00:00+00:00',
      eTag: null
    }]
};
