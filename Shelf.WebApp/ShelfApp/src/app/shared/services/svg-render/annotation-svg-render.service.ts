import { Injectable } from '@angular/core';
import { AnnotationType, IAnnotationLine } from '../../models';
import { PlanogramService, PlanogramStoreService, SharedService } from '../common';
import * as THREE from 'three';
import { Annotation, Fixture, Position, Section } from '../../classes';
import { CommonSvgRenderService } from './common-svg-render.service';
import { AnnotationSVG } from './svg-render-common/svg-annotation';

@Injectable({
    providedIn: 'root'
})
export class AnnotationSvgRenderService {

private annotationSVG;

    constructor(
        private readonly common: CommonSvgRenderService,
        private readonly sharedService: SharedService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly planogramService: PlanogramService,

    ) {
this.annotationSVG = new AnnotationSVG(this.sharedService, this.planogramStore, this.planogramService);
    }


    public DOMAnnotation(itemData: Annotation, section: Section): IAnnotationLine {
        // const annotationObj =  new Annotation(this.sharedService,this.planogramService);

        //Create dimensions : top, bottom, left, right if not created
        if (section.anDimension.top === 0 ||
            section.anDimension.bottom === 0 ||
            section.anDimension.left === 0 ||
            section.anDimension.right === 0
        ) {
            section.computeAnnotationDimension();
        }

        const coord = this.calcConnectorCoord(itemData, section, null);
        if (!coord) return null;

        const sectionId = section.$id;

        coord.y1 = this.planogramService.convertToPixel(
            coord.y1 + section.section.anDimension.top,
            sectionId,
        );
        coord.x1 = this.planogramService.convertToPixel(
            coord.x1 + section.section.anDimension.left,
            sectionId,
        );
        coord.y2 = this.planogramService.convertToPixel(
            coord.y2 + section.section.anDimension.top,
            sectionId,
        );
        coord.x2 = this.planogramService.convertToPixel(
            coord.x2 + section.section.anDimension.left,
            sectionId,
        );
        coord.y2 -= 9;

        const lineProps: IAnnotationLine = {
            x1: coord.x1,
            y1: coord.y1,
            x2: coord.x2,
            y2: coord.y2,
            stroke: itemData.Attribute.style.lncolor,
            noCallOut: coord.noCallOut,
        };
        return lineProps;
    }




    public calculateAnnotationPosition(annotation: Annotation, refPogObject: Section | Position | Fixture, section: Section): void {
        const setTop = (ann:Annotation, top:number, offset:number) => {
            ann.Attribute.location.locY = top - ann.Attribute.location.height;
            ann.Attribute.location.relLocY = ann.Attribute.location.locY - offset;
            return ann.Attribute.location.locY;
        };

        const setLeft = (ann:Annotation, left:number, offset:number) => {
            ann.Attribute.location.locX = left;
            ann.Attribute.location.relLocX = ann.Attribute.location.locX - offset;
            return ann.Attribute.location.locX;
        };

        const refX = refPogObject.ObjectDerivedType != 'Section' ? refPogObject.getXPosToPog() : 0;
        const refTopY = refPogObject.ObjectDerivedType != 'Section' ? refPogObject.getTopYPosToPog() : 0;
        const refY = refPogObject.ObjectDerivedType != 'Section' ? refPogObject.getYPosToPog() : 0;
        if (annotation.LkExtensionType == AnnotationType.TEXT_ANNOTATION) {
            const LocY =
                refTopY > section.Dimension.Height / 2
                    ? -annotation.Attribute.location.height - 2
                    : section.Dimension.Height + 1;
            setTop(annotation, LocY + annotation.Attribute.location.height, refY);
        } else {
            const refObjHeight = refPogObject.ObjectDerivedType == 'Position' ? refPogObject.Dimension.Height : 0;
            const LocY = section.Dimension.Height - (refTopY + refObjHeight + annotation.Attribute.location.height / 2);
            setTop(annotation, LocY + annotation.Attribute.location.height, refY);
        }
        setLeft(annotation, refX, refX);
    };

    private calcConnectorCoord(annotation: Annotation, section: Section, parent: THREE.Object3D): IAnnotationLine {
     return this.annotationSVG.calcConnectorCoord(annotation, section, parent);
    };







}
