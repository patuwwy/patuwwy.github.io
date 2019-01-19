"use strict";
//(function() {
var

    IM_DEV = true,

    StartTime = 0,

    textures = [
        { src: 'tex12.png' },
        { canvas: 'canvas-volume' },
        { src: 'tex10.png' },
        { src: 'alien.jpg' },
        { src: 'gretz2.png' },
        { src: 'cred2.fw.png' },
        { src: 'tile.jpg' },
        { src: 'cred.fw.png' },
    ],

    Uniforms = {
        //6
        currentScene: 6,
        barMod: 0,
        fade: 1,
        S5Repeat: 2.5,
        showCode: 0.,
        sceneTime: 0
    },

    Audio = {
        FILENAME: "ajax2.mp3",
        fqd: [],
        analyser: null,
        source: null
    },

    GL = null,
    CANVAS = document.getElementById("main"),
    SHADER_PROGRAM,
    TRIANGLE_VERTEX,
    TRIANGLE_FACES,

    loaderCount = textures.length,
    mTime = 1,
    audioProcessTicker = 0,
    vertexShader,
    fragmentShader,

    _position;

/**
 * Loads file.
 */
function loadFile(url, data, callback, errorCallback) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);

    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            if (request.status == 200) {
                callback(request.responseText, data)
            } else {
                errorCallback(url);
            }
        }
    };

    request.send(null);
}

function loadFiles(urls, callback, errorCallback) {
    var numUrls = urls.length,
        numComplete = 0,
        result = [],
        i = 0;

    function partialCallback(text, urlIndex) {
        result[urlIndex] = text;
        numComplete++;

        if (numComplete == numUrls) {
            callback(result);
        }
    }

    for (i = 0; i < numUrls; i++) {
        loadFile(urls[i], i, partialCallback, errorCallback);
    }
}

function setCanvasAudioUpdater(obj) {
    setInterval(function() {
        if (Audio.fqd.length) {
           obj.cubeImage.height = 256;
           var arr = [].slice.call(Audio.fqd);

           arr.map(function(a, b) {
            var c = b * 2.;
                obj.context.fillStyle = 'rgb(' + a + ', 0, 0)';
                obj.context.fillRect(c, 0, c + 1, 255);
            });
        }
    }, 1000 / 50);
}

function loadTexture(obj, num) {
    obj.texture = GL.createTexture();

    if (obj.src) {
        obj.cubeImage = new Image();
        obj.cubeImage.onload = function() { onTextureLoad(obj, num); }
        obj.cubeImage.src = obj.src;
    }

    if (obj.canvas) {
        obj.cubeImage = document.querySelector('#' + obj.canvas);
        obj.cubeImage.width = 256;
        obj.cubeImage.height = 256;
        obj.context = obj.cubeImage.getContext('2d');

        setCanvasAudioUpdater(obj);
        onTextureLoad(obj, num);
    }
}

function loadTextures() {
    textures.map(loadTexture);
}

function init() {
    try {
        GL = CANVAS.getContext("webgl", {antialias: true});
    } catch (e) { alert("WEBGL Error"); }

    loadTextures();
    loadShaders(prepareWebGL);
    loadMusic(onMusicLoaded);
}

function onMusicLoaded () {
    animate();
}

function onTextureLoad(obj, num) {
    GL.activeTexture(GL['TEXTURE' + (num)]);
    GL.bindTexture(GL.TEXTURE_2D, obj.texture);

    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.REPEAT);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, obj.cubeImage);
    loaderCount--;
}

function loadShaders(callback) {
    loadFiles(
        ['vs.glsl', 'fs.glsl'],
        function (shaderText) {
            vertexShader = GL.createShader(GL.VERTEX_SHADER);
            GL.shaderSource(vertexShader, shaderText[0]);
            GL.compileShader(vertexShader);
            fragmentShader = GL.createShader(GL.FRAGMENT_SHADER);

            GL.shaderSource(fragmentShader, shaderText[1]);
            GL.compileShader(fragmentShader);
            console.log(GL.getShaderInfoLog(fragmentShader));
            callback();
        }, function (url) {
            alert('Failed to download "' + url + '"');
        });
}

function prepareWebGL() {
    if (document.location.hash == "#FR") IM_DEV = false;
    CANVAS.width = window.innerWidth / (IM_DEV ? 2 : 1);
    CANVAS.height = window.innerHeight / (IM_DEV ? 2 : 1);

    SHADER_PROGRAM = GL.createProgram();

    GL.attachShader(SHADER_PROGRAM, vertexShader);
    GL.attachShader(SHADER_PROGRAM, fragmentShader);
    GL.linkProgram(SHADER_PROGRAM);

    _position = GL.getAttribLocation(SHADER_PROGRAM, "a_position");
    GL.enableVertexAttribArray(_position);
    GL.useProgram(SHADER_PROGRAM);

    //POINTS :
    var triangle_vertex = [
        -1, -1, //first summit -> bottom left of the viewport
        0, 0, 1,
        1, -1, //bottom right of the viewport
        1, 1, 0,
        1, 1  //top right of the viewport
        ,1, 0, 0
        ,-1, 1
        ,1, 1, 1
    ];

    TRIANGLE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, TRIANGLE_VERTEX);
    GL.bufferData(
        GL.ARRAY_BUFFER,
        new Float32Array(triangle_vertex),
        GL.STATIC_DRAW
    );

    //FACES :
    var triangle_faces = [0, 1, 2, 0, 2, 3];

    TRIANGLE_FACES = GL.createBuffer();

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TRIANGLE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(triangle_faces),
        GL.STATIC_DRAW
    );

    GL.viewport(0.0, 0.0, CANVAS.width, CANVAS.height);
    GL.clearColor(0.0, 0.0, 0.0, 0.0);
    GL.bindBuffer(GL.ARRAY_BUFFER, TRIANGLE_VERTEX);
    GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 4 * (2 + 3), 0);

    GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel0" ), 0);
    GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel1" ), 1);
    GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel2" ), 2);
    GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel3" ), 3);
    GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel4" ), 4);
    GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel5" ), 5);
    GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel6" ), 6);
    GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel7" ), 7);
}

