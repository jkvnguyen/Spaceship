// interactive program that displays the enterprise with perspective projection
// original: Petros Faloutsos
// modified: John Amanatides, Sept 2016

/*

        Jeremy Nguyen
        Student Number: 212176574
        EECS user: nguye688
        October 19 2016




 */


var canvas;
var gl;

var gouraudProgram, simpleProgram;

var clearColor = vec4(0.0, 0.0, 0.0, 1.0);

var lookFrom = vec3(0, 0.0, -5.0);
var looksAt = vec3(0.0, 0.0, 0.0);
var lookUp = vec3(0.0, 1.0, 0.0);

var motionUp = 0;
var motionLeft = 0;

//variables to store motionLeft and motionUp to be used for rotation that doesn't affect the original motionUp and motionLeft
var motionLeft2 = 0;
var motionUp2 = 0;

var buttonDown = 0;

var fieldOfView = 60;
var aspectRatio = 1;
var near = 1;
var far = 1000;

var lightPosition = vec4(2000, 10000, 10000, 1.0 );
var lightColor= vec4 (1.0, 1.0, 1.0, 1.0);

var materialColor= vec4 (0.5, 0.5, 0.8, 1.0);
var materialKa = 0.4;
var materialKd = 0.8;
var materialKs = 0.8;
var materialShininess = 30.0;

var modelMatrix, viewMatrix, projectionMatrix, normMatrix;
var modelViewMatrix, combinedMatrix, simpleCombinedMatrix;
var modelMatrixLoc, combinedMatrixLoc, normalMatrixLoc, eyeLoc;
var simpleCombinedMatrixLoc, simpleViewMatrixLoc;

// enterprise initial position/orientation
var currentSpeed = 0;
var currentPosition = vec3(0.0, 0.0, 0.0);
var currentDirection = vec3(0, 0.0, 1.0);

var mouseButtonDown = 0;

var currentTime = 0.0 ; // Realtime
var previousTime = 0.0 ;

window.onload = function init() {
    // initialie webgl to default values
    canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    setViewport(canvas);
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.enable(gl.DEPTH_TEST);


    // initialize simple shaders
    simpleProgram = initShaders( gl, "simple-vertex-shader", "simple-fragment-shader" );
    gl.useProgram( simpleProgram );

    simpleCombinedMatrixLoc = gl.getUniformLocation( simpleProgram, "combinedMatrix" );
    simpleViewMatrixLoc = gl.getUniformLocation( simpleProgram, "viewMatrix" );

    Stars.init(simpleProgram);

    //  initialize gouraud shaders
    gouraudProgram = initShaders( gl, "gouraud-vertex-shader", "gouraud-fragment-shader" );
    gl.useProgram( gouraudProgram );

    // initialize fragment shader lighting parameters
    eyeLoc = gl.getUniformLocation(gouraudProgram, "eye");
    gl.uniform3fv( eyeLoc,flatten(lookFrom) );
    gl.uniform4fv( gl.getUniformLocation(gouraudProgram, "lightPosition"),flatten(lightPosition) );
    gl.uniform4fv( gl.getUniformLocation(gouraudProgram, "lightColor"),flatten(lightColor) );
    gl.uniform4fv( gl.getUniformLocation(gouraudProgram, "materialColor"),flatten(materialColor) );
    gl.uniform1f( gl.getUniformLocation(gouraudProgram, "Ka"), materialKa);
    gl.uniform1f( gl.getUniformLocation(gouraudProgram, "Kd"),materialKd );
    gl.uniform1f( gl.getUniformLocation(gouraudProgram, "Ks"),materialKs );
    gl.uniform1f( gl.getUniformLocation(gouraudProgram, "shininess"),materialShininess );

    modelMatrixLoc = gl.getUniformLocation( gouraudProgram, "modelMatrix" );
    normalMatrixLoc = gl.getUniformLocation( gouraudProgram, "normalMatrix" );
    combinedMatrixLoc = gl.getUniformLocation( gouraudProgram, "combinedMatrix" );

    Enterprise.init(gouraudProgram);

    // set up interaction callback functions
    canvas.addEventListener('mousedown', function(event) {
        mouseButtonDown = 1;
    })
    canvas.addEventListener('mouseup', function(event) {
        mouseButtonDown = 0;
    })
    canvas.addEventListener('mousemove', function(event) {
        var rect = canvas.getBoundingClientRect();
        if(mouseButtonDown == 0) {

            motionLeft = 0.5 - (event.clientX-rect.left)/rect.width;
            motionUp = (event.clientY-rect.top)/rect.height -0.5;

            currentDirection = vec3(-motionLeft * 2, -motionUp * 2, currentDirection[2]);

        } else {

            motionLeft2 = 0.5 - (event.clientX-rect.left)/rect.width;
            motionUp2 = (event.clientY-rect.top)/rect.height -0.5;

            /*
                The built in multiplication/rotation functions gave me strange results
                so I just used the direct transformation calculation to rotate my camera

                Using vector3 of LookFrom (0, 0, -5), rotate this vector around the enterprise to view it
                at different locations.

             */

            //Map the X mouse location to angle to be rotated
            var c = Math.cos( radians(motionLeft2) );
            var s = Math.sin( radians(motionLeft2) );

            //Map the Y mouse location to angle to be rotated
            var c2 = Math.cos(radians(motionUp2));
            var s2 = Math.sin(radians(motionUp2));


            //Rotate the Camera around the Y axis
            lookFrom = new vec3((lookFrom[0]*c + lookFrom[2]*s),
                 lookFrom[1],
                 (-lookFrom[0] * s) + (lookFrom[2] * c));


            //Rotate the Camera around the X axis
            lookFrom = new vec3(lookFrom[0],
                lookFrom[1]*c2-lookFrom[2]*s2,
                lookFrom[1]*s2+lookFrom[2]*c2);
        }
    })
    document.addEventListener('keydown', function(event) {
        if(event.keyCode == 70) {// 'f'
            currentSpeed++;
        }
         else if(event.keyCode == 83) { //'s'
            currentSpeed--;
            if(currentSpeed < 0)
                currentSpeed= 0;
        }
        else if(event.keyCode == 68) { //'d'
            currentSpeed= 0;
        }
        //Reset camera position to original location
        else if(event.keyCode == 32){ // 'space bar'
            lookFrom = new vec3(0, 0, -5);

        }
        //Reset Enterprise position to original location
        else if(event.keyCode == 88){ // 'x'
            currentPosition = new vec3(0.0, 0.0, 0.0);
        }
    });

    canvas.resize = function (){
        setViewport(canvas);
        render();
    }

    currentTime = (new Date()).getTime() /1000 ;
    render();
}

