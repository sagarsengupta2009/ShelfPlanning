export const KendoGridMockData = {
  DeSelectionEventMock: {
    ctrlKey: true,
    deselectedRows: [
      {
        dataItem: {
          action_template: '',
          completedTime: '2020-10-27T07:09:22.4578343Z',
          corpIds: '',
          desc: 'Items which are marked as DELETE (Unallocated) and have along with OnHand Qty',
          isCorpSpecific: false,
          name: 'Delete Items',
          requestedTime: '2020-10-27T07:09:08.2957164Z',
          rowKey: 'RPT_DeletedItems',
          rows: 47,
          show: 1,
          srno: 3,
          status: 'C',
          status_template: 'Generated'
        },
        index: 1
      }
    ],
    selectedRows: []
  },

  SelectionEventMock: {
    ctrlKey: true,
    deselectedRows: [],
    selectedRows: [
      {
        dataItem: {
          action_template: '',
          completedTime: '2020-10-27T07:09:22.4578343Z',
          corpIds: '',
          desc: 'Items which are marked as DELETE (Unallocated) and have along with OnHand Qty',
          isCorpSpecific: false,
          name: 'Delete Items',
          requestedTime: '2020-10-27T07:09:08.2957164Z',
          rowKey: 'RPT_DeletedItems',
          rows: 47,
          show: 1,
          srno: 3,
          status: 'C',
          status_template: 'Generated'
        },
        index: 1
      },
      {
        dataItem: {
          action_template: '',
          completedTime: '2020-10-27T07:09:22.4578343Z',
          corpIds: '',
          desc: 'Items which are marked as DELETE (Unallocated) and have along with OnHand Qty',
          isCorpSpecific: false,
          name: 'Delete Items',
          requestedTime: '2020-10-27T07:09:08.2957164Z',
          rowKey: 'RPT_DeletedItems',
          rows: 47,
          show: 1,
          srno: 3,
          status: 'C',
          status_template: 'Generated'
        },
        index: 2
      }
    ]
  },

  kendoGridConfig: {
    fileName: 'Scenarios',
    id: 'scenario-grid',
    selectionParam: {
      items: [1161],
      name: 'IdScenario'
    },
    columns: [
      {
        columnMenu: true,
        description: 'Name of the scenario',
        editable: false,
        field: 'ScenarioName_template',
        filterable: { multi: true, search: true },
        format: null,
        groupOrder: 0,
        groupable: false,
        hidden: false,
        locked: false,
        orderIndex: 0,
        sortable: { initialDirection: null },
        sortorder: 0,
        style: {
          backgroundcolor: 'rgb(245, 245, 245)'
        },
        templateDummy: `<button class="btn btn-link customevent" value = </button>`,
        title: 'Scenario',
        type: 'string',
        width: 15,
      },
      {
        columnMenu: true,
        description: 'Name of the project',
        editable: false,
        field: 'ProjectName',
        filterable: { multi: true, search: true },
        format: null,
        groupOrder: 0,
        groupable: false,
        hidden: false,
        locked: false,
        orderIndex: 2,
        sortable: { initialDirection: null },
        sortorder: 0,
        style: { backgroundcolor: 'rgb(245, 245, 245)' },
        templateDummy: '',
        title: 'Project',
        type: 'string',
        width: 15
      },
      {
        columnMenu: true,
        description: 'Type of project.',
        editable: false,
        field: 'ProjectType',
        filterable: { multi: true, search: true },
        format: null,
        groupOrder: 0,
        groupable: false,
        hidden: false,
        locked: false,
        orderIndex: 4,
        sortable: { initialDirection: null },
        sortorder: 0,
        style: { backgroundcolor: 'rgb(245, 245, 245)' },
        templateDummy: '',
        title: 'Type',
        type: 'string',
        width: 30
      }
    ],
    data: [
      {
        AssignmentType: 2,
        AssortStatus: 3,
        Categories: 'ADULT INCONTINENCE',
        Color: '#3366FF',
        DataChangeStatus: 1,
        IdProject: 1067,
        IdScenario: 1161,
        LastModified: '2020-10-29T09:49:34Z',
        LastStatusCode: 0,
        Location: `DENVER, EASTERN, INTERMOUNTAIN, JEWEL-OSCO, NOR CAL, PORTLAND, SEATTLE, SHAWS`,
        NiciHierarchy: 0,
        NotesCount: 0,
        ProjectName: 'AB_AdultIncontinence_16102020',
        ProjectType: 'Reset',
        ScenarioName: 'Default scenario AB_AdultIncontinence_16102020',
        Status: 3,
        Task: null,
        TotalWeeks: 15,
        WeekEndDate: '2019-11-09T12:00:00Z',
        WeekStartDate: '2019-07-28T12:00:00Z'
      }
    ]
  },
  simpleChangeMock: {
    gridConfig: {
      currentValue: {
        forceUpdate: true,
        firstCheckBoxColumn: true,
        height: `calc(100vh - 180px)`,
        id: `bayMappingStoreGrid`,
        isRowSelectableByCheckbox: true,
        data: [
          {
            Only_fixtureConfig: `36x36x36`,
            StoreWidthinFeet: 9,
            bayInfo: [],
            depth: 20,
            fixtureConfig: `<span>3<sup>8</sup></span>x<span>3<sup>8</sup></span>x<span>3<sup>7</sup></span>`,
            generatedPogId: 1706577,
            isApproved: false,
            isVerified: false,
            pogs: null,
            storeModel: null,
            storeModelVerified: false,
            storeTempModel: null,
            stores: 5,
            width: 108
          }
        ]
      },
      isFirstChange: Boolean,
      firstChange: true,
      previousValue: {}
    }
  },
  exportToExcelMock: {
    exportKendoGridConfig: {
      columnConfig: true,
      columnMenuDisplay: true,
      fileName: '1161_Analysis',
      fillDownRequired: true,
      firstCheckBoxColumn: true,
      height: 'calc(100vh - 146px)',
      hideColumnWhileExport: ['action_template'],
      id: 'analysis_report',
      isRowSelectableByCheckbox: true,
      columns: [
        {
          columnMenu: false,
          description: `Create, view or download single reports.`,
          editable: false,
          field: 'action_template',
          filterable: { multi: true, search: true },
          format: null,
          groupOrder: 0,
          groupable: false,
          hidden: false,
          locked: false,
          orderIndex: 5,
          sortable: { initialDirection: null },
          sortorder: 0,
          style: '',
          templateDummy: '',
          title: 'Action',
          type: 'string',
          width: 10
        },
        {
          columnMenu: true,
          description: 'Name',
          editable: false,
          field: 'name',
          filterable: { multi: true, search: true },
          format: null,
          groupOrder: 0,
          groupable: false,
          hidden: false,
          locked: false,
          orderIndex: 0,
          sortable: { initialDirection: null },
          sortorder: 0,
          style: '',
          templateDummy: '',
          title: 'Name',
          type: 'string',
          width: 10
        }
      ],
      data: [
        {
          completedTime: '2020-10-16T11:43:32.2788019Z',
          corpIds: '',
          desc: 'store deleted for ALL items',
          isCorpSpecific: false,
          name: 'Assortment Net Change',
          requestedTime: '2020-10-16T11:36:52.3982342Z',
          rowKey: 'RPT_AssortNetChange',
          rows: 261,
          show: 1,
          status: 'C'
        },
        {
          completedTime: '2020-10-16T11:37:34.6843567Z',
          corpIds: '',
          desc: 'Validation of pog business rules',
          isCorpSpecific: false,
          name: 'BR Validation',
          requestedTime: '2020-10-16T11:36:53.5376368Z',
          rowKey: 'RPT_BRV',
          rows: 0,
          show: 0,
          status: 'C'
        },
        {
          completedTime: '2020-10-16T16:32:41.5684969Z',
          corpIds: '',
          desc: 'Items which are marked as DELETE (Unallocated) and have along with OnHand Qty',
          isCorpSpecific: false,
          name: 'Delete Items',
          requestedTime: '2020-10-16T16:32:11.2452512Z',
          rowKey: 'RPT_DeletedItems',
          rows: 98,
          show: 1,
          status: 'C'
        }
      ]
    },
    prevented: false,
    workbook: {
      sheets: [
        {
          columns: [{ width: 40, autoWidth: false }, { width: 330, autoWidth: false }, { width: 188, autoWidth: false }],
          freezePane: { rowSplit: 1, colSplit: 1 },
          rows: [
            {
              type: `header`,
              cells: [
                {
                  background: `#7a7a7a`,
                  colSpan: 1,
                  color: `#fff`,
                  firstCell: true,
                  rowSpan: 1,
                  value: `sr`
                },
                {
                  type: 'data',
                  cells:
                    [
                      {
                        value: `<button class="btn btn-link customevent"
                                value =11… scenario AB_AdultIncontinence_16102020</button>` },
                      { value: 'In Progress' },
                      { value: 'Reset' }
                    ]
                }
              ]
            },
            {
              type: 'data',
              cells: [
                { value: 'Assortment Net Change' },
                { value: 'Generated' }
              ]
            }
          ]
        }
      ]
    }
  }
};
