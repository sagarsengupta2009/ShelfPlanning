import * as THREE from 'three';

export interface POV {
    aspect: number;
    positionX: number;
    positionY: number;
    positionZ: number;
    targetX: number;
    targetY: number;
    targetZ: number;
}

export interface BoundingBox{
    max: THREE.Vector3;
    min: THREE.Vector3;
}
