'use strict';
               

let point;
let texturePoint;
let scale;
let gl;                      
let surface;                   
let shProgram;                  
let spaceball;   
let video;
let track;
let texture;
let webCamTexture;
let webCamSurface;
let conv,
    eyes, 
    ratio,
    fov; 
let a, b, c;
let top1, bottom, left, right, near, far;
const C = 1;

function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;
    this.countText = 0;

    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }


    this.DrawPoint = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    
    this.iAttribVertex = -1;
    this.iAttribTexture = -1;
    this.iModelViewProjectionMatrix = -1;
    this.iTranslatePoint = -1;
    this.iTexturePoint = -1;
    this.iscale = -1;
    this.iTMU = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


function draw() {
    
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    calcCamParameters();
    
    applyLeftFrustrum();

    let projectionLeft = m4.frustum(left, right, bottom, top1, near, far);

    applyRightFrustrum();

    let projectionRight = m4.frustum(left, right, bottom, top1, near, far);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);
    let translateToLeft = m4.translation(-0.03, 0, -20);
    let translateToRight = m4.translation(0.03, 0, -20);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccumLeft = m4.multiply(translateToLeft, matAccum0);
    let matAccumRight = m4.multiply(translateToRight, matAccum0);

    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform2fv(shProgram.iTexturePoint, [texturePoint.x, texturePoint.y]);
    gl.uniform1f(shProgram.iscale, -1000.0);

    let projectionNoRotation = m4.perspective(Math.PI / 32, 1, 8, 22);
    let translatetoCenter = m4.translation(-0.5, -0.5, 0);
    let matrixWebCam = m4.multiply(projectionNoRotation,translatetoCenter);
    gl.bindTexture(gl.TEXTURE_2D, webCamTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        video
    );
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, translateToPointZero, getRotationMatrix());
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, matrixWebCam, getRotationMatrix());
    webCamSurface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1f(shProgram.iscale, scale);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft,getRotationMatrix());
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft,getRotationMatrix());
    gl.colorMask(false, true, true, false);
    surface.Draw();

    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
    
    gl.colorMask(true, false, false, false);
    surface.Draw();

    gl.colorMask(true, true, true, true);

    point.DrawPoint()
}

function calcCamParameters() {
    let D = document;
    let spans = D.getElementsByClassName("slider-value");
    conv = 2000.0;
    conv = D.getElementById("conv").value;
    spans[3].innerHTML = conv;
    eyes = 70.0;
    eyes = D.getElementById("eyes").value;
    spans[0].innerHTML = eyes;
    ratio = 1.0;
    fov = Math.PI / 4;
    fov = D.getElementById("fov").value;
    spans[1].innerHTML = fov;
    near = 10.0;
    near = D.getElementById("near").value - 0.0;
    spans[2].innerHTML = near;
    far = 20000.0;

    top1 = near * Math.tan(fov / 2.0);
    bottom = -top1;

    a = ratio * Math.tan(fov / 2.0) * conv;

    b = a - eyes / 2;
    c = a + eyes / 2;

}

function applyLeftFrustrum() {
    left = -b * near / conv;
    right = c * near / conv;
}

function applyRightFrustrum() {
    left = -c * near / conv;
    right = b * near / conv;
}

function playVideoFix(){
    draw();
    window.requestAnimationFrame(playVideoFix);
}

function CreateSurfaceData() {
    let vertexList = [];

    for (let j = -1; j < 1; j += 0.025) {
        for (let i = 0; i < 360; i += 5) {
            const v1 = parabola(deg2rad(i), j),
                v2 = parabola(deg2rad(i + 5), j),
                v3 = parabola(deg2rad(i), j + 0.025),
                v4 = parabola(deg2rad(i + 5), j + 0.025);
            vertexList.push(v1.x, v1.y, v1.z);
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v3.x, v3.y, v3.z);
            vertexList.push(v3.x, v3.y, v3.z);
            vertexList.push(v4.x, v4.y, v4.z);
            vertexList.push(v2.x, v2.y, v2.z);
        }
    }

    return vertexList;
}

function CreateTexture() {
    let texture = [];
    let uMax = Math.PI * 2
    let vMax = Math.PI
    let step = 0.05;
    
    //!!!!
    let U_STEP = map(step, 0, uMax*2, 0, 1)
    let V_STEP = map(step, 0, vMax, 0, 1)
    ///!!!
    
    for (let u = 0; u < uMax*2; u += step) {
        for (let v = 0; v < vMax; v += step) {
            let u1 = map(u, 0,uMax*2, 0, 1)
            let v1 = map(v, 0, vMax, 0, 1)
            texture.push(u1, v1)
            texture.push(u1 +U_STEP, v1)
            texture.push(u1, v1 + V_STEP)
            texture.push(u1, v1 + V_STEP)
            texture.push(u1 + U_STEP, v1 + V_STEP)
            texture.push(u1 + U_STEP, v1)
        }
    }

    return texture;
}

