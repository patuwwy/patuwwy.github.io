window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

window.onerror = function (errorMsg, url, lineNumber, colno, error) {  
    
    var 
        stack = {},
        log = [];
    
    console.log( errorMsg + ',at LINE: ' + lineNumber, colno, error);    
    
    if (error && error.stack) {
        stack = error.stack;
    }
    
    if ('ga' in window) {
        ga('send', 'event', 'XJ220 error', errorMsg + ',at LINE: ' + lineNumber, JSON.stringify(stack));
    }
    APP.debug.innerText = lineNumber + ': ' + errorMsg;
    return false;
}

var APP = {
        TRACKS: [
            "01_moody_breeze.mod",
            "02_troubled_journey.mod",
            "03_background_noises.mod",
            "04_blood_thirsty.mod",
            "05_speedy_boy.mod",
            "06_speed_storm.mod"
        ],
        RADIO_TRACKS: [
            'a-team.mod',
            'carsp.mod',
            'chiptune1.mod',
            'damage.mod',
            'funkychip1.mod',
            'funkychip2.mod',
            'jagfunk.mod',
            'jaguarxj220.mod',
            'win.mod',
            'worldmap.mod'
        ],
        TRACKS_PATH: 'music/',
        IMG_PATH: 'img/',
        cdMode: false,
        sfxMode: true,
        radioMode: false,
        antennaState: false,
        repeatSong: true,
        currentTrack: -1,
        currentTrackStarted: null,
        currentTrackTime: '00:00',
        currentTrackTitle: '',
        controlsEnabled: true,
        seeking: {
            on: false,
            up: false
        },
        radioLenght: 51,
        debug: document.getElementById('debug'),
        init: function() {
            
            APP.GFX.init();
            
            APP.GFX.DISPLAY.init();
            APP.CONTROLS.initEvents();
            
            APP.module = new Protracker();          
            APP.ios = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1 &&  navigator.userAgent.indexOf('Android') == -1;
            APP.module.analyserEnable = false;
            
            if (APP.ios) {
                APP.debug.innerHTML = "it seems it doesn't work on safari for now<br/>";
            }
            
            setTimeout(function() {
                var body = document.body, 
                    nfo = document.getElementsByClassName('nfo'); 
                
                body.className += " off";
                [].slice.call(nfo).map(function(a) {
                    a.addEventListener('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        if (body.className.indexOf('off') > -1) {
                            body.className = body.className.replace(' off', '');
                        } else {
                            body.className += ' off';
                        }
                        return false;
                    });
                });
                
            }, 4000);
            
            setTimeout(APP.external, 100);
            
            
        },
        loadMusic: function(s, filename) {
            var requestedFile = filename;
            
            filename = filename || APP.TRACKS[APP.currentTrack];
            
            s = typeof(s) === "undefined" || s;

            APP.module.stop(s);
            APP.controlsEnabled = false;
            
            APP.module.onReady = function() {               
                APP.currentTrackStarted = new Date().getTime();
                APP.currentTrackTimeSeconds = 0;
                
                APP.module.autostart = false;
                
                if (!requestedFile) {
                    APP.module.onStop = function() {                    
                        setTimeout(function() {
                            APP.CONTROLS.playNext(false)
                        }, 2500);
                    };
                } else {
                    APP.module.onStop = function() {};
                }
                
                setTimeout(function() {
                    clearInterval(APP.songTimeInterval);
                    APP.module.paused = false;
                    
                    APP.module.play();
                    APP.module.paused = false;
                    APP.module.playing = true;
                    
                    if (APP.cdMode) APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2, 2, 140, 112, 70, 440, 209, 112, 70
                    );
                    
                    APP.songTimeInterval = setInterval(function() {
                        if (!APP.module.paused) APP.currentTrackTimeSeconds++;
                    }, 1000);
                    
                    if (APP.cdMode) {
                        APP.GFX.redraw();
                        APP.currentTrackTitle = APP.TRACKS[APP.currentTrack].replace(/\d+\_/g, '').replace('.mod', '').replace('_',' ');
                        APP.GFX.DISPLAY.drawSongTitle();
                    }
                    
                    APP.controlsEnabled = true;
                }, 1500);
            };
            
                      
            APP.module.load(APP.TRACKS_PATH + filename)
            
            
        },
        
        GFX: {
            main: document.getElementsByClassName('main')[0],
            canvas1: document.getElementById('c1'),
            canvas3: document.getElementById('c3'),
            ctx1: null,
            bg: null,
            ready: 0,
            init: function() {
                
                APP.GFX.ctx1 = APP.GFX.canvas1.getContext('2d');
                APP.GFX.ctx3 = APP.GFX.canvas3.getContext('2d');
                APP.GFX.canvas1.width = APP.GFX.canvas3.width = 640;
                APP.GFX.canvas1.height = APP.GFX.canvas3.height = 480;
                APP.GFX.preLoad();
                
            },
            preLoad: function() {
                
                APP.GFX.bg = new Image();
                APP.GFX.bg.addEventListener('load', APP.GFX.drawBG);
                
                APP.GFX.mask = new Image();
                APP.GFX.mask.addEventListener('load', APP.GFX.drawMask);
                
                APP.GFX.bg.src = APP.IMG_PATH + 'bg_a.png';
                APP.GFX.mask.src = APP.IMG_PATH + 'mask.png';
                
                APP.GFX.numbers = new Image();
                APP.GFX.numbers.addEventListener('load', function() {
                    
                    APP.GFX.canvas2 = document.createElement('canvas');
                    APP.GFX.ctx2 = APP.GFX.canvas2.getContext('2d');
                    APP.GFX.canvas2.width = 580;
                    APP.GFX.canvas2.height = 256;
                    APP.GFX.ctx2.drawImage(APP.GFX.numbers, 0, 0);
                    APP.GFX.ready = true;
                    
                });
                
                APP.GFX.numbers.src = APP.IMG_PATH + 'numbers.png';
                
            },
            
            drawBG: function() { 
                APP.GFX.ctx1.drawImage(APP.GFX.bg, 0, 0); 
                
            },
                
            drawMask: function() {
                
                APP.GFX.ctx3.drawImage(APP.GFX.mask, 0, 0);
                APP.CONTROLS.maskData = APP.GFX.ctx3.getImageData(0,0,640,480);
                
            },
            
            redraw: function() {
                
                if (!APP.GFX.ready) return;
                
                APP.GFX.drawBG();
                APP.GFX.activeButtons();
                APP.cdMode && APP.GFX.DISPLAY.drawSongTitle();
                
            },
            
            activeButtons: function() {
                if (!APP.GFX.ready) return;
                if (APP.cdMode) {
                    
                    //cd icon
                    APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2, 
                        140, 98, 86, 62, 
                        190, 206, 86, 62
                    );
                    
                    //current Track Number button
                    (APP.currentTrack > -1) && APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2, 
                        (APP.currentTrack) * 58 + 116, 48, 58, 48, 
                        (APP.currentTrack * 58) + 146, 278, 58, 48
                    );
                    
                    // play on
                    if (APP.module.playing && !APP.module.paused) {
                        APP.GFX.ctx1.drawImage(
                            APP.GFX.canvas2, 
                            2, 140, 112, 70, 
                            440, 209, 112, 70
                        )
                    }
                    
                }
                
                if (APP.sfxMode) {
                    APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2, 
                        402, 104, 76, 60, 
                        185, 205, 76, 60
                    );
                }
                
                if (APP.radioMode) {
                    APP.module.repeat = true;
                    APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2, 
                        224, 104, 96, 62, 
                        196, 206, 96, 62
                    );
                }
                console.log(APP.module.repeat);
                if (APP.module.repeat) {
                    
                    APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2, 
                        464, 21, 110, 26, 
                        469, 176, 110, 26
                    );
                } else {
                    APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2, 
                            459, 197, 110, 26, 
                            469, 176, 110, 26
                    );
                }
                
                if (APP.seeking.on) { 
                    APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2, 
                        1, 51 + 47 * (APP.seeking.up ? 0 : 1), 115, 44, 
                        31, 281, 115, 44
                    );
                }
                
            },
            
            DISPLAY: {      
            
                init: function() { APP.GFX.DISPLAY.frame(); },
                
                frame: function() {
                    
                    if (APP.GFX.ready) APP.GFX.DISPLAY.trackTime();                        
                    
                    window.requestAnimationFrame(APP.GFX.DISPLAY.frame);
                    
                },
                
                trackTime: function() {
                    
                    var now = new Date().getTime(),
                        diff = APP.currentTrackTimeSeconds,
                        secs = APP.HELPERS.pad(~~(diff) % 60, 2),
                        mins = APP.HELPERS.pad(~~(diff / 60), 2),
                        str = mins + ':' + secs,                        
                        x = 320,
                        y = 210;

                    if (APP.module.playing && APP.cdMode) {
                        APP.currentTrackTime = str;
                    } else {
                        APP.currentTrackTime = '00:00';
                    }
                        
                    if (APP.cdMode || APP.sfxMode) APP.GFX.DISPLAY.printNumbers(APP.currentTrackTime, x, y);
                    
                    
                                            
                },
                
                printNumbers: function(str, x, y) {
                    
                    str.split('').map(function(a, b) {                      
                        switch (a) {
                            case ':':    
                                a = 10;
                                break;
                            case '.':
                                a = 11;
                                break;
                            default:
                                a = parseInt(a, 10);     
                        }       
                        APP.GFX.DISPLAY.drawNum(a, x, y);
                        
                        x = x + 18;
                    });
                    
                },
                
                drawSongTitle: function() {
                    
                    var 
                        l = APP.currentTrackTitle.length,
                        k = 0,
                        x = 176,
                        codeShift = 0;
                    
                    APP.GFX.ctx1.fillStyle = "#032";
                    APP.GFX.ctx1.fillRect(176, 198, 142, 18);
                    
                    for (k; k < l; k++) {
                        codeShift = APP.currentTrackTitle.charCodeAt(k) - 97;
                        if (codeShift >= 0) APP.GFX.DISPLAY.drawChar(codeShift, x);
                        x += 8;
                    }
                    
                    
                },
                
                drawNum: function(num, x, y) {
                    
                    APP.GFX.ctx1.drawImage(APP.GFX.canvas2, 187 + num * 16, 0, 16, 48, x, y, 16, 48);                 
                    
                },
                
                drawChar: function(chr, x) {
                    
                    APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2, 
                        chr * 8 + 118, 
                        168, 
                        8, 
                        18, 
                        x, 
                        198, 
                        8, 18
                    );
                    
                }
            }
            
        },
        
        CONTROLS: {
            
            maskData: [],
            initEvents: function() {
                
                APP.GFX.canvas3.addEventListener('click', function(e) {
                    var lx = ~~((640 / APP.GFX.canvas3.clientWidth) * e.layerX),
                        ly = ~~((480 / APP.GFX.canvas3.clientHeight) * e.layerY),
                        dataPos = (ly * 640 + lx) * 4,
                        fn,
                        val;
                    
                    if (APP.CONTROLS.maskData.data.length) {
                        fn = APP.CONTROLS.maskData.data[dataPos];
                        val = APP.CONTROLS.maskData.data[dataPos + 1];
                        
                        console.log(fn, val);
                        
                        switch (fn) {
                            
                            case 20:
                                if (APP.radioMode) APP.CONTROLS.seek(val);
                                break;
                                
                            case 100:
                                if (APP.cdMode) {
                                //APP.cdMode = !(APP.radioMode = APP.sfxMode = false);                                
                                    APP.currentTrack = val - 1;
                                    APP.currentTrackTitle = "seeking...";
                                    APP.GFX.redraw();
                                    APP.loadMusic(false);
                                }
                                break;
                                
                            case 120:
                                clearInterval(APP.songTimeInterval);
                                APP.module.stop(false);
                                APP.sfxMode = !(APP.radioMode = APP.cdMode = false);    
                                currentTrackTimeSeconds = 0;
                                APP.GFX.redraw();
                                break;
                                
                            case 130:                               
                                APP.CONTROLS.changeMode();
                                break;
                                
                            case 190:                               
                                APP.CONTROLS.pause();                               
                                break;
                                
                            case 220: 
                                document.body.className += ' exiting';
                                setTimeout(function() {
                                    document.location.href = '/';
                                }, 3000);
                                break;
                                
                            case 230:
                                if (APP.cdMode) {
                                    APP.module.repeat ^= 1;
                                    APP.GFX.redraw();
                                }
                                
                                break;
                        }
                        
                    }
                });
                
            },
            
            changeMode: function() {
                
                var 
                    len = 0,
                    x = 338,
                    y = 210;
                    
                APP.module.stop(false);
                APP.sfxMode = false;
                APP.radioMode = !(APP.cdMode ^= 1);
                
                clearInterval(APP.songTimeInterval);
                APP.GFX.redraw();
                
                if (APP.radioMode) {
                    APP.CONTROLS.antenna();
                    len = APP.radioLenght.toFixed(1);
                    APP.GFX.DISPLAY.printNumbers(len, x, y);
                }
                
                if (APP.cdMode) {
                    APP.CONTROLS.initCD();
                }
                
            },
            
            antenna: function() {
                
                if (!APP.radioMode) return;
                
                APP.GFX.ctx1.drawImage(
                    APP.GFX.canvas2, 
                        228 + (APP.antennaState ? 1 : 0) * 68, 98, 66, 66, 
                        200, 200, 66, 66
                );
                
                APP.antennaState ^= 1;
                setTimeout(APP.CONTROLS.antenna, 1000);
                
            },
            
            initCD: function() {
                
                console.log('initCD');
                APP.module.stop(false);
                APP.seeking.on = false;
                APP.cdMode = !(APP.sfxMode = APP.radioMode = false);
                APP.currentTrack = -1;
                APP.currentTrackTitle = '';
                APP.GFX.redraw();
                
            },
            
            seek: function(down) {
                
                if (!APP.controlsEnabled) return;
                
                APP.module.stop(false);
                APP.seeking.up = !down;
                APP.seeking.on = true;
                APP.GFX.redraw();
                APP.controlsEnabled = false;
                APP.CONTROLS.seeking();
                
            },
            
            seeking: function() {
                
                var
                    x = 338,
                    y = 210;
                    
                if (!APP.seeking.on) {
                    clearTimeout(APP.CONTROLS.seekingInterval);
                    APP.GFX.ctx1.drawImage(
                        APP.GFX.canvas2, 
                        1, 1, 115, 44, 
                        31, 280, 115, 44
                    );
                    APP.controlsEnabled = true;
                    return                    
                } else {
                    setTimeout(APP.CONTROLS.seeking, 100);
                    if (!~~(Math.random() * 20)) {                    
                        APP.CONTROLS.playRadioSong();
                    }
                }   
                    
                APP.radioLenght += 0.17 * (APP.seeking.up ? -1 : 1); 
                
                if (APP.radioLenght > 99) APP.radioLenght = 50;
                if (APP.radioLenght < 50) APP.radioLenght = 99;
                
                APP.GFX.DISPLAY.printNumbers(
                    APP.radioLenght.toFixed(1), x, y
                );
                
            },
            
            playRadioSong: function() {
                
                clearInterval(APP.CONTROLS.seekingInterval);
                
                APP.seeking.on = false;
                APP.module.stop(false);
                APP.loadMusic(false, 
                    APP.RADIO_TRACKS[~~(Math.random() * APP.RADIO_TRACKS.length)]
                );
                
            },
            
            playNext: function(s) {
                
                if (APP.currentTrack < APP.TRACKS.length - 1) {
                    APP.currentTrack++
                } else APP.currentTrack = 0;
                
                APP.loadMusic(s);          
                
            },
            
            playPrev: function(s) {
                
                if (APP.currentTrack > 0) {
                    APP.currentTrack--;
                } else {
                    APP.currentTrack = APP.TRACKS.length - 1;
                }
                
                APP.loadMusic(s);    
                
            },
            
            pause: function() {
                
                if (APP.cdMode) {
                    if (APP.module.playing) {
                        APP.module.paused ^= 1;
                        APP.GFX.redraw();
                    } else {
                        APP.module.play();
                    }
                }
                
            }
        },
        
        HELPERS: {
            
            pad: function (num, size) {
                
                var s = "000000000" + num;
                return s.substr(s.length-size);
                
            }
        },
        
        external: function() {
            
              //ga
              (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
                  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
              })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

              ga('create', 'UA-19369352-19', 'auto');
              ga('send', 'pageview');
              
              //twitter
              !function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');
              
              //fb
              (function(d, s, id) {
                  var js, fjs = d.getElementsByTagName(s)[0];
                  if (d.getElementById(id)) return;
                  js = d.createElement(s); js.id = id;
                  js.src = "//connect.facebook.net/en_GB/sdk.js#xfbml=1&version=v2.3&appId=248008268559212";
                  fjs.parentNode.insertBefore(js, fjs);
              }(document, 'script', 'facebook-jssdk'));
        }
};

APP.init();