function setViewport(canvas) {
    var c_w = window.innerWidth;  var c_h = window.innerHeight-50;
    canvas.width = c_w;   canvas.height = c_h;
    gl.viewport(0, 0, c_w, c_h);
    aspectRatio = (c_w*1.0)/c_h;
}

// Pre multiplies the model matrix with a translation matrix
// and replaces the model matrix with the result
function gTranslate(x,y,z) {
    modelMatrix = mult(translate(x,y,z), modelMatrix) ;
}

// Pre multiplies the model matrix with a rotation matrix
// and replaces the model matrix with the result
function gRotate(theta,x,y,z) {
    modelMatrix = mult(rotate(theta,[x,y,z]), modelMatrix) ;
}

// Pre multiplies the model matrix with a scaling matrix
// and replaces the model matrix with the result
function gScale(sx,sy,sz) {
    modelMatrix = mult(scale(sx,sy,sz), modelMatrix) ;
}


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // compute delta t
    previousTime = currentTime;
    currentTime = (new Date()).getTime() /1000 ;
    var deltaT = currentTime - previousTime;  // in seconds

    //My attempt at using the built in multiply
    // var test = new mat4(
    //     0.0, 0.0, 0.0, 0.0,
    //     0.0, 0.0, 0.0, 0.0,
    //     0.0, 0.0, -5.0, 0.0,
    //     0.0, 0.0, 0.0, 1.0
    // );
    // var test2 = mult(rotateY(90), test);



    // find new x-z position of enterprise
    var velocity = scale(deltaT*currentSpeed, currentDirection);
    currentPosition = add(currentPosition, velocity);

    // orient and move enterprise
    modelMatrix = mat4();

    //Rotate the Enterprise based on Y location of mouse
    gRotate(90 * motionUp, 1, 0, 0);
    //Rotate the Enterprise based on X location of mouse; Rotating the Z gives the ship a tilt look.
    gRotate(90 * motionLeft, 0, -1, 1);

    gTranslate(currentPosition);

    // compute eye location/direction (try to stay reasonable distance away)
    looksAt = currentPosition;

    // set viewing parameters
    projectionMatrix = perspective(fieldOfView, aspectRatio, near, far);

    viewMatrix = lookAt(add(lookFrom, currentPosition), looksAt, lookUp);


    // update matrices in gouraud shader and redraw enterprise
    gl.useProgram( gouraudProgram );
    gl.uniform3fv( eyeLoc,flatten(lookFrom) );
    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix) );
    normMatrix = normalMatrix(modelMatrix, false) ;
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normMatrix) );
    modelViewMatrix = mult(viewMatrix, modelMatrix);
    combinedMatrix = mult(projectionMatrix, modelViewMatrix);
    gl.uniformMatrix4fv(combinedMatrixLoc, false, flatten(combinedMatrix) );
    Enterprise.draw();

    // update matrix in simple shader and redraw stars
    gl.useProgram( simpleProgram );
    simpleCombinedMatrix = mult(projectionMatrix, viewMatrix);
    gl.uniformMatrix4fv(simpleCombinedMatrixLoc, false, flatten(simpleCombinedMatrix) );
    gl.uniformMatrix4fv(simpleViewMatrixLoc, false, flatten(viewMatrix) );
    Stars.draw();

    // update info on screen
    document.getElementById("ScreenInfo").innerHTML ="Current speed: " + currentSpeed +
        ",  Current Position: ("+ Math.round(currentPosition[0])+", "+ Math.round(currentPosition[1])+", "+ Math.round(currentPosition[2])+	")"
    + " LookFrom = " + lookFrom[0] + "| " + lookFrom[1] + "| " + lookFrom[2];


    window.requestAnimFrame(render);
}