function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
    return Math.min(Math.max(m, f2), t2);
}


const azon = 0.8,
    czon = 2,
    theta = Math.PI * 0.2;
function parabola(u, t) {
    const x = (azon + t * Math.cos(theta) + czon * Math.pow(t, 2) * Math.sin(theta)) * Math.cos(u),
        y = (azon + t * Math.cos(theta) + czon * Math.pow(t, 2) * Math.sin(theta)) * Math.sin(u),
        z = -t * Math.sin(theta) + czon * Math.pow(t, 2) * Math.cos(theta);
    return { x: 0.5 * x, y: 0.5 * y, z: 0.5 * z }
}



function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iTranslatePoint = gl.getUniformLocation(prog, 'translatePoint');
    shProgram.iTexturePoint = gl.getUniformLocation(prog, 'texturePoint');
    shProgram.iscale = gl.getUniformLocation(prog, 'scale');
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

    LoadTexture()
    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());

    surface.TextureBufferData(CreateTexture());
    point = new Model('Point');
    point.BufferData(CreateSphereSurface())

    webCamSurface = new Model('webCamSurface');
    webCamSurface.BufferData([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0]);
    webCamSurface.TextureBufferData([0,1,1,1,1,0,1,0,0,0,0,1]);

    gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function init() {
    texturePoint = { x: 0.5, y: 0.5 }
    scale = 0.0;
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        video = document.createElement('video');
        video.setAttribute('autoplay', true);
        window.vid = video;
        getWebcam();
        CreateWebCamTexture();
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    playVideoFix()
}

function sphereSurfaceDate(r, u, v) {
    let x = r * Math.sin(u) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v);
    let z = r * Math.cos(u);
    return { x: x, y: y, z: z };
}

function CreateSphereSurface(r = 0.05) {
    let vertexList = [];
    let lon = -Math.PI;
    let lat = -Math.PI * 0.5;
    while (lon < Math.PI) {
        while (lat < Math.PI * 0.5) {
            let v1 = sphereSurfaceDate(r, lon, lat);
            let v2 = sphereSurfaceDate(r, lon + 0.05, lat);
            let v3 = sphereSurfaceDate(r, lon, lat + 0.05);
            let v4 = sphereSurfaceDate(r, lon + 0.05, lat + 0.05);
            vertexList.push(v1.x, v1.y, v1.z);
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v3.x, v3.y, v3.z);
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v4.x, v4.y, v4.z);
            vertexList.push(v3.x, v3.y, v3.z);
            lat += 0.05;
        }
        lat = -Math.PI * 0.5
        lon += 0.05;
    }
    return vertexList;
}


function LoadTexture() {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';
    image.src = "Texture.jpeg"
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        draw()
    }
}

onmousemove = (e) => {
    scale = map(e.clientX, 0, window.outerWidth, 0, Math.PI)
    draw()
};

function getWebcam() {
    navigator.getUserMedia({ video: true, audio: false }, function (stream) {
        video.srcObject = stream;
        track = stream.getTracks()[0];
    }, function (e) {
        console.error('Rejected!', e);
    });
}

function CreateWebCamTexture() {
    webCamTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, webCamTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}


		
let sensorFusion = {
    x: 0,
    y: 0,
    z: 0
  }
  window.addEventListener('deviceorientation', e => {
    sensorFusion.z = -e.alpha / 180 * Math.PI;
    sensorFusion.x = -e.beta / 180 * Math.PI;
    sensorFusion.y = -e.gamma / 180 * Math.PI;
  }, true);

  function getRotationMatrix() {
    var _x = sensorFusion.x;
    var _y = sensorFusion.y;
    var _z = sensorFusion.z;
    var cX = Math.cos(_x);
    var cY = Math.cos(_y);
    var cZ = Math.cos(_z);
    var sX = Math.sin(_x);
    var sY = Math.sin(_y);
    var sZ = Math.sin(_z);
    //
    // ZXY rotation matrix construction.
    //
    var m11 = cZ * cY - sZ * sX * sY;
    var m12 = - cX * sZ;
    var m13 = cY * sZ * sX + cZ * sY;
    var m21 = cY * sZ + cZ * sX * sY;
    var m22 = cZ * cX;
    var m23 = sZ * sY - cZ * cY * sX;
    var m31 = - cX * sY;
    var m32 = sX;
    var m33 = cX * cY;
    return [
      m11, m12, m13, 0,
      m21, m22, m23, 0,
      m31, m32, m33, 0,
      0, 0, 0, 1
    ];
  };