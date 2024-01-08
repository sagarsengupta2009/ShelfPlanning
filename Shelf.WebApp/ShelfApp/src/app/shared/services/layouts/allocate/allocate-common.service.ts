import { ApplicationRef, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import * as _ from 'lodash-es';
import { Section } from 'src/app/shared/classes';
import { Utils } from 'src/app/shared/constants';
import { NotifyService, PlanogramService, QuadtreeUtilsService } from '../..';
import { SharedService } from '../../common/shared/shared.service';

@Injectable({
    providedIn: 'root',
})
export class AllocateCommonService {
    private renderer: Renderer2;

    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly notifyService: NotifyService,
        private readonly appRef: ApplicationRef,
        rendererFactory: RendererFactory2,
        private readonly quadTreeUtils: QuadtreeUtilsService,
    ) {
        this.renderer = rendererFactory.createRenderer(null, null);
    }

    getItem(value, key) {
        let allPositions = this.sharedService.getAllPositionFromObjectList(this.sharedService.activeSectionID);
        return allPositions.filter((e) => e.Position.Product[key] == value)[0];
    }

    selectObject(value, key, item?): boolean {
        let pos;
        pos = item ? item : this.getItem(value, key);
        if (!pos) {
            this.notifyService.warn('Item not found');
            return false;
        }
        this.planogramService.removeAllSelection(this.sharedService.activeSectionID);
        this.planogramService.addToSelectionByObject(pos, this.sharedService.activeSectionID);
        return true;
    }

    highlightScope(IDProduct, bounds) {
        this.planogramService.removeAllSelection(this.sharedService.activeSectionID);

        let allPositions = this.sharedService.getAllPositionFromObjectList(this.sharedService.activeSectionID);
        let positionToSelect = [];
        for (let i = 0; i < allPositions.length; i++) {
            if (allPositions[i].Position.Product.IDProduct == IDProduct) {
                positionToSelect.push(allPositions[i]);
            }
        }

        if (positionToSelect.length > 0) {
            document.querySelector<HTMLElement>('.Position').classList.remove('block-selected');
            for (let j = 0; j < positionToSelect.length; j++) {
                this.planogramService.addToSelectionByObject(positionToSelect[j], this.sharedService.activeSectionID);
                let parent = this.sharedService.getParentObject(
                    positionToSelect[j],
                    this.sharedService.activeSectionID,
                );
                if (Utils.checkIfShoppingCart(parent)) {
                    //Materialize.toast('Item is in shopping cart', 400);

                    this.drawAnchorBounds(positionToSelect[j], bounds, 'cart-item');
                } else {
                    this.drawAnchorBounds(positionToSelect[j], bounds, 'pog-item');
                }
            }
        } else {
            //  Materialize.toast('Item not on planogram', 400)
        }
    }

    drawAnchorBounds(cusPos, itemData, flag) {
        let oldElement = document.querySelector<HTMLElement>('.pog-workspace .overlay-anchor');
        oldElement ? oldElement.remove() : null;
        let ele = this.renderer.createElement('div');
        this.renderer.addClass(ele, 'overlay-anchor');

        document.querySelector('.pog-workspace').append(ele);
        let anchor = document.querySelector<HTMLElement>('.pog-workspace .overlay-anchor');
        Object.assign(anchor.style, {
            left: 0,
            bottom: 0,
            position: 'absolute',
            'z-index': 999,
            width: document.querySelector<HTMLElement>('.pog-workspace').offsetWidth,
            height: document.querySelector<HTMLElement>('.pog-workspace').offsetHeight,
        });
        //$('.Position').css('filter','grayscale(100 %)')
        let rect = document.querySelector('.rectangle');
        rect ? rect.remove() : null;
        let pogObj = this.sharedService.getObject(
            this.sharedService.getActiveSectionId(),
            this.sharedService.getActiveSectionId(),
        ) as Section;
        let scopeBy = itemData.Scope;
        let d = { t: 0, b: 0, l: 0, r: 0 },
            curX,
            curY,
            curFixture,
            Xb,
            Xe,
            quads = { width: 0, height: 0, x: 0, y: 0, id: '' },
            cloned_curPos;
        d.t = Number(itemData.MoveUp);
        d.b = Number(itemData.MoveDown);
        d.l = Number(itemData.LPValue);
        d.r = Number(itemData.RPValue);

        if (flag == 'cart-item') {
            cloned_curPos = _.cloneDeep(cusPos);
            let parsed = JSON.parse(cloned_curPos.Position._PosDeletedRef.DescData);
            if (parsed == null) {
                let overlay = document.querySelector('.pog-workspace .overlay-anchor');
                overlay ? overlay.remove() : null;
                return;
            }

            let parentFix;
            // for certain cases where cuspos does not have IDPOGOBjectParent
            if (parsed[0] && parsed[0].IDPOGObjectParent != 'undefined') {
                parentFix = this.sharedService.getObjectByIDPOGObject(
                    parsed[0].IDPOGObjectParent,
                    this.sharedService.activeSectionID,
                );
            } else {
                parentFix = this.sharedService.getObjectByIDPOGObject(
                    parsed.IDPOGObjectParent,
                    this.sharedService.activeSectionID,
                );
            }
            if (parentFix == undefined) {
                let lastLoc = parsed[0].LastLocation;
                parentFix = pogObj
                    .getAllFixChildren()
                    .filter(
                        (e) => e.Fixture.FixtureNumber == lastLoc.Fixture && e.Fixture.ModularNumber == lastLoc.Bay,
                    )[0];
            }
            // $idparent is not available when deleted from backend, hence always take from parentFix
            cloned_curPos.$idParent = parentFix.$id;
            cloned_curPos.Location = parsed.Location ? parsed.Location : parsed[0].Location;
            cloned_curPos.Dimension = parsed.Dimension ? parsed.Dimension : parsed[0].Dimension;
            if (parentFix.ObjectDerivedType == 'ShoppingCart') {
                document.querySelector('.pog-workspace .overlay-anchor').remove();
                return;
            }
            curX = cloned_curPos.getXPosToPog();
            curY = cloned_curPos.getYPosToPog();
            curFixture = this.sharedService.getParentObject(cloned_curPos, this.sharedService.activeSectionID);
        } else {
            curX = cusPos.getXPosToPog();
            curY = cusPos.getYPosToPog();
            curFixture = this.sharedService.getParentObject(cusPos, this.sharedService.activeSectionID);
        }

        if (scopeBy == 'L') {
            Xb = curX - d.l;
            Xe = curX + cusPos.Dimension.Width + d.r;
        } else {
            quads = { width: 0, height: 0, x: 0, y: 0, id: '' };
            quads.width = pogObj.Dimension.Width;
            quads.height = curFixture.getBottomThickness();
            quads.x = 0;
            quads.y = curFixture.getQuadBounds().top;
            quads.id = pogObj.$id;
            let obj = this.quadTreeUtils.findingIntersectionsAtBound(this.sharedService.getActiveSectionId(), quads);
            obj = _.filter(obj, { ObjectDerivedType: 'StandardShelf' });
            obj = _.sortBy(obj, 'x');
            let Findex;
            let spannedFixture = [];
            for (let j = 0; j < obj.length; j++) {
                if (obj[j].id == curFixture.$id) {
                    Findex = j;
                    break;
                }
            }

            //push item fixture
            spannedFixture.push(obj[Findex]);

            if (Findex != 0) {
                //check if spanned on left of fixture
                for (let k = Findex; k > 0; k--) {
                    if (obj[k - 1].x + obj[k - 1].width != obj[k].x) {
                        break;
                    }
                    spannedFixture.push(obj[k - 1]);
                }
            }
            //check if spanned on right of fixture
            if (Findex != obj.length - 1) {
                for (let k = Findex; k < obj.length - 1; k++) {
                    if (obj[k].x + obj[k].width != obj[k + 1].x) {
                        break;
                    }
                    spannedFixture.push(obj[k + 1]);
                }
            }
            spannedFixture = _.uniq(spannedFixture);
            spannedFixture = _.sortBy(spannedFixture, 'x');
            let XposArr = [];
            let XposIdArr = [];
            let XposWidthArr = [];
            if (scopeBy == 'P') {
                for (let s = 0; s < spannedFixture.length; s++) {
                    let actualFix = this.sharedService.getObject(
                        spannedFixture[s].id,
                        this.sharedService.getActiveSectionId(),
                    ).Children;
                    actualFix = _.sortBy(actualFix, function (obj) {
                        return obj.Location.X;
                    });
                    for (let i = 0; i < actualFix.length; i++) {
                        if (actualFix[i].ObjectDerivedType == 'Position') {
                            XposArr.push(actualFix[i].getXPosToPog());
                            XposIdArr.push(actualFix[i].$id);
                        }
                    }
                }
            } else {
                for (let s = 0; s < spannedFixture.length; s++) {
                    let actualFix = this.sharedService.getObject(
                        spannedFixture[s].id,
                        this.sharedService.getActiveSectionId(),
                    ).Children;
                    actualFix = _.sortBy(actualFix, function (obj) {
                        return obj.Location.X;
                    });
                    for (let i = 0; i < actualFix.length; i++) {
                        if (actualFix[i].ObjectDerivedType == 'Position') {
                            for (let j = 0; j < actualFix[i].Position.FacingsX; j++) {
                                XposArr.push(
                                    actualFix[i].getXPosToPog() + actualFix[i].Position.ProductPackage.Width * j,
                                );
                                XposWidthArr.push(
                                    (
                                        actualFix[i].getXPosToPog() +
                                        actualFix[i].Position.ProductPackage.Width * (j + 1)
                                    ).toFixed(2),
                                );
                            }
                        }
                    }
                }
            }
            if (flag == 'cart-item') {
                XposArr.push(curX);
                XposArr.sort(function (a, b) {
                    return a - b;
                });
            }
            let currXIndex = XposArr.indexOf(curX);
            //in case of facings, starting point needs to be from start of highlighting's first element and not from its width.
            Xb =
                scopeBy == 'P'
                    ? XposArr[currXIndex - d.l < 0 ? 0 : currXIndex - d.l]
                    : XposArr[currXIndex - d.l < 0 ? 0 : currXIndex - d.l];
            Xe =
                scopeBy == 'P'
                    ? XposArr[currXIndex + d.r >= XposIdArr.length ? XposIdArr.length - 1 : currXIndex + d.r] +
                      this.sharedService.getObject(
                          XposIdArr[currXIndex + d.r >= XposIdArr.length ? XposIdArr.length - 1 : currXIndex + d.r],
                          this.sharedService.getActiveSectionId(),
                      ).Dimension.Width
                    : XposWidthArr[
                          currXIndex + d.r >= XposWidthArr.length ? XposWidthArr.length - 1 : currXIndex + d.r
                      ];
        }

        let w = Xe - Xb;
        quads.width = w;
        quads.height = pogObj.Dimension.Height;
        quads.x = Xb;
        quads.y = 0;
        quads.id = pogObj.$id;
        let obj = this.quadTreeUtils.findingIntersectionsAtBound(this.sharedService.getActiveSectionId(), quads);
        let fixtures = [];
        for (let i = 0; i < obj.length; i++) {
            if (obj[i].ObjectDerivedType == 'StandardShelf') {
                fixtures.push(obj[i]);
            }
        }
        if (flag == 'cart-item')
            curFixture = this.sharedService.getParentObject(cloned_curPos, this.sharedService.activeSectionID);
        else curFixture = this.sharedService.getParentObject(cusPos, this.sharedService.activeSectionID);
        // new
        let Yb;
        //if sloped shelf
        if (curFixture.Rotation.X != 0) Yb = curFixture.getFrontLocation().Y;
        else Yb = curFixture.Location.Y;
        let h = this.sharedService.getObject(curFixture.$id, this.sharedService.getActiveSectionId()).Dimension.Height;

        let element = document.createElement('div');
        element.className = 'rectangle anchor-bounds';
        element.style.left = this.planogramService.convertToPixel(Xb, this.sharedService.getActiveSectionId()) + 'px';
        element.style.bottom = this.planogramService.convertToPixel(Yb, this.sharedService.getActiveSectionId()) + 'px';
        element.style.width = this.planogramService.convertToPixel(w, this.sharedService.getActiveSectionId()) + 'px';
        element.style.height = this.planogramService.convertToPixel(h, this.sharedService.getActiveSectionId()) + 'px';
        element.style.position = 'absolute';
        element.style.background = '#000000';
        element.style.opacity = '0.7';
        element.style.zIndex = '99999';
        document.getElementsByClassName('pog-workspace')[0].appendChild(element);
        let newElement = document.createElement('span');
        newElement.className = 'closerect';
        newElement.style.right = '8px';
        newElement.style.top = '3px';
        newElement.style.position = 'absolute';
        newElement.style.color = '#fff';
        newElement.style.fontSize = '25px';
        newElement.style.cursor = 'pointer';
        newElement.textContent = 'X';
        document.getElementsByClassName('rectangle')[0].appendChild(newElement);

        document.querySelector('.closerect').addEventListener('click', () => {
            document.querySelector('.pog-workspace .overlay-anchor').remove();
            document.querySelector('.rectangle').remove();
        });
    }
}
