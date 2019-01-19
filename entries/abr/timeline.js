"use strict";

var
    time,
    barFloat,
    uniform,
    cTime = {},
    barLength = 60 / 128 * 2,
    fading = false,


    /*
     * scene 1 ---- distorted cube
     * scene 2 ---- bars
     * scene 3 ---- cube
     * scene 4 ---- tunnel ( meta )
     * scene 5 ---- cave
     * scene 6 ---- grid
     * scene 7 ---- grid + gretz
     */


    Timeline = {
        "8": {
            Uniforms: {
                showCode: 1.
            }
        },
        "22": { fadeOut: true },
        "24": {
            Uniforms: {
                currentScene: 3,
                fade: 1
            }
        },
        "38": { fadeOut: true },
        "40": {
            Uniforms: {
                currentScene: 4,
                S5Repeat: 2.5,
                fade: 1
            }
        },
        "54": { fadeOut: true },
        "56": {
            Uniforms: {
                currentScene: 5,
                S5Repeat: 2.5,
                fade: 1
            }
        },
        "70": { fadeOut: true },
        "72": {
            Uniforms: {
                currentScene: 5,
                S5Repeat: 5.0,
                fade: 1
            }
        },
        "79": { fadeOut: true },
        "80": {
            Uniforms: {
                currentScene: 5,
                S5Repeat: 4.2,
                fade: 1
            }
        },
        "86": { fadeOut: true },
        "88": {
            Uniforms: {
                currentScene: 7,
                fade: 1
            }
        },
        "136": { fadeOut: true },
        "138": {
            Uniforms: {
                currentScene: 8,
                fade: 1
            }
        },
        "145": { fadeOut: true },
        "148": {
            Uniforms: {
                currentScene: 9,
                fade: 1
            }
        }
    };

function TimelineManager() {

    var cTime = null;

    for (time in Timeline) {
        barFloat = parseInt(time, 10);
        if (((Audio.time / barLength)) >= barFloat && !Timeline[time].fired) {
            cTime = Timeline[time];
        }
    }

    if (cTime) {
        cTime.fired = true;
        if (cTime.Uniforms) {
            Uniforms.currentSceneStartTime = new Date().getTime();
            for (uniform in cTime.Uniforms) {
                Uniforms[uniform] = cTime.Uniforms[uniform];
            }
        }

        fading = cTime.fadeOut;
        Uniforms.fade = 1.0;
    }

    if (fading && Uniforms.fade >= 0) {
        Uniforms.fade -= 0.012;
    } else if (!fading) Uniforms.fade = 1.0;

    Uniforms.barMod = Audio.time % barLength;

}
