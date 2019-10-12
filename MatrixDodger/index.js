AFRAME.registerComponent('camera-listener', {
    tick: function () {
        let cameraEl = this.el.sceneEl.camera
        console.log(cameraEl.position);
        console.log(cameraEl.rotation);
        console.log('test');


    }
});