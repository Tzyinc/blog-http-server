var canvas = null;
var bounds = null;
var ctx = null;
var hasLoaded = false;

var startX = 0;
var startY = 0;
var mouseX = 0;
var mouseY = 0;
var camposX = 0;
var camposZ = 0;
var isDrawing = false;
var existingLines = [];
const factor = 50;

const moveUnit = 0.1;

var radLine = 0;
var circleX = 0;
var circleY = 0;

function showHTML() {

    initCanvas();
    draw();
}

function initCanvas() {
    canvas = document.getElementById("canvas");
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    canvas.onmousedown = onmousedown;
    canvas.onmouseup = onmouseup;
    canvas.onmousemove = onmousemove;
    canvas.ontouchstart = onmousedown;
    canvas.ontouchend = onmouseup;
    canvas.ontouchmove = onmousemove;
    
    bounds = canvas.getBoundingClientRect();
    ctx = canvas.getContext("2d");
    hasLoaded = true;

    circleX = canvas.offsetWidth / 2;
    circleY = canvas.offsetHeight / 2;
    
}

function drawBoxAtSpawn() {
    const el = document.createElement('a-box')
    el.setAttribute('position', "0 1 0");
    // el.setAttribute('rotation', { x: 0, y: 45, z: 0 })
    el.setAttribute('width', 1)
    el.setAttribute('height', 1)
    el.setAttribute('depth', 1)
    el.setAttribute('color', "#C34CD9")
    document.getElementById('scene').appendChild(el)
}

function createPlane(x, z, width, angleDeg) {
    const el = document.createElement('a-plane')
    // el.setAttribute('gltf-model', this.data.src)
    el.setAttribute('position', `${x} ${1} ${z}`);
    el.setAttribute('height', 2);
    el.setAttribute('width', width);
    el.setAttribute('color', "#4CC3D9")
    el.setAttribute('rotation', `0 ${angleDeg} 0`)
    document.getElementById('scene').appendChild(el)
}

function draw() {
    ctx.fillStyle = "#c5c5c5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (var i = 0; i < existingLines.length; ++i) {
        var line = existingLines[i];
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
    }

    ctx.stroke();

    if (isDrawing) {
        ctx.strokeStyle = "darkred";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(mouseX, mouseY);
        ctx.stroke();
    }

    ctx.strokeStyle = "green";
    ctx.beginPath();
    ctx.arc(circleX, circleY, 5, 0 * Math.PI, 2 * Math.PI);
    ctx.stroke();

    radiantLine(20, 1, 'purple');
}

function onmousedown(e) {
    if (hasLoaded && e.button === 0) {
        if (!isDrawing) {
            startX = e.clientX ? e.clientX - bounds.left : e.x;
            startY = e.clientY ? e.clientY- bounds.left : e.y;
            isDrawing = true;
        }
        // draw();
    }
}

function onmousemove(e) {
    if (hasLoaded) {
        mouseX = e.clientX ? e.clientX - bounds.left : e.targetTouches[0].clientX;
        mouseY = e.clientY ? e.clientY - bounds.left : e.targetTouches[0].clientY;
        if (isDrawing) {
            // draw();
        }
    }
}

function onmouseup(e) {
    if (hasLoaded && e.button === 0) {
        if (isDrawing) {
            existingLines.push({
                startX: startX,
                startY: startY,
                endX: mouseX,
                endY: mouseY
            });

            isDrawing = false;
            var lineAngle = getAngle(startX, startY, mouseX, mouseY);
            var width = getDist(startX, startY, mouseX, mouseY)/factor;
            // width = width * 2
            const planeX = (startX - (canvas.width / 2))/factor;
            const planeY = (startY - (canvas.height / 2))/factor;
            const endPlaneX = (mouseX - (canvas.width / 2)) / factor;
            const endPlaneY = (mouseY - (canvas.height / 2)) / factor;
            const midX = (planeX + endPlaneX) / 2;
            const midY = (planeY + endPlaneY) / 2;
            // console.log(midX, midY, width, -lineAngle);
            createPlane(midX, midY, width, -lineAngle);
            createPlane(midX, midY, width, (-lineAngle + 180) % 360);
        }
        draw();
    }
}

function getAngle(cx, cy, ex, ey) {
    var dy = ey - cy;
    var dx = ex - cx;
    var theta = Math.atan2(dy, dx); // range (-PI, PI]
    theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
    if (theta < 0) theta = 360 + theta; // range [0, 360)
    // theta = theta + 90
    if (theta > 360) theta = theta -360;
    return theta;
}

function getDist(x1, y1, x2, y2) {
    var xs = x2 - x1,
        ys = y2 - y1;

    xs *= xs;
    ys *= ys;

    return Math.sqrt(xs + ys);
};


function radiantLine(outerRadius, linewidth, color) {
    var outerX = circleX + outerRadius * Math.cos(radLine);
    var outerY = circleY + outerRadius * Math.sin(radLine);

    ctx.beginPath();
    ctx.moveTo(circleX, circleY);
    ctx.lineTo(outerX, outerY);
    ctx.strokeStyle = color;
    ctx.lineWidth = linewidth;
    ctx.stroke();
}

AFRAME.registerComponent('rotation-reader', {
    tick: function () {
        // `this.el` is the element.
        // `object3D` is the three.js object.

        // `rotation` is a three.js Euler using radians. `quaternion` also available.
        // console.log(this.el.object3D.rotation);
        radLine = (-(this.el.object3D.rotation._y + (Math.PI/2)))%(Math.PI*2)
        camposX = this.el.object3D.position.x
        camposZ = this.el.object3D.position.z
        circleX = canvas.offsetWidth / 2 + (camposX * factor);
        circleY = canvas.offsetHeight / 2 + (camposZ *factor);
        draw();
        // `position` is a three.js Vector3.\
    }
});

function clickedUp() {

    var newX = camposX + moveUnit * Math.cos(radLine);
    var newZ = camposZ + moveUnit * Math.sin(radLine);
    document.querySelector("#cament").object3D.position.set(newX, 0, newZ);
}
function clickedRight() {
    var newX = camposX - moveUnit * Math.sin(radLine);
    var newZ = camposZ - moveUnit * Math.cos(radLine);
    document.querySelector("#cament").object3D.position.set(newX, 0, newZ);
}
function clickedDown() {
    var newX = camposX - moveUnit * Math.cos(radLine);
    var newZ = camposZ - moveUnit * Math.sin(radLine);
    document.querySelector("#cament").object3D.position.set(newX, 0, newZ);
}
function clickedLeft() {
    var newX = camposX + moveUnit * Math.sin(radLine);
    var newZ = camposZ + moveUnit * Math.cos(radLine);
    document.querySelector("#cament").object3D.position.set(newX, 0, newZ);
}