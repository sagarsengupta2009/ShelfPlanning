import { IDragDropSettings } from '../drag-drop.module';
import { AnnotationAttribute, AnnotationResponse, AnnotationType } from '../models';
import { SharedService } from '../services/common/shared/shared.service';

/**
 * Annotation is a special use case where it will not be part of planoram object, hence this will not extend planogram base.
 */
export class Annotation {
    public $id: string = null;
    public $belongsToID: string = null;
    public selected: boolean = false;
    public Attribute: AnnotationAttribute;
    public IDPOGObject: number;
    public $sectionID: string;
    public dragDropSettings: IDragDropSettings = { drag: true, drop: false };
    public LkExtensionType: AnnotationType;
    public Content: string;
    public status: string;
    public IDPOG: number;
    public ObjectDerivedType: string;
    public IdPogObjectExtn: number;
    public TempId: string;
    public IdPogObjectExtnLocal: string;
    constructor(
        data: AnnotationResponse,
        private sharedService: SharedService,
    ) {
        Object.assign(this, data);
        this.$id = this.sharedService.nextUid();
    }

    private get yPosToPog(): number {
        return this.$belongsToID == this.$sectionID
            ? 0
            : this.sharedService.getObject(this.$belongsToID, this.$sectionID).getYPosToPog();
    }

    private get xPosToPog(): number {
        return this.$belongsToID == this.$sectionID
            ? 0
            : this.sharedService.getObject(this.$belongsToID, this.$sectionID).getXPosToPog();
    }

    public isRenderingAllowed(): boolean {
        return true;
    }

    public top(): number {
        const offset = this.yPosToPog;
        if (this.Attribute.location.relLocY == undefined || this.Attribute.location.relLocY == null) {
            this.Attribute.location.relLocY = this.Attribute.location.locY - offset;
        }
        return this.Attribute.location.relLocY + this.Attribute.location.height + offset;
    }

    public setTop(top: number): number {
        const offset = this.yPosToPog;
        this.Attribute.location.locY = top - this.Attribute.location.height;
        this.Attribute.location.relLocY = this.Attribute.location.locY - offset;
        return this.Attribute.location.locY;
    }

    public bottom(): number {
        const offset = this.yPosToPog;
        if (this.Attribute.location.relLocY == undefined || this.Attribute.location.relLocY == null) {
            this.Attribute.location.relLocY = this.Attribute.location.locY - offset;
        }
        return this.Attribute.location.relLocY + offset;
    }

    public left(): number {
        const offset = this.xPosToPog;
        if (this.Attribute.location.relLocX == undefined || this.Attribute.location.relLocX == null) {
            this.Attribute.location.relLocX = this.Attribute.location.locX - offset;
        }
        return this.Attribute.location.relLocX + offset;
    }

    public setLeft(left: number): number {
        const offset = this.xPosToPog;
        this.Attribute.location.locX = left;
        this.Attribute.location.relLocX = this.Attribute.location.locX - offset;
        return this.Attribute.location.locX;
    }

    public right(): number {
        const offset = this.xPosToPog;
        if (this.Attribute.location.relLocX == undefined || this.Attribute.location.relLocX == null) {
            this.Attribute.location.relLocX = this.Attribute.location.locX - offset;
        }
        return this.Attribute.location.relLocX + this.Attribute.location.width + offset;
    }

    public truncateByHeight(): boolean {
        return !this.Attribute.iPointSize;
    }
}