/*========================= ANIMATE ========================= */
function animate () {
    if (loaderCount) {
        setTimeout(animate, 10);
        return
    }

    window.requestAnimationFrame(animate);

    //GL.clear(GL.COLOR_BUFFER_BIT);

    GL.activeTexture(GL.TEXTURE1);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, textures[1].cubeImage);

    GL.uniform1f(GL.getUniformLocation(SHADER_PROGRAM, "iGlobalTime"), Audio.time);
    //GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel0" ), 0);
    GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel1" ), 1);
    //GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel2" ), 2);
    //GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "iChannel3" ), 3);

    GL.uniform1f(GL.getUniformLocation( SHADER_PROGRAM, "S5Repeat" ), Uniforms.S5Repeat);

    GL.uniform1i(GL.getUniformLocation( SHADER_PROGRAM, "scene" ), Uniforms.currentScene);
    GL.uniform1f(GL.getUniformLocation( SHADER_PROGRAM, "fade" ), Uniforms.fade);
    GL.uniform1f(GL.getUniformLocation( SHADER_PROGRAM, "barMod" ), Uniforms.barMod);
    GL.uniform1f(GL.getUniformLocation( SHADER_PROGRAM, "showCode" ), Uniforms.showCode);
    GL.uniform1f(GL.getUniformLocation( SHADER_PROGRAM, "sceneTime" ), (new Date().getTime() - Uniforms.currentSceneStartTime) / 1000);

    if ((mTime % 5) < 0.03) {
        GL.uniform3f(GL.getUniformLocation( SHADER_PROGRAM, "camShift" ), Math.random() * 4, 0, 0);
    }
    GL.uniform2f(GL.getUniformLocation(SHADER_PROGRAM, "iResolution"), CANVAS.width, CANVAS.height);

    GL.uniform1f( GL.getUniformLocation( SHADER_PROGRAM, "iChannelTime"), Audio.time);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TRIANGLE_FACES);
    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0);
    GL.flush();
}

function loadMusic(callback) {
    var request = new XMLHttpRequest();
    request.open('GET', Audio.FILENAME, true);
    request.responseType = 'arraybuffer';

    request.onload = function() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        Audio.context = new AudioContext();
        Audio.context.decodeAudioData(request.response, function(buffer) {
            Audio.music = buffer;
            playMusic(callback);
        }, function(e) {});
    }

    request.send();
}

function getAverageVolume(array) {
    var
        i = 0,
        values = 0,
        average = 0,
        length = array.length;

    Audio.fqd = array;

    for (i = 0; i < length; i++) values += array[i];

    average = values / length;
    return {average: average, array: array};
}

function onAudioProcess() {
    var
        array = new Uint8Array(Audio.analyser.frequencyBinCount),
        vol;

    Audio.analyser.getByteFrequencyData(array);
    vol = getAverageVolume(array)

    Audio.volume = vol.average;
    //Audio.time = Audio.audioProcess.context.currentTime;
Audio.time = (new Date().getTime() - StartTime) / 1000.;
    audioProcessTicker++;
    if (audioProcessTicker % 5 == 0) TimelineManager();

}

function playMusic(callback) {
    Audio.source = Audio.context.createBufferSource();
    Audio.source.buffer = Audio.music;
    Audio.source.connect(Audio.context.destination);

    Audio.analyser = Audio.context.createAnalyser();
    Audio.analyser.smoothingTimeConstant = 0.4;
    Audio.analyser.fftSize = 128;

    //Audio.source.loop = true;
    Audio.source.connect(Audio.analyser);

    Audio.audioProcess = Audio.context.createScriptProcessor(256, 1, 2);
    Audio.audioProcess.connect(Audio.context.destination);

    Audio.analyser.connect(Audio.audioProcess);
    Audio.audioProcess.onaudioprocess = onAudioProcess;

    /*Audio.source.addEventListener(
        'ended', function() {
            //Audio.source.start(0);
        }
    );*/

    Audio.source.start(0);
    StartTime = new Date().getTime();
    //console.log(Audio.audioProcess.context.currentTime);

    /*
    var barLength = 60 / 128;
    setInterval(function() {
        var bar = ~~(Audio.time / barLength / 2);
        debug.log('TIME: ' + Audio.time.toFixed(2) + ' BAR: ' + (!(bar % 2) ? ('<span>' + bar + '</span>') : bar));
    }, 1000 * 60 / 128 / 8);
    */
    callback();
}
/*
var debug = {
    elem: document.getElementById('log'),
    log: function(msg) {
        debug.elem.innerHTML = msg;
    }
}*/
init();
//})();
