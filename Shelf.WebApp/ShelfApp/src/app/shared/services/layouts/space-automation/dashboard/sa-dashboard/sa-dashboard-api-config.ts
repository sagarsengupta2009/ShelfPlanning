export const PLANOGRAM_OBJECT_TEMPLATE_APIS = [
    {
        // positionTemplate - type PositionObjectResponse
        Api: 'GetObjectRenderingModel',
        ApiId: 'RenderingModel',
        Parameters: [{ Parameter: null, Type: 'string' }],
    },
    {
        // modularTemplate - type - FixtureObjectResponse
        Api: 'GetObjectRenderingModel',
        ApiId: 'RenderingModel0',
        Parameters: [{ Parameter: '0', Type: 'string' }],
    },
    {
        // grillsTemplate - type - FixtureObjectResponse
        Api: 'GetObjectRenderingModel',
        ApiId: 'RenderingModel6',
        Parameters: [{ Parameter: '6', Type: 'string' }],
    },
    {
        // dividerTemplate - type - FixtureObjectResponse
        Api: 'GetObjectRenderingModel',
        ApiId: 'RenderingModel7',
        Parameters: [{ Parameter: '7', Type: 'string' }],
    }
];

export const PACKAGE_ATTRIBUTE_TEMPLATE_API = {
    Api: 'GetPkgAttrTemplate',
    ApiId: 'PkgAttrTemplate',
    Parameters: []
};

export const POG_FIXTURE_SEARCH_API = {
    Api: 'DefaultPogFixturesSearch',
    ApiId: 'PogFixturesSearch',
    Parameters: []
};

export const POG_3D_OBJECTS_API = {
    Api: 'GetPog3DObjects',
    ApiId: 'Pog3DObjects',
    Parameters: []
};

export const HIERARCHY_API = {
    Api: 'GetHierarchy',
    ApiId: 'Hierarchy1',
    Parameters: [
        { Parameter: 1, Type: 'int32' },
        { Parameter: false, Type: 'boolean' },
    ],
};
