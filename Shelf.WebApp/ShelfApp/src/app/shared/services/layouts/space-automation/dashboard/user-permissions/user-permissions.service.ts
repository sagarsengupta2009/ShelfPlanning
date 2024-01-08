import { Injectable } from '@angular/core';
import { ConsoleLogService, OnReady } from 'src/app/framework.module';
import { Section } from 'src/app/shared/classes';
import { Permissions, PogActionTypes, UserPermissionFeatures, UserPermissionModules } from 'src/app/shared/models';
import { PlanogramStoreService, SharedService } from 'src/app/shared/services/common';

@Injectable({
    providedIn: 'root',
})
export class UserPermissionsService extends OnReady {
    /** 'Shelf Planning' module permission.
     * Not used within the code now.
     * This should be used in authentication guard implementation */
    private modulePermission: { isAdmin: boolean; permissions: Permissions; } = {
        isAdmin: false,
        permissions: {
            Read: false,
            Create: false,
            Update: false,
            Delete: false
        }
    };

    private featurePermissionMap: Map<string, Permissions> = null;

    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly log: ConsoleLogService,
    ) { super(); }

    public init(): void {
        // init() is called once the permission data is available from API.
        const allPermissionsData = this.planogramStore.appSettings.allSettingsObj?.GetUserPermissions?.data;

        this.processModulePermissions(allPermissionsData?.Modules, allPermissionsData?.IsAdmin);
        this.processFeaturePermissions(allPermissionsData?.Features);

        this.notifySubscribers();
    }

    private processFeaturePermissions(features: UserPermissionFeatures[]): void {
        if (!features || !features.length) {
            this.log.warning('Feature Permission data is missing.');
            this.featurePermissionMap = new Map();
            return;
        }
        this.featurePermissionMap = new Map(features.map(it => [it.FeatureCode, it.Permissions]));
    }

    private processModulePermissions(modules: UserPermissionModules[], isAdmin: boolean): void {
        if (isAdmin) {
            // no need to find module permission from array
            this.modulePermission = {
                isAdmin: true,
                permissions: { Read: true, Create: true, Update: true, Delete: true }
            };
            return;
        }

        if (!modules || !modules.length) {
            this.log.warning('Module Permission data is missing.');
            // defaults to no permission
            return;
        }

        const modulePermission = modules.find(it => it.Name === 'Shelf Planning');
        this.modulePermission = {
            isAdmin: false,
            permissions: modulePermission.Permissions
        }
    }

    private convertToValue(perVal: string): number {
        const perArray: number[] = perVal.split('|').map(x => +x);
        const sum = perArray.reduce((a, b) => a + b);
        return sum;
    }

    private checkUserPermission(userPermissionVal: string, actionVal: number): boolean {
        if (!userPermissionVal) {
            return true;
        }
        const sum = this.convertToValue(userPermissionVal);
        return (sum & actionVal) === actionVal;
    }

    public checkUserPermissionBySectionID(sectionID: string, actionVal: PogActionTypes): boolean {
        if (!sectionID) { return false; }

        const rootObject = this.sharedService.getObject(sectionID, sectionID) as Section;
        const permissionVal = rootObject.Permissions?.filter((data) => data.id === rootObject.IDPOG)[0]?.value;
        return this.checkUserPermission(permissionVal, actionVal);
    }

    public getPermissions(featureName: string): Permissions | undefined {
        if (!this.onReady.value) {
            this.log.warning(`Feature Permission check triggered for: '${featureName}' before UserPermissionsService is ready.`)
            return undefined;
        }
        return this.featurePermissionMap.get(featureName);
    }

    // TODO: @malu Create constant called FEATURE_NAMES
    public hasReadPermission(featureName: string): boolean {
        const permission = this.getPermissions(featureName);
        return permission ? permission.Read : false;
    }
    public hasCreatePermission(featureName: string): boolean {
        const permission = this.getPermissions(featureName);
        return permission ? permission.Create : false;
    }
    public hasDeletePermission(featureName: string): boolean {
        const permission = this.getPermissions(featureName);
        return permission ? permission.Delete : false;
    }
    public hasUpdatePermission(featureName: string): boolean {
        const permission = this.getPermissions(featureName);
        return permission ? permission.Update : false;
    }

}
