export const AnalysisMockData = {
  AnalysisGridColumns: [
    {
      0: 'Name',
      1: 'name',
      2: 0,
      3: true,
      4: false,
      5: false,
      6: false,
      7: 0,
      8: 10,
      9: false,
      10: 'string',
      11: 'Name',
      12: '',
      13: '',
      14: '',
      15: '',
      16: 0,
      17: 2552,
      18: 0,
      FilterTemplate: '',
      Template: '',
      columnMenu: true
    },
    {
      0: 'Notes',
      1: 'desc',
      2: 1,
      3: true,
      4: false,
      5: false,
      6: false,
      7: 0,
      8: 10,
      9: false,
      10: 'string',
      11: 'Notes',
      12: '',
      13: '',
      14: '',
      15: '',
      16: 0,
      17: 2549,
      18: 0,
      FilterTemplate: '',
      Template: '',
      columnMenu: true
    },
    {
      0: 'Status ',
      1: 'status',
      2: 2,
      3: true,
      4: false,
      5: false,
      6: false,
      7: 0,
      8: 10,
      9: false,
      10: 'string',
      11: 'Status ',
      12: '',
      13: '',
      14: '',
      15: '',
      16: 0,
      17: 2550,
      18: 0,
      FilterTemplate: '',
      Template: '(dataItem.status==`N`?`Not Generated`:dataItem.status==`Q`?`Queued`:dataItem.status==`C`?`Generated`:`Failed`)',
      columnMenu: true
    },
    {
      0: 'Completed Time',
      1: 'completedTime',
      2: 3,
      3: true,
      4: false,
      5: false,
      6: false,
      7: 0,
      8: 10,
      9: false,
      10: 'datetime',
      11: 'Time when this request was completed',
      12: '',
      13: '',
      14: '',
      15: '',
      16: 0,
      17: 2551,
      18: 0,
      FilterTemplate: '',
      Template: '',
      columnMenu: true
    },
    {
      0: 'Number Of Rows',
      1: 'rows',
      2: 4,
      3: true,
      4: false,
      5: false,
      6: false,
      7: 0,
      8: 10,
      9: false,
      10: 'number',
      11: 'Number of rows in the report',
      12: '',
      13: '',
      14: '',
      15: '',
      16: 0,
      17: 2816,
      18: 0,
      FilterTemplate: '',
      Template: '',
      columnMenu: true
    },
    {
      0: 'Action',
      1: 'action',
      2: 5,
      3: true,
      4: false,
      5: false,
      6: false,
      7: 0,
      8: 10,
      9: false,
      10: 'string',
      11: 'Create, view or download single reports. For bulk operations please use check box and options from toolbar.',
      12: '',
      13: '',
      14: '',
      15: '',
      16: 0,
      17: 2764,
      18: 0,
      FilterTemplate: '',
      Template: '(dataItem.status== `C`  && dataItem.show==1)?`<div > <span > <i value =` + dataItem.rowKey + ` >remove_red_eye</i> </span> <span> <i value =` + dataItem.rowKey + `  >cloud_download</i> </span> <span > <i value =` + dataItem.rowKey + `  >play_arrow</i> </span> </div>`:(dataItem.status!= `Q` )?`<div><span > <i value =` + dataItem.rowKey + ` >play_arrow</i> </span> </div>`:``',
      columnMenu: false
    }
  ],
  GetAllReportTemplateMock: {
    isoutdated: true,
    reports: [
      {
        rowKey: 'RPT_AssortNetChange',
        status: 'C',
        requestedTime: '2020-11-11T04:32:54.4833411Z',
        completedTime: '2020-11-11T04:34:00.4614335Z',
        rows: 274,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_BRV',
        status: 'C',
        requestedTime: '2020-10-20T07:19:36.962648Z',
        completedTime: '2020-10-20T07:20:02.6916391Z',
        rows: 0,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_DeletedItems',
        status: 'C',
        requestedTime: '2020-11-10T07:46:16.6586075Z',
        completedTime: '2020-11-10T07:46:56.8957003Z',
        rows: 47,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_DiscoProducts',
        status: 'C',
        requestedTime: '2020-10-20T07:19:39.4033863Z',
        completedTime: '2020-10-20T07:20:07.5254563Z',
        rows: 3,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_DiscoXProducts',
        status: 'C',
        requestedTime: '2020-10-20T07:19:40.3183635Z',
        completedTime: '2020-10-20T07:20:06.2691812Z',
        rows: 1,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_DuplicateItems',
        status: 'C',
        requestedTime: '2020-10-20T07:19:41.219409Z',
        completedTime: '2020-10-20T07:20:10.6455568Z',
        rows: 0,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_FitCheck',
        status: 'C',
        requestedTime: '2020-10-20T07:19:42.267869Z',
        completedTime: '2020-10-20T07:20:10.6548504Z',
        rows: 0,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_FixtureCheck',
        status: 'C',
        requestedTime: '2020-10-20T07:19:43.4545045Z',
        completedTime: '2020-10-20T07:20:06.2381793Z',
        rows: 0,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_FloorPlanIssues',
        status: 'N',
        requestedTime: null,
        completedTime: null,
        rows: 0,
        isCorpSpecific: null,
        corpIds: null
      },
      {
        rowKey: 'RPT_ItemDistribution',
        status: 'C',
        requestedTime: '2020-10-16T15:14:53.4615967Z',
        completedTime: '2020-10-16T15:15:03.8376313Z',
        rows: 886,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_ItemDistributionSummary',
        status: 'C',
        requestedTime: '2020-10-20T07:19:47.6567733Z',
        completedTime: '2020-10-20T07:20:11.7081973Z',
        rows: 184,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_ItemNotPacking',
        status: 'C',
        requestedTime: '2020-10-23T04:51:18.1086955Z',
        completedTime: '2020-10-23T04:52:02.5615614Z',
        rows: 62,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_ItemStore',
        status: 'C',
        requestedTime: '2020-10-16T15:10:33.8501348Z',
        completedTime: '2020-10-16T15:11:44.4096592Z',
        rows: 13671,
        isCorpSpecific: true,
        corpIds: '4'
      },
      {
        rowKey: 'RPT_ItemsMissingDimension',
        status: 'C',
        requestedTime: '2020-10-20T07:19:45.9313991Z',
        completedTime: '2020-10-20T07:20:08.7163437Z',
        rows: 7,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_NewItems',
        status: 'C',
        requestedTime: '2020-10-20T07:19:46.6513906Z',
        completedTime: '2020-10-20T07:20:06.8026993Z',
        rows: 0,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_NoPlannedBuy',
        status: 'C',
        requestedTime: '2020-10-20T07:19:49.71132Z',
        completedTime: '2020-10-20T07:20:07.2121218Z',
        rows: 0,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_NotSetupProducts',
        status: 'C',
        requestedTime: '2020-10-20T07:19:51.1009314Z',
        completedTime: '2020-10-20T07:20:09.5891465Z',
        rows: 0,
        isCorpSpecific: false,
        corpIds: ''
      },
      {
        rowKey: 'RPT_OtherIssues',
        status: 'N',
        requestedTime: null,
        completedTime: null,
        rows: 0,
        isCorpSpecific: null,
        corpIds: null
      },
      {
        rowKey: 'RPT_PlannedBuy',
        status: 'N',
        requestedTime: null,
        completedTime: null,
        rows: 0,
        isCorpSpecific: null,
        corpIds: null
      },
      {
        rowKey: 'RPT_PublishedPogs',
        status: 'N',
        requestedTime: null,
        completedTime: null,
        rows: 0,
        isCorpSpecific: null,
        corpIds: null
      },
      {
        rowKey: 'RPT_SuppliabilityIssue',
        status: 'N',
        requestedTime: null,
        completedTime: null,
        rows: 0,
        isCorpSpecific: null,
        corpIds: null
      },
      {
        rowKey: 'RPT_WhiteSpace',
        status: 'N',
        requestedTime: null,
        completedTime: null,
        rows: 0,
        isCorpSpecific: null,
        corpIds: null
      },
      {
        rowKey: 'RPT_XGap',
        status: 'N',
        requestedTime: null,
        completedTime: null,
        rows: 0,
        isCorpSpecific: null,
        corpIds: null
      }
    ],
    token: 'https://abscpfb3storage.blob.core.windows.net/allocatereports?sv=2018-03-28&sr=c&sig=wmh5w1aje8gL66t6euwepWMByjJqXuHroSC5Ncz7TXQ%3D&st=2020-11-11T05%3A07%3A44Z&se=2020-11-11T06%3A12%3A44Z&sp=r'
  },
  GetReportMock:
    [
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '1200004651',
        Csc: '714862',
        Sku: '3350374',
        Name: 'STRBKS REFRESHERS PEACH PASSION FRUIT',
        DescSize: '12 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: 'System Delete'
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '1200016288',
        Csc: '831467',
        Sku: '8100983',
        Name: 'STRBKS REFRESHERS STRAWBERRY LEMONADE',
        DescSize: '12 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: 'System Delete'
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '1200017019',
        Csc: '877483',
        Sku: '3350312',
        Name: 'AMP GRAPE ORGANIC',
        DescSize: '12 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '1200017021',
        Csc: '877484',
        Sku: '3350335',
        Name: 'AMP TROPICAL BURST',
        DescSize: '12 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '1200017023',
        Csc: '877486',
        Sku: '3350354',
        Name: 'AMP PINEAPPLE COCONUT ORGANIC',
        DescSize: '12 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '1200017025',
        Csc: '877449',
        Sku: '3350311',
        Name: 'AMP ORGANIC CITRUS',
        DescSize: '12 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '1200019214',
        Csc: '1058187',
        Sku: '3350296',
        Name: 'MTN DEW AMP ENERGY DRNK GAME FUEL ZERO',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '1200019217',
        Csc: '1058189',
        Sku: '3350299',
        Name: 'MTN DEW AMP ENERGY DRINK GAME FUEL ZERO',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '4900008137',
        Csc: '1057526',
        Sku: '3350291',
        Name: 'COCA COLA ENERGY',
        DescSize: '12 FZ',
        CasePack: 24,
        OnHandQuantity: 0.00000000000000,
        AssortNote: 'System Delete'
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61076400033',
        Csc: '1108813',
        Sku: '3350022',
        Name: 'BANG ENERGY DRINK COTTON CANDY',
        DescSize: '4-16 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61076471033',
        Csc: '1108818',
        Sku: '3350027',
        Name: 'BANG ENERGY DRINK RAINBOW UNICORN',
        DescSize: '4-16 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61076471035',
        Csc: '1108874',
        Sku: '3350045',
        Name: 'BANG ENERGY DRINK FROSE ROSE',
        DescSize: '4-16 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61076486346',
        Csc: '1108821',
        Sku: '3350028',
        Name: 'BANG ENERGY DRINK BLUE RAZZ',
        DescSize: '4-16 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61126904245',
        Csc: '863921',
        Sku: '3350220',
        Name: 'RED BULL YELLOW EDITION',
        DescSize: '4-12 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61126904489',
        Csc: '863924',
        Sku: '3350498',
        Name: 'RED BULL BLUE EDITION',
        DescSize: '4-12 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61126919223',
        Csc: '1058539',
        Sku: '3350307',
        Name: 'RED BULL YELLOW EDITION',
        DescSize: '12-8.4 FZ',
        CasePack: 2,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61126933360',
        Csc: '1058611',
        Sku: '3350319',
        Name: 'RED BULL PEACH EDITION',
        DescSize: '4-8.4 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61126943157',
        Csc: '887796',
        Sku: '3350123',
        Name: 'RED BULL',
        DescSize: '6-8.4 FZ',
        CasePack: 4,
        OnHandQuantity: 0.00000000000000,
        AssortNote: 'System Delete'
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61126943269',
        Csc: '889346',
        Sku: '3350643',
        Name: 'RED BULL SUGAR FREE',
        DescSize: '6-8.4 FZ',
        CasePack: 4,
        OnHandQuantity: 0.00000000000000,
        AssortNote: 'System Delete'
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '61126962372',
        Csc: '480337',
        Sku: '3350020',
        Name: 'RED BULL ENERGY DRINK ZERO CARB',
        DescSize: '8.4 FZ',
        CasePack: 24,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '70164804011',
        Csc: '1053783',
        Sku: '3350184',
        Name: 'GURU ENERGY BEV ORG',
        DescSize: '4-8.3 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '70164804013',
        Csc: '1054307',
        Sku: '3350192',
        Name: 'GURU ENERGY BEV LITE',
        DescSize: '4-8.3 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '7084703211',
        Csc: '1048207',
        Sku: '3350280',
        Name: 'MONSTER MULE GINGER BREW US',
        DescSize: '16 FZ',
        CasePack: 24,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '7084703454',
        Csc: '1048245',
        Sku: '3350288',
        Name: 'MONSTER ULTRA PARADISE',
        DescSize: '10-16 FZ',
        CasePack: 2,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '7084703459',
        Csc: '1065756',
        Sku: '3350482',
        Name: 'MONSTER ULTRA PARADISE',
        DescSize: '4-16 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '75318295137',
        Csc: '878471',
        Sku: '3350358',
        Name: 'GREEN ENERGY GUAVA',
        DescSize: '8.4 FZ',
        CasePack: 24,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '7989315128',
        Csc: '969689',
        Sku: '3350447',
        Name: 'O ORGNC ENERGY DRINK ORIGINAL',
        DescSize: '11.5 FZ',
        CasePack: 12,
        OnHandQuantity: 8.67000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '7989315129',
        Csc: '969506',
        Sku: '3350429',
        Name: 'O ORGNC ENERGY DRINK BERRY',
        DescSize: '11.5 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '7989315130',
        Csc: '969678',
        Sku: '3350443',
        Name: 'O ORGNC ENERGY DRINK TROPICAL',
        DescSize: '11.5 FZ',
        CasePack: 12,
        OnHandQuantity: 11.17000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '7989315131',
        Csc: '969628',
        Sku: '3350442',
        Name: 'O ORGNC ENERGY DRINK ORANGE GRAPEFRUIT',
        DescSize: '11.5 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81001453001',
        Csc: '1046737',
        Sku: '3350272',
        Name: 'ASHOC COTTON CANDY ENERGY DRINK',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81001453003',
        Csc: '1046727',
        Sku: '3350261',
        Name: 'ASHOC SHOC WAVE ENERGY DRINK',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: 'System Delete'
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81001453004',
        Csc: '1046839',
        Sku: '3350276',
        Name: 'ASHOC FRUIT PUNCH ENERGY DRINK',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81001453005',
        Csc: '1046809',
        Sku: '3350273',
        Name: 'ASHOC FROZEN ICE ENERGY DRINK',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81001453006',
        Csc: '1046729',
        Sku: '3350262',
        Name: 'ASHOC PEACH MANGO ENERGY DRINK',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81001453013',
        Csc: '1046821',
        Sku: '3350274',
        Name: 'ASHOC SOUR CANDY ENERGY DRINK',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81001453015',
        Csc: '1046726',
        Sku: '3350259',
        Name: 'ASHOC ACAI BERRY ENERGY DRINK',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81515402206',
        Csc: '1060141',
        Sku: '3350395',
        Name: 'REIGN RAZZLE BERRY US',
        DescSize: '4-16 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81515402213',
        Csc: '1060110',
        Sku: '3350391',
        Name: 'REIGN MELON MANIA US',
        DescSize: '4-16 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81515402220',
        Csc: '1060096',
        Sku: '3350390',
        Name: 'REIGN INFERNO JALAPENO STRAWBERRY ENERGY',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81515402225',
        Csc: '1065749',
        Sku: '3350474',
        Name: 'REIGN INFERNO TRUE BLU US',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81809400214',
        Csc: '447290',
        Sku: '8100864',
        Name: 'ROCKSTAR RECOVERY',
        DescSize: '4-16 FZ',
        CasePack: 6,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '81809400392',
        Csc: '753932',
        Sku: '3350380',
        Name: 'ROCKSTAR REVOLT ENERGY DRINK KILLER CTRS',
        DescSize: '16 FZ',
        CasePack: 24,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '84259510653',
        Csc: '1042638',
        Sku: '3350247',
        Name: 'C4 TROPICAL BLAST',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '84259510655',
        Csc: '1042624',
        Sku: '3350226',
        Name: 'C4 TWISTED LIMEADE',
        DescSize: '16 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '89735100087',
        Csc: '752480',
        Sku: '3350731',
        Name: 'HIBALL ENERGY WATER BLACK CHERRY',
        DescSize: '16 FZ',
        CasePack: 24,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      },
      {
        DivisionCode: '25',
        DivisionName: 'NOR CAL',
        Upc: '89765800122',
        Csc: '1116481',
        Sku: '3350136',
        Name: 'GURU ENERGY BEV MATCHA',
        DescSize: '12 FZ',
        CasePack: 12,
        OnHandQuantity: 0.00000000000000,
        AssortNote: ''
      }
    ]
};
