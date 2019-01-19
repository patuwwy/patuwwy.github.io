var
    PLASMA_WIDTH = 32,
    PLASMA_HEIGHT = 32,

    p1 = 0,
    p2 = 0,
    p3 = 0,
    p4 = 1,
    t1, t2, t3, t4,
    aSin = [],
    ti = 15,
    k = 0,
    rad,
    i, j, x,
    idx,
    fd1 = 12.2, 
    volume = 0,
    cdData = new Uint8ClampedArray(PLASMA_WIDTH * PLASMA_HEIGHT * 4),
    random = false,
    as = 4.782074643298984,
    fd = 12.18910931609571,
    as1 = 2.8394995615817606,
    fd2 = 2.18898911960423,
    ps = -5.624243766069412,
    ps2 = 9.393007904291153;

this.onmessage = function (e) {
    if (e.data.volume) volume = e.data.volume;
};

main = function () {
    var
        r, g, b, a;

    cdData = new Uint8ClampedArray(PLASMA_WIDTH * PLASMA_HEIGHT * 4);

    k += 0.01;

    t4 = p4;
    t3 = p3;

    random = volume > 104;

    if (random) {
        as1 = -as1;
        p3 += Math.random() - .5;
        ps += Math.random() - .5;
    }

    i = PLASMA_WIDTH;
    while (i--) {

        t1 = p1 + 1;
        t2 = p2 + 3;

        t3 &= 511;
        t4 &= 511;

        j = PLASMA_HEIGHT;
        while (j--) {

            t1 &= 511;
            t2 &= 511;

            x = aSin[t1] * aSin[t2] / 256 + aSin[t3] * aSin[t4] / 128;

            idx = (i + j * PLASMA_WIDTH) << 2;

            if (!random) {
                r = 87 + ~~(Math.sin((x / as1 - 50) / 128) * 128) + ~~(Math.sin(i / 64) * 256);
                g = 42 + ~~(Math.sin((x / as1 - 50) / 128) * 128);
                b = 77 + ~~(Math.sin((x / as1 - 50) / 128) * 128) + ~~(Math.sin(j / 64) * 256);
                a = Math.abs(x * j / i / 32) * 8;
            } else {
                r = g = b = a = ~~(Math.random() * 255);
            }

            cdData[idx] = r;
            cdData[idx + 1] = g;
            cdData[idx + 2] = b;
            cdData[idx + 3] = a;

            t1 += 5;
            t2 += 3;
        }

        t4 += as1 / 2;
        t3 += fd1 / 2;

    }

    this.postMessage(cdData.buffer, [cdData.buffer]);

    p1 += ps >> 1;
    p3 += t3 >> 10; 
    t1 += Math.sin(k) * 4;
    t3 += Math.sin(t3) * x;

}

precalc = function () {
    var i = 512;
    while (i--) {
        rad = (i * 0.703125) * 0.0174532;
        aSin[i] = Math.sin(rad) * 1024;
    }
}

precalc();
setInterval(main, 10);
