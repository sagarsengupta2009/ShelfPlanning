import * as THREE from 'three';

export class ThreeOrbitControls extends THREE.EventDispatcher {

  // Set to false to disable this control
  public enabled = true;

  // "target" sets the location of focus, where the object orbits around
  public target = new THREE.Vector3();

  // How far you can dolly in and out ( PerspectiveCamera only )
  public minDistance = 0;
  public maxDistance = Infinity;

  public minZoom = 0;
  public maxZoom = Infinity;

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  public minPolarAngle = 0; // radians
  public maxPolarAngle = Math.PI; // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
  public minAzimuthAngle = - Infinity; // radians
  public maxAzimuthAngle = Infinity; // radians

  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop
  public enableDamping = false;
  public dampingFactor = 0.25;

  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  public enableZoom = true;
  public zoomSpeed = 1.0;

  // Set to false to disable rotating
  public enableRotate = true;
  public rotateSpeed = 1.0;

  // Set to false to disable panning
  public enablePan = true;
  public keyPanSpeed = 7.0;	// pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  public autoRotate = false;
  public autoRotateSpeed = 5.0; // 30 seconds per round when fps is 60

  // Set to false to disable use of the keys
  public enableKeys = true;

  // The four arrow keys
  //public keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };
  public keys = { ROTATE_LEFT: 37, ROTATE_UP: 38, ROTATE_RIGHT: 39, ROTATE_BOTTOM: 40, LEFT: 65, UP: 87, RIGHT: 68, BOTTOM: 83, IN: 187, IN2: 107, OUT: 189, OUT2: 109 };

  // Mouse buttons
  public mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

  public spherical = new THREE.Spherical();
  public sphericalDelta = new THREE.Spherical();

  // for reset
  public target0 = this.target.clone();
  public position0 = this.object.position.clone();
  public zoom0 = this.object.zoom;

  public STATE = { NONE: - 1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5 };
  public state = this.STATE.NONE;

  public scale = 1;
  public panOffset = new THREE.Vector3();
  public zoomChanged = false;

  public EPS = 0.000001;

  public changeEvent: Event = new Event('change');
  public startEvent: Event = new Event('start');
  public endEvent: Event = new Event('end');

  public rotateStart = new THREE.Vector2();
  public rotateEnd = new THREE.Vector2();
  public rotateDelta = new THREE.Vector2();

  public panStart = new THREE.Vector2();
  public panEnd = new THREE.Vector2();
  public panDelta = new THREE.Vector2();

  public dollyStart = new THREE.Vector2();
  public dollyEnd = new THREE.Vector2();
  public dollyDelta = new THREE.Vector2();

  constructor(public object: any, public domElement: any, public scene: any) {

    super();

    this.object = object;

    this.domElement = (domElement !== undefined) ? domElement : document;

    this.domElement.addEventListener('contextmenu', this.onContextMenu, false);

    this.domElement.addEventListener('mousedown', this.onMouseDown, false);
    this.domElement.addEventListener('wheel', this.onMouseWheel, false);

    this.domElement.addEventListener('touchstart', this.onTouchStart, false);
    this.domElement.addEventListener('touchend', this.onTouchEnd, false);
    this.domElement.addEventListener('touchmove', this.onTouchMove, false);

    window.addEventListener('keydown', this.onKeyDown, false);

    // force an update at start

    this.update();
  }

  public getPolarAngle() {

    return this.spherical.phi;

  };

  public getAzimuthalAngle() {

    return this.spherical.theta;

  };

  public reset() {

    this.target.copy(this.target0);
    this.object.position.copy(this.position0);
    this.object.zoom = this.zoom0;

    this.object.updateProjectionMatrix();
    this.domElement.dispatchEvent(this.changeEvent);

    this.update();

    this.state = this.STATE.NONE;

  };

  public update() {

    var offset = new THREE.Vector3();

    // so camera.up is the orbit axis
    var quat = new THREE.Quaternion().setFromUnitVectors(this.object.up, new THREE.Vector3(0, 1, 0));
    var quatInverse = quat.clone().invert();

    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();



    var position = this.object.position;

    offset.copy(position).sub(this.target);

    // rotate offset to "y-axis-is-up" space
    offset.applyQuaternion(quat);

    // angle from z-axis around y-axis
    this.spherical.setFromVector3(offset);

    if (this.autoRotate && this.state === this.STATE.NONE) {

      this.rotateLeft(this.getAutoRotationAngle());

    }

    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    // restrict theta to be between desired limits
    this.spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, this.spherical.theta));

    // restrict phi to be between desired limits
    this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));

    this.spherical.makeSafe();


    this.spherical.radius *= this.scale;

    // restrict radius to be between desired limits
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    // move target to panned location
    this.target.add(this.panOffset);

    offset.setFromSpherical(this.spherical);

    // rotate offset back to "camera-up-vector-is-up" space
    offset.applyQuaternion(quatInverse);

    position.copy(this.target).add(offset);

    this.object.lookAt(this.target);

    if (this.enableDamping === true) {

      this.sphericalDelta.theta *= (1 - this.dampingFactor);
      this.sphericalDelta.phi *= (1 - this.dampingFactor);

    } else {

      this.sphericalDelta.set(0, 0, 0);

    }

    this.scale = 1;
    this.panOffset.set(0, 0, 0);

    // update condition is:
    // min(camera displacement, camera rotation in radians)^2 > EPS
    // using small-angle approximation cos(x/2) = 1 - x^2 / 8

    if (this.zoomChanged ||
      lastPosition.distanceToSquared(this.object.position) > this.EPS ||
      8 * (1 - lastQuaternion.dot(this.object.quaternion)) > this.EPS) {

      this.domElement.dispatchEvent(this.changeEvent);

      lastPosition.copy(this.object.position);
      lastQuaternion.copy(this.object.quaternion);
      this.zoomChanged = false;

      return true;

    }

    return false;



  };

  public myZoom = (vec3dir) => {
  if (this.object instanceof THREE.PerspectiveCamera) {
    // perspective
    let position = this.object.position;
    position = position.add(vec3dir);
    this.target = this.target.add(vec3dir);
  } else if (this.object instanceof THREE.OrthographicCamera) {
    // orthographic
    let position = this.object.position;
    position = position.add(vec3dir);
    this.target = this.target.add(vec3dir);
  } else {
    // camera neither orthographic or perspective
    console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
  }
};

  public dispose() {

    this.domElement.removeEventListener('contextmenu', this.onContextMenu, false);
    this.domElement.removeEventListener('mousedown', this.onMouseDown, false);
    this.domElement.removeEventListener('wheel', this.onMouseWheel, false);

    this.domElement.removeEventListener('touchstart', this.onTouchStart, false);
    this.domElement.removeEventListener('touchend', this.onTouchEnd, false);
    this.domElement.removeEventListener('touchmove', this.onTouchMove, false);

    document.removeEventListener('mousemove', this.onMouseMove, false);
    document.removeEventListener('mouseup', this.onMouseUp, false);

    window.removeEventListener('keydown', this.onKeyDown, false);

    //this.dispatchEvent( { type: 'dispose' } ); // should this be added here?

  };

  public getAutoRotationAngle() {

    return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;

  }

  public getZoomScale() {

    return Math.pow(0.95, this.zoomSpeed);

  }

  public rotateUp(angle) {

    this.sphericalDelta.phi -= angle;

  }

  public rotateDown(angle) {

    this.sphericalDelta.phi += angle;

  }

  public rotateRight(angle) {

    this.sphericalDelta.theta += angle;

  }

  public rotateLeft(angle) {

    this.sphericalDelta.theta -= angle;

  }

  public panLeft = (distance, objectMatrix) => {

    let v = new THREE.Vector3();

    v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
    v.multiplyScalar(- distance);

    this.panOffset.add(v);

  };

  public panUp = (distance, objectMatrix) => {

    var v = new THREE.Vector3();

    v.setFromMatrixColumn(objectMatrix, 1); // get Y column of objectMatrix
    v.multiplyScalar(distance);

    this.panOffset.add(v);

  }

  public pan = (deltaX, deltaY) => {

    var offset = new THREE.Vector3();

    var element = this.domElement === document ? this.domElement.body : this.domElement;

    if (this.object instanceof THREE.PerspectiveCamera) {

      // perspective
      var position = this.object.position;
      offset.copy(position).sub(this.target);
      var targetDistance = offset.length();

      // half of the fov is center to top of screen
      targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);

      // we actually don't use screenWidth, since perspective camera is fixed to screen height
      this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.object.matrix);
      this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.object.matrix);

    } else if (this.object instanceof THREE.OrthographicCamera) {

      // orthographic
      this.panLeft(deltaX * (this.object.right - this.object.left) / this.object.zoom / element.clientWidth, this.object.matrix);
      this.panUp(deltaY * (this.object.top - this.object.bottom) / this.object.zoom / element.clientHeight, this.object.matrix);

    } else {

      // camera neither orthographic nor perspective
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
      this.enablePan = false;

    }

  }

  public dollyIn(dollyScale) {

    if (this.object instanceof THREE.PerspectiveCamera) {

      this.scale /= dollyScale;

    } else if (this.object instanceof THREE.OrthographicCamera) {

      this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom * dollyScale));
      this.object.updateProjectionMatrix();
      this.zoomChanged = true;

    } else {

      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      this.enableZoom = false;

    }

  }

  public dollyOut(dollyScale) {

    if (this.object instanceof THREE.PerspectiveCamera) {

      this.scale *= dollyScale;

    } else if (this.object instanceof THREE.OrthographicCamera) {

      this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / dollyScale));
      this.object.updateProjectionMatrix();
      this.zoomChanged = true;

    } else {

      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      this.enableZoom = false;

    }

  }

  //
  // event callbacks - update the object state
  //

  public handleMouseDownRotate(event) {


    this.rotateStart.set(event.clientX, event.clientY);

  }

  public handleMouseDownDolly(event) {


    this.dollyStart.set(event.clientX, event.clientY);

  }

  public handleMouseDownPan(event) {


    this.panStart.set(event.clientX, event.clientY);

  }

  public handleMouseMoveRotate(event) {


    this.rotateEnd.set(event.clientX, event.clientY);
    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

    var element = this.domElement === document ? this.domElement.body : this.domElement;

    // rotating across whole screen goes 360 degrees around
    this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed);

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed);

    this.rotateStart.copy(this.rotateEnd);

    this.update();
  }

  public handleMouseMoveDolly(event) {


    this.dollyEnd.set(event.clientX, event.clientY);

    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

    if (this.dollyDelta.y > 0) {

      this.dollyIn(this.getZoomScale());

    } else if (this.dollyDelta.y < 0) {

      this.dollyOut(this.getZoomScale());

    }

    this.dollyStart.copy(this.dollyEnd);

    this.update();

  }

  public handleMouseMovePan(event) {


    this.panEnd.set(event.clientX, event.clientY);

    this.panDelta.subVectors(this.panEnd, this.panStart);

    this.pan(this.panDelta.x, this.panDelta.y);

    this.panStart.copy(this.panEnd);

    this.update();

  }

  public handleMouseUp(event) {


  }

  public handleMouseWheel(event) {


    if (event.deltaY < 0) {

      this.dollyOut(this.getZoomScale());

    } else if (event.deltaY > 0) {

      this.dollyIn(this.getZoomScale());

    }

    this.update();

  }

  public handleKeyDown(event) {


    switch (event.keyCode) {

      case this.keys.ROTATE_UP:
        this.rotateUp(this.getAutoRotationAngle());
        this.update();
        break;

      case this.keys.ROTATE_BOTTOM:
        this.rotateDown(this.getAutoRotationAngle());
        this.update();
        break;

      case this.keys.ROTATE_RIGHT:
        this.rotateRight(this.getAutoRotationAngle());
        this.update();
        break;

      case this.keys.ROTATE_LEFT:
        this.rotateLeft(this.getAutoRotationAngle());
        this.update();
        break;

      case this.keys.UP:
        this.pan(0, this.keyPanSpeed);
        this.update();
        break;

      case this.keys.BOTTOM:
        this.pan(0, - this.keyPanSpeed);
        this.update();
        break;

      case this.keys.LEFT:
        this.pan(this.keyPanSpeed, 0);
        this.update();
        break;

      case this.keys.RIGHT:
        this.pan(- this.keyPanSpeed, 0);
        this.update();
        break;
      
      // Zoom out using -  
      case this.keys.IN:
      case this.keys.IN2:
        this.dollyOut(this.getZoomScale());
        this.update();
        break;

      // Zoom in using +  
      case this.keys.OUT:
      case this.keys.OUT2:
        this.dollyIn(this.getZoomScale());
        this.update();
        break;  

    }

  }

  public handleTouchStartRotate(event) {


    this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);

  }

  public handleTouchStartDolly(event) {


    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    this.dollyStart.set(0, distance);

  }

  public handleTouchStartPan(event) {


    this.panStart.set(event.touches[0].pageX, event.touches[0].pageY);

  }

  public handleTouchMoveRotate(event) {


    this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

    var element = this.domElement === document ? this.domElement.body : this.domElement;

    // rotating across whole screen goes 360 degrees around
    this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed);

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed);

    this.rotateStart.copy(this.rotateEnd);

    this.update();

  }

  public handleTouchMoveDolly(event) {


    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    this.dollyEnd.set(0, distance);

    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

    if (this.dollyDelta.y > 0) {

      this.dollyOut(this.getZoomScale());

    } else if (this.dollyDelta.y < 0) {

      this.dollyIn(this.getZoomScale());

    }

    this.dollyStart.copy(this.dollyEnd);

    this.update();

  }

  public handleTouchMovePan(event) {


    this.panEnd.set(event.touches[0].pageX, event.touches[0].pageY);

    this.panDelta.subVectors(this.panEnd, this.panStart);

    this.pan(this.panDelta.x, this.panDelta.y);

    this.panStart.copy(this.panEnd);

    this.update();

  }

  public handleTouchEnd(event) {


  }


  public onMouseDown = (event) => {

    if (this.enabled === false) return;

    event.preventDefault();

    if (event.button === this.mouseButtons.ORBIT) {

      if (this.enableRotate === false) return;

      this.handleMouseDownRotate(event);

      this.state = this.STATE.ROTATE;

    } else if (event.button === this.mouseButtons.ZOOM) {

      if (this.enableZoom === false) return;

      this.handleMouseDownDolly(event);

      this.state = this.STATE.DOLLY;

    } else if (event.button === this.mouseButtons.PAN) {

      if (this.enablePan === false) return;

      this.handleMouseDownPan(event);

      this.state = this.STATE.PAN;

    }

    if (this.state !== this.STATE.NONE) {

      document.addEventListener('mousemove', this.onMouseMove, false);
      document.addEventListener('mouseup', this.onMouseUp, false);

      this.domElement.dispatchEvent(this.startEvent);

    }

  }

  public onMouseMove = (event) => {

    if (this.enabled === false) return;

    event.preventDefault();

    if (this.state === this.STATE.ROTATE) {

      if (this.enableRotate === false) return;

      this.handleMouseMoveRotate(event);

    } else if (this.state === this.STATE.DOLLY) {

      if (this.enableZoom === false) return;

      this.handleMouseMoveDolly(event);

    } else if (this.state === this.STATE.PAN) {

      if (this.enablePan === false) return;

      this.handleMouseMovePan(event);

    }

  }

  public onMouseUp = (event) => {

    if (this.enabled === false) return;

    this.handleMouseUp(event);

    document.removeEventListener('mousemove', this.onMouseMove, false);
    document.removeEventListener('mouseup', this.onMouseUp, false);

    this.domElement.dispatchEvent(this.endEvent);

    this.state = this.STATE.NONE;

  }

  public onMouseWheel = (event) => {

    if (this.enabled === false || this.enableZoom === false || (this.state !== this.STATE.NONE && this.state !== this.STATE.ROTATE)) return;

    event.preventDefault();
    event.stopPropagation();

    let delta = 0;
    if (event.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
      delta = event.wheelDelta;
    } else if (event.detail !== undefined) { // Firefox
      delta = - event.detail;
    }

    // Zoom into target (old way) when shift key is down
    // Zoom into object mouse is over when shift key is up 
    if (event.shiftKey) {
      if (delta > 0) {
        this.dollyOut(this.getZoomScale());
      } else {
        this.dollyIn(this.getZoomScale());
      }
    } else {
      let element = this.domElement === document ? this.domElement.body : this.domElement;
      let raycaster = new THREE.Raycaster();
      let mouse = new THREE.Vector2(0, 0);
      mouse.x = (event.offsetX / element.clientWidth) * 2 - 1;
      mouse.y = -(event.offsetY / element.clientHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.object);

      let scalar = 5;// minimum step if there is nothing under the cursor
      let intersects = raycaster.intersectObjects(this.scene.children, true);
      if (intersects.length > 0)
        scalar = Math.pow(intersects[0].distance, 0.4);	// check is not "infinite zoom" is not needed, because there is a camera zNear, in raycaster.setFromCamera
      let vec3dir = raycaster.ray.direction.normalize();

      if (delta > 0) {
        vec3dir = vec3dir.multiplyScalar(scalar);
        this.myZoom(vec3dir);

      } else if (delta < 0) {
        vec3dir = vec3dir.multiplyScalar(-scalar);
        this.myZoom(vec3dir);
      }
    }

    this.update();

    //this.handleMouseWheel(event);

    this.domElement.dispatchEvent(this.startEvent); // not sure why these are here...
    this.domElement.dispatchEvent(this.endEvent);

  }

  public onKeyDown = (event) => {

    if (this.enabled === false || this.enableKeys === false || this.enablePan === false) return;

    this.handleKeyDown(event);

  }

  public onTouchStart(event) {

    if (this.enabled === false) return;

    switch (event.touches.length) {

      case 1:	// one-fingered touch: rotate

        if (this.enableRotate === false) return;

        this.handleTouchStartRotate(event);

        this.state = this.STATE.TOUCH_ROTATE;

        break;

      case 2:	// two-fingered touch: dolly

        if (this.enableZoom === false) return;

        this.handleTouchStartDolly(event);

        this.state = this.STATE.TOUCH_DOLLY;

        break;

      case 3: // three-fingered touch: pan

        if (this.enablePan === false) return;

        this.handleTouchStartPan(event);

        this.state = this.STATE.TOUCH_PAN;

        break;

      default:

        this.state = this.STATE.NONE;

    }

    if (this.state !== this.STATE.NONE) {

      this.domElement.dispatchEvent(this.startEvent);

    }

  }

  public onTouchMove(event) {

    if (this.enabled === false) return;

    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {

      case 1: // one-fingered touch: rotate

        if (this.enableRotate === false) return;
        if (this.state !== this.STATE.TOUCH_ROTATE) return; // is this needed?...

        this.handleTouchMoveRotate(event);

        break;

      case 2: // two-fingered touch: dolly

        if (this.enableZoom === false) return;
        if (this.state !== this.STATE.TOUCH_DOLLY) return; // is this needed?...

        this.handleTouchMoveDolly(event);

        break;

      case 3: // three-fingered touch: pan

        if (this.enablePan === false) return;
        if (this.state !== this.STATE.TOUCH_PAN) return; // is this needed?...

        this.handleTouchMovePan(event);

        break;

      default:

        this.state = this.STATE.NONE;

    }

  }

  public onTouchEnd(event) {

    if (this.enabled === false) return;

    this.handleTouchEnd(event);

    this.domElement.dispatchEvent(this.endEvent);

    this.state = this.STATE.NONE;

  }

  public onContextMenu(event) {

    event.preventDefault();

  }
}
