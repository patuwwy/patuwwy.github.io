// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

// party is tommorow. 7h to train.
// im not happy about the final effect;
// but i still like the music.

// lot of unussed code live here.
// next time i will spend more than 2 weeks on the demo.


precision highp float;
#define R 1.0
#define max_distance 130.0
#define epsilon 0.01
#define max_steps 64
#define K 0.07
#define shininess 40.0
#define ambient 0.2
#define bump_factor 0.05
#define specular_koef 1.5

#define FOV 50.0
#define PI 3.14159265
#define GLOW_COLOR vec4(239., 159. ,23., 255.) / 255.;


const bool MULTI_SAMPLING = false;
const vec3 e = vec3(0.02,0,0);
const float barLength = 60. / 128. * 2.;
uniform vec2 iResolution;

uniform float is;
uniform int scene;
uniform float barMod;
uniform float fade;
uniform float iChannelTime;
uniform float iGlobalTime;

uniform vec3 camShift;
uniform float S5Repeat;
uniform float showCode;
uniform float sceneTime;

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform sampler2D iChannel4;
uniform sampler2D iChannel5;
uniform sampler2D iChannel6;
uniform sampler2D iChannel7;

float diffuse_koef = 15.;
vec2 uv = vec2(0,0),
    puv = vec2(0,0);
vec4 fragColor = vec4(0.0);
vec2 bg1_gray = vec2(0.0, 0.5);
/*
 * UTILS
 */

float Hash2d(vec2 uv) {
    float f = uv.x + uv.y * 37.0 ;
    return fract(cos(f * 3.333) * 1003.9);
}

mat3 rotationY(float fi) {
    return mat3(
        cos(fi), 0.0, sin(fi),
          0.0, 1.0, 0.0,
        -sin(fi), 0.0, cos(fi)
    );
}

mat3 rotationZ(float k) {
    return mat3( // rotationZ matrix;
        vec3(cos(k), -sin(k), 0.0),
        vec3(sin(k), cos(k), 0.0),
        vec3(0.0, 0.0, 1.0)
    );
}

mat3 rotationX (float k) {
    return  mat3( // rotationX matrix;
        vec3(1.0, 0.0, 0.0),
        vec3(0.0, cos(k * 1.2), -sin(k * 1.2)),
        vec3(0.0, sin(k * 1.2), cos(k * 1.2))
    );
}

vec2 addObj(vec2 obj1, vec2 obj2) {
    if (obj1.x < obj2.x) return obj1;
    return obj2;

}
mat3 xrotate(float t) {
	return mat3(
        		1.0, 0.0, 0.0,
                0.0, cos(t), -sin(t),
                0.0, sin(t), cos(t)
    		);
}

mat3 yrotate(float t) {
	return mat3(
        		cos(t), 0.0, -sin(t),
                0.0, 1.0, 0.0,
                sin(t), 0.0, cos(t)
    		);
}

mat3 zrotate(float t) {
    return mat3(
        		cos(t), -sin(t), 0.0,
                sin(t), cos(t), 0.0,
                0.0, 0.0, 1.0
    		);
}

mat3 fullRotate(vec3 r) {
   return xrotate( r.x ) * yrotate( r.y ) * zrotate( r.z );
}

/*
 * TEXTURES
 */
 vec4 cubePlasma (vec2 coord, vec3 p) {
    float
        k = iGlobalTime * 3.0,
        as = 4.78207464329,
        fd = 12.18910931609,
        as1 = 2.839499561581 / 24.0 + sin(k) * 0.02,
        fd2 = 2.188989119604,
        ps = -5.624243766069,
        ps2 = 9.393007904291,
        p1 = sin(k / ps) * 4.0,
        p2 = sin(k / fd) * 3.0,
        t3 = sin(k / fd2) + cos(as1),
        t4 = sin(k / ps);

    coord.x = floor(coord.x * 16.0) / 16.0;
    coord.y = floor(coord.y * 16.0) / 16.0;

    float x = sin(p1 + coord.x) * sin(p2 + coord.y) + sin(t3 + coord.x) * sin(t4 + coord.y) * -p.x;

    float r = (0.87 + sin((x / as1 ) / 8.0) + sin(x / as1)) / 2.0;
    float g = (0.42 + sin(x / as1)) / 2.0;
    float b = (0.77 + sin(x / as1 )) + sin(coord.y / as1) / 14.0;

    if (
        coord.y <= -0.9 || coord.y >= 0.9 ||
        coord.x <= -0.9 || coord.x >= 0.9
    ) {
        r = 0.93;
        b = 0.0901;
        g = 0.6235;
    }

    return vec4(vec3(r, g, b) * 2.0 , 1.0);
}

vec4 texture3d (sampler2D t, vec3 p, vec3 n, float scale) {
    return
        texture2D(t, p.yz * scale) * abs (n.x) +
        texture2D(t, p.xz * scale) * abs (n.y) +
        texture2D(t, p.xy * scale) * abs (n.z);
}

/* ------------------- FREQUENCY ----------------------------*/

vec4 getFreq(float f){
    float fft  = texture2D( iChannel1, vec2(f, .90) ).r;
    float fft2  = texture2D( iChannel1, vec2((f + 0.1) , 0.90) ).r;

    vec3 col = vec3( fft, 4.0 * fft * (1.0 - fft), 1.0 - fft ) * fft;
    col = mix(col, vec3( fft2, 4.0 * fft2 * (1.0 - fft2), 1.0 - fft2 ) * fft2, vec3(0.55));

    return vec4(col, 1.0);
}

/* ------------------- OBJECTS ---------------------------- */

vec3 opRep( vec3 p, vec3 c ) {
    vec3 q = mod(p,c)-0.5*c;
    return q;
}

vec2 obj_round_box(vec3 p, vec3 size) {
  float d = length(max(abs(p) - size, 0.0)) - 0.5;
  return vec2(d,1);
}

vec2 obj_sphere(in vec3 p) {
  float d = length(p) - 3.0;
  return vec2(d, 1);
}

float sdBox( vec3 p, vec3 b ) {
  vec3 d = abs(p) - b;
  return min(max(d.x ,max(d.y, d.z)), 0.0) +
         length(max(d, 0.0));
}

float smin( float a, float b, float k) {
    float res = exp( -k*a ) + exp( -k*b );
    return -log( res )/k;
}

vec2 udBox( vec3 p, vec3 b ) {
  return vec2(
      length(max(abs(p)-b,0.0)),
      1.0
  );
}

float sdCylinder( vec3 p, vec3 c ) {
    return length(p.xz-c.xy)-c.z;
}
vec2 sdTorus88( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return vec2(length(q)-t.y, 1.0);
}
vec2 udPlane( vec3 p, vec3 b) {
    return vec2(
        dot(p, b) + 0.9,
        2.0
     );
}

vec2 opUnion( vec2 obj1, vec2 obj2 ) {
    if (obj1.x <= obj2.x) return obj1;
    return obj2;
}

vec2 op_sub(vec2 a, vec2 b) {
  float d = max(a.x, -b.x);
  return vec2(d, 1);
}

/*
 * SCENE 1 - destroy the cube
 */

vec2 Scene1_get_distance(vec3 point) {
    float bump = 0.0;
    float y = point.y;
    float x = point.x;
    float z = point.z;

    bump =  min(
         sin(barMod) * ((cos(y) / sin(x * z / (1.0 - sin(barMod ) ))) / sin(x + getFreq(0.1).r + getFreq(0.2).r ))
        , 2.0
       ) / 64.0;

    //vec3 bumpv = vec3(bump, bump / 4., bump / 8.);

    float fr03 = getFreq(0.09).r;



    vec3 size = vec3(0.8) + vec3(fr03 * sin(fr03) * 10.0, -getFreq(0.12).r * 2.0 * getFreq(0.35).r * 6.0, fr03 )  ;



    //vec2 box = udBox(point + vec3(0, -0.2, 0.0), size);
    //vec2 plane = udPlane(point,  vec3(0.0, 1.0, 0.0));

    //vec2 unified = opUnion(
	//	(udBox(point + vec3(0, -0.1, 0.0), size)),
	//	(udPlane(point,  vec3(0.0, 1.0, 0.0)))
	//);
    vec2 unified = (udBox(point + vec3(0, -0.1, 0.0), size));
    for (int x=0; x < 6; x++) {
    unified = opUnion(
        unified,
        sdTorus88(
            (point + vec3(0.,0. , 0.)) * fullRotate(vec3(iGlobalTime * 1.0 + float(x)/ 4.)),
            vec2(1.8, 0.0 + fr03)
        )
    );
    }

    if (unified.y == 1.0) {
     	unified.x += (bump * (1.5) * getFreq(0.1).g);
    } else {
        unified.x += (bump * (1.5) * getFreq(0.1).g) / 14.0;
    }

    return unified;
}

vec2 Scene1_Raymarch(vec3 ray_origin , vec3 ray_direction) {
    float d = 1.0;
    vec2 gd = vec2(0);
    for (int i = 0; i < max_steps; i++) {
        vec3 new_point = ray_origin + ray_direction*d;
        gd = Scene1_get_distance(new_point);
        float s = gd.x;
        if (s < epsilon) return vec2(d, gd.y);
        d += s;
        if (d > max_distance) break;
    }
    return vec2(max_distance, gd.y);
}

vec3 get_normal(vec3 point) {
    float d0 = Scene1_get_distance(point).x;
    float dX = Scene1_get_distance(point-vec3(epsilon, 0.0, 0.0)).x;
    float dY = Scene1_get_distance(point-vec3(0.0, epsilon, 0.0)).x;
    float dZ = Scene1_get_distance(point-vec3(0.0, 0.0, epsilon)).x;
    return normalize(vec3(dX-d0, dY-d0, dZ-d0));
}

float shadow_sample (vec3 org, vec3 dir) {
    float res = 1.0;
    float t = epsilon * 100.0;
    for (int i =0; i < 10; ++i){
        float h = Scene1_get_distance(org + dir*t).x;
        if (h <= epsilon) {
            return 0.0;
        }
        res = min (res, 32.0 * h / t);
        t += h;
        if (t >= max_distance) {
              return res;
        }

    }
    return res;
}

vec4 Scene1() {

    uv *= tan (radians (FOV + sin(barMod) * 1. + getFreq(0.01).r * 2.0) / 2.0) * 2.5;

    vec3 light = vec3(cos(iGlobalTime / 20.) * 4.0, 7.0, sin(iGlobalTime / 6.) * 8.0);
    mat3 rotated = rotationY(iGlobalTime / 6.0 );

    vec3 eye_pos = rotated * vec3(getFreq(.1).r * 0.0, -0.1, -4.0) + vec3(0, sin(iGlobalTime) + .35 + getFreq(0.3).r, 0.);
	vec3 up = vec3(0.0, 1.0, 0.20);
	vec3 forward = rotated * vec3(0.0, 0.0, 1.0);
	vec3 right = cross(up, forward);

	vec3 ray_dir = normalize(up * uv.y + right *uv.x + forward);

	vec2 rm = Scene1_Raymarch(eye_pos, ray_dir);
    float d = rm.x;

    vec3 point = (eye_pos+ray_dir*d);
    vec3 point_normal = get_normal(point);
    if (d < max_distance) {


        vec3 light_dir = -normalize(light-point);
        vec3 reflected_light_dir = reflect(-light_dir, point_normal);
        float attenuation = 1.0 / (1.0 + K*pow( length(light - point), 2.0));

        float dotp_diffuse = max(0.0, dot(light_dir, point_normal));
        float dotp_specular = pow(max(0.0, dot(ray_dir, reflected_light_dir)), shininess);

        // no diffuse -> no specular
        if (dotp_diffuse <= 0.0) dotp_specular = 0.0;

        diffuse_koef = 5.0 + getFreq(0.08).r * 18.0;

        fragColor = vec4(1.0, 1.0, 1.0, 1.0) * (ambient + (dotp_diffuse*diffuse_koef + dotp_specular*specular_koef) * shadow_sample(point, -light_dir) * attenuation);

        if (rm.y == 1.0) {

            fragColor += vec4(sin(point.x) * sin(point.y) * sin(point.z)) + vec4(239., 159. ,23., 255.) / 255.;//(
            fragColor += vec4(getFreq(0.03).r) / 4.0;
        } else {
            fragColor += texture3d(iChannel6, point, point_normal, 0.5);
            //fragColor += cubePlasma(mod(point.zx, 1.), point);//(iChannel6, point, point_normal, 0.5);
        }
        fragColor *= 0.3;
    } else {
        fragColor = vec4(239., 159. ,23., 255.) / 255. * sin(uv.y);
    }

    return fragColor;// * vec4(239., 159. ,23., 255.) / 255.;
}

vec4 Scene2() {
    uv.y += 1.;
    vec3 rgb = vec3(0);

    float t = iGlobalTime * 3.;
    float kk = 0.0;

    fragColor = vec4(0, 0, 0, 1.0);

    for (int k = 0; k < 16; k++) {
        kk = float(k);
        float s = sin(t + kk / 4.) / 2. * (sin(t / 3.3) + 2.) / 2. / 2.+ .8;
        if (uv.y > s && uv.y < s + 0.1) {
            rgb = vec3(uv.y - s) * 3.4;
            rgb.r *= s;
            rgb.g *= s;
            rgb.b *= s;
            if (k == 8) {
                rgb.r += .2;
                rgb.b += .3;
            }
        }
    }
    return vec4(rgb, 1.0);
}

vec2 Scene3_get_distance(in vec3 p) {

    return vec2(sdBox(p, vec3(1.0) ), 1.0);
}

vec4 boxmap( in vec3 p, in float k ) {
    vec3 m = pow( abs(p), vec3(k) );
	vec4 x = cubePlasma(p.yz, p);
	vec4 y = cubePlasma(p.zx, p);
	vec4 z = cubePlasma(p.xy, p);
	return (x * m.x + y * m.y + z * m.z) / (m.x + m.y + m.z);
}

// --------------------- SCENE 3 ---------- rotated cube

vec4 Scene3() {

  	const float maxd = 20.0; //Max depth

    vec2 vPos = gl_FragCoord.xy / iResolution.xy - 0.5;
    vec2 ovPos = vPos;
    vec2 d = vec2(0.5, 0.0);

    fragColor = vec4(0.0);

  	vec3 c, p, N, vuv, vrp, prp;

    float
        k = iGlobalTime,
    	f = 1.0, // ray start
    	mx,
        my;

    k = iGlobalTime * 1.7;

	float sk = abs(min(sceneTime * 64.0, 1024.0));
    float glow = 0.0;

    vPos.x = floor(vPos.x * sk) / floor(sk) + sin(vPos.y * PI) * vPos.x / ((sin(k) * 2. ) + 5.5);
    vPos.y = -0.0 + floor(vPos.y * sk) / floor(sk) + sin(vPos.x * PI) * vPos.x / ((sin(k + PI) * 2. + 7.5) );

    //if (ovPos.y < -0.2) vPos.x += sin(vPos.y * 32. + k) / 32.;

    vuv = vec3(0, 1, 0); // Camera up vector.
    vrp = vec3(0, 0, 0); // Camera lookat.

    mx = 0.2 * PI * 2.0;
    my = 0.6 * PI / 2.01;

    prp = vec3(cos(my)*cos(mx),sin(my),cos(my)*sin(mx))*6.0;

    // Camera setup.

    vec3 vpn = normalize(vrp - prp);
    vec3 u = normalize(cross(vuv, vpn));
    vec3 v = cross(vpn, u);
    vec3 vcv = (prp + vpn);
    vec3 scrCoord = vcv + vPos.x * u * iResolution.x / iResolution.y + vPos.y * v;
    vec3 scp = normalize(scrCoord - prp);

    // Raymarching.
    float minDist = 14.;
    for (int i = 0; i < 32; i++) {

        if ((abs(d.x) < .01) || (f > maxd)) break;

        f += d.x;
        p = prp + scp * f;
        p = p * rotationZ(k) * rotationX(k);
        if (sceneTime > barLength * 8.) {
            p.x += sin(p.y + sceneTime) * (8. - sceneTime) / 12.;
            p.y += sin(p.z + sceneTime) * (8. - sceneTime) / 14.;
            p.z += sin(p.x + sceneTime) * (8. - sceneTime) / 18.;
        }
        d = Scene3_get_distance(p);

        minDist = min(minDist, d.x * 5.);
        glow = pow( 1.25 / minDist, 3.);
    }

    if (f < maxd){

        if (d.y == 1.0) c = boxmap( p, 34.0 ).xyz;

        vec3 n = vec3(
            d.x - Scene3_get_distance(p - e.xyy).x,
            d.x - Scene3_get_distance(p - e.yxy).x,
            d.x - Scene3_get_distance(p - e.yyx).x
        );

        N = normalize(n);
		float sink = sin(k);
        vec3 L = vec3(8.5 + sink * 5.0, -7.0, -18.0 + sink * 5.0 );
        float b = abs(dot(N, normalize(prp - p + L)));
        //simple phong lighting, LightPosition = CameraPosition
        fragColor += vec4(max((b * c + pow(b, 164.0)) * (1.0 - f *.01), 0.0), 1.0);


  	} else {

        //fragColor += vec4(boxmap(-u * scp * rotationZ(k / 4.) * rotationX(k), 1.).r) / 32. + glow + vec4(54., 64., 76., 255.) / 255. * 2. ;
        fragColor = vec4(0., 0., 40., 255.) / 255. / 1. * pow(length(vec2(uv)), -2.)  + glow * GLOW_COLOR;

        vec4 rgb = vec4(0.0);

        //float t = iGlobalTime * 3.;
        //uv.y += 1.;
/*
        if (sceneTime > 4.) {
            uv.y += sin(uv.x + iGlobalTime) * (sceneTime - 4.) / 40.;
        }
        for (float kk = 0.; kk < 12.; kk += 1.) {
            float s = sin(t + kk / 4.) / 2. * (sin(t / 3.3) + 2.) / 2. / 2.+ .8;

            if (uv.y > s && uv.y < s + 0.1) {
                rgb = vec4(vec3(uv.y - s) * PI, 1.0) * s - vec4(sin(kk / 12.), 0.2, -0.1, 0.0);
                //if (kk == 8.) {
                    //rgb += GLOW_COLOR;
                //}

            }

        }
*/
        fragColor += vec4(rgb);


    }

    return fragColor;
}





/* ---------------------------------------- SCENE 4 --------------------------*/
vec3 Scene4_boxRotation() {
    float k = iGlobalTime / 3.0;
    return vec3(
        sin(k) * PI * 2.0,
        sin(k / 1.2) * PI * 2.,
        sin(k / 1.4) * PI * 2.0
    );
}

vec2 Scene4_obj_rnd(in vec3 p) {
    vec2 h = vec2(0.4, 0.2) ;
	vec3 q = abs(p) ;

    float bar_x, bar_y, bar_w, bar_z;
    float bar_p = 2.;//fract(iGlobalTime / 10.) / 10.;
    float s = 4.0;
	//float bar_w = bar_p * (1.2125 + 0.105125 * float(1.0 + 2.0)) * 0.56 * 0.3;
    if (S5Repeat == 5.0) {

        bar_w = bar_p * (2.0125 + 0.405125 * float(1.0 + 2.0)) * 0.116 * 0.5;
	    bar_x = -abs(sin(iGlobalTime / 6. + p.x) / 4.) + length(max(abs(mod(p.yz, bar_p)-bar_p * 0.5) - bar_w,0.0));
	    bar_y = mod(p.z, 1.) + length(max(abs(mod(p.xz, bar_p)-bar_p / 0.5) + bar_w,0.0) - bar_w);
	    bar_z = fract(p.x + bar_x * p.z) + length(max(abs(mod(p.xy, bar_p)-bar_p * (0.5 + sin(bar_w) / 10.))-bar_w,0.0)) ;


    } else {

        bar_w = bar_p * (1.2125 + 0.105125 * float(1.0 + 2.0)) * 0.56 * 0.3;
        bar_x = length(max(abs(mod(p.yz, bar_p)-bar_p * 0.5) - bar_w,0.0));
    	bar_y = length(max(abs(mod(p.xz, bar_p)-bar_p / 1.5) + bar_w,0.0));
    	bar_z = length(max(abs(mod(p.xy, bar_p)-bar_p * (0.5 + sin(s) / 10.))-bar_w,0.0)) ;
    }


    return vec2(

        	-min(
            	min(
                	max(
                    	max(-bar_x, -bar_y),
                    	-bar_z
                	),
                    11.
            	),
            	0.

        	),
        1.0);

}
vec2 Scene4_sdSphere(vec3 p, float s) {
    vec3 q = vec3(sin(p.z * 2.) * 2. + 2., sin(p.x * 8.) / 2.0 + .5, sin(p.y) + 1.) * sin(iGlobalTime) + 1.;
    p += q / 4.;
    return vec2(length(p) - s, 2.0);
}

vec2 Scene4_op_rep(vec3 p, vec3 c) {
    vec3 q = mod(p, c / 2.) - 2.5 * c;
    return Scene4_obj_rnd(q);
}

vec3 Scene4_boxPosition() {
    float k = iGlobalTime / 4.0;
    return vec3(-.7, -1.6, 4. + k * 38. );
}

vec2 Scene4_distance_to_obj(in vec3 p) {
    float k = iGlobalTime/ 4.0;
    return addObj(
      Scene4_op_rep(p / 3.0, vec3(5.0, 5.0, 4.0)),
      //sdBox(p + vec3(0., -1.5, 10. +k * 38. + sin(k) * 3.), vec3(2.0, 1.0, 1.0))
      Scene4_sdSphere(
          p + Scene4_boxPosition(),
          0.5
      )
    );
}

vec4 Scene4_ballTexture (vec2 coord, vec3 p) {
    coord = vec2(atan(p.x, p.z) / 6.2831, acos(p.y) / 3.1416);

    float r, g, b;
    r = g = b = 1.;

    if (mod(coord.x + coord.y, 0.1) < 0.05) {
       b = 0.;
       g = 0.;
    }

    return vec4(vec3(r, g, b), 1.0);
}

vec4 Scene4_sphere_map( in vec3 p, in float k ) {
    vec3 m = pow( abs(p), vec3(k) );
	vec4 x = Scene4_ballTexture(p.yz, p);
	vec4 y = Scene4_ballTexture(p.zx, p);
	vec4 z = Scene4_ballTexture(p.xy, p);
	return (x * m.x + y * m.y + z * m.z) / (m.x + m.y + m.z);
}

// Floor
vec2 Scene4_obj_floor(in vec3 p) {
  return vec2(p.y + 10.0,0);
}

vec3 Scene4_prim_c(in vec3 p, float c) {
  return vec3(1.0, 0.1, 1.4 * sin(p.x) );
}

vec4 Scene4() {
    vec4 fragColor;
      vec2 vPos = gl_FragCoord.xy / iResolution.xy - 0.5;
      float k = iGlobalTime/ 4.0,
            b = 0.;

      // Camera setup.
      vec3 vuv = vec3(cos(k), sin(k), cos(k));
      vuv = vec3(0, 1., 0);

      vec3 prp = vec3(0);

        prp.x = sin(k) * 5.;
        prp.y = sin(k) * 1. + 1.4;
        prp.z = -k * 38.0 - cos(k) * 6.;

        vec3 vrp = prp + vec3(
         -vPos.x * 2.0 ,//+ sin(k) * PI * 2.0,
        (1. , sin(vPos.x) * sin(iGlobalTime / 8.)) ,
        -1.0); //cam lookat

      //look arond :)


      vrp = -Scene4_boxPosition() + vec3(0, 0, 0.);

      vec3 vpn = normalize(vrp - prp);
      vec3 u = normalize(cross(vuv, vpn));
      vec3 v = cross(vpn, u);
      vec3 vcv = (prp + vpn);
      vec3 scrCoord = (vcv + vPos.x * u * iResolution.x/iResolution.y + vPos.y * v);
      vec3 scp = normalize(scrCoord - prp);

      // Raymarching.
      const vec3 e = vec3(0.012, 0.0, 1.3);
      const float maxd = 50.0; //Max depth
      vec2 d = vec2(0.14, 0.0);
      vec3 c, p, N;

        float f = 1.0;
        float glow = 0.0;
        float minDist = 100.;
        for(int i = 0; i < 76; i++) {

            if (abs(d.x) < .001 || f > maxd) {
                break;
            }
            f += d.x;
            p = prp + scp * f;
            d = Scene4_distance_to_obj(p);
            if (d.y == 2. && i < 12) {
                minDist = min(minDist, d.x * 8.);
                glow = 0.1 / minDist;
            }

        }

        if (f < maxd) {

            if (d.y == 2.0) {
                glow = 0.;
                c = Scene4_sphere_map(
                        fullRotate(Scene4_boxRotation()) * (p + Scene4_boxPosition()),
                        2.0
                    ).xyz;

                vec3 n = vec3(d.x-Scene4_distance_to_obj(p-e.xyy).x,
                          d.x-Scene4_distance_to_obj(p-e.yxy).x,
                          d.x-Scene4_distance_to_obj(p-e.yyx).x);

                N = normalize(n);

                vec3 L = vec3(0, 2., 1.);

                b = dot(N, normalize(prp - p + L));

                fragColor = vec4((b * c + pow(b, 64.0)) * (1.0 - f * .001), 1.0) * 1.2;

            } else {

                b = f / 38.;
                //c = texture3d(iChannel6, p.xzy, p, 0.2).rgb / 18.;
                c = vec3(0., 0. , 90.) / 255.;
                fragColor = vec4(c * b + pow(b, 4.0) * (f * 0.9 + abs(sin(barMod / 4.)) / 4.), 1.0);
                //fragColor += vec4(71.0, 90.0, 71.0, 1.0) / 255. / 4. ;

                //lines
                //if (mod(p.y, 3.) < 0.05) fragColor += vec4(239., 159. ,23., 255.) / 255.;
                if (mod(p.z, 10.) < 0.15) fragColor += vec4(239., 159. ,23., 255.) / 255.;

                //fragColor = 1.2 * vec4(vec3((fragColor.r + fragColor.g + fragColor.b) / 3.) , 1.0);

            }


        }
        else {
          fragColor = vec4(1.0, 1.0, 1.0, 1.0);
        }


        fragColor += glow;

        return fragColor;
}


/*----------------------------------------------SCENE 5 -- cave ------------*/
vec2 Scene5_distance_to_obj(in vec3 p) {
    vec3 c = vec3(S5Repeat); // SEND UNIFORM HERE
    vec3 q = mod(p, c) - 0.5 * c;

    vec2 obj = opUnion(
      op_sub(obj_round_box(q, vec3(2.0)), obj_sphere(q)),
        vec2(sdCylinder(q +  .5 , vec3(.3, 0.3, 0.3)), 2.0)
    );

  return obj;
}

vec4 Scene5 () {
    vec2 vPos = uv; //fragCoord.xy/iResolution.xy - 0.5;
    float k = iGlobalTime / 2.0 ;
    float wave = sin(k + vPos.y );//texture2D( iChannel0, vec2(vPos.x,0.75) ).x;

  // Camera setup.
    vec3 vuv = vec3(0, sin(k), cos(k)); // Camera up vector.
    vec3 prp = vec3(
        -2.5 - cos(k / 8.) * 112.5,
        1.5,//-2.5 + sin(k) * 12.5,
        -1.5 ); //cam position
    vec3 vrp = prp + vec3(
        -0.5 + cos(k / 4.) * 15.,
        0.5 + vPos.y * 0.2 + cos(k / 4.) * 5. ,
        -1.0 + cos(k) * 15.
    ); //cam lookat


  // Camera setup.
    vec3 vpn=normalize(vrp-prp);
    vec3 u=normalize(cross(vuv,vpn));
    vec3 v=cross(vpn,u);
    vec3 vcv=(prp+vpn);
    vec3 scrCoord=vcv+vPos.x*u*iResolution.x/iResolution.y+vPos.y*v;
    vec3 scp=normalize(scrCoord-prp);

  // Raymarching.
    const float maxd = 100.0; //Max depth
    vec2 d = vec2(0.01, 0.0);
    vec3 c = vec3(0.), p, N;

    float f = 1.001;
    float delta = 0.0;

    for(int i = 0; i < 32; i++) {

        if ((abs(d.x) < .001) || (f > maxd)) break;

        f += d.x + delta;
        p = prp + scp * f;

        p.x += sin(p.y) * wave;
        p.z += cos(p.y) * wave;
        d = Scene5_distance_to_obj(p);
        //delta += 0.000514;

    }

    if (f < maxd) {
        //f = cos(f / 50. * 6.28 * 2. ) * 10. ;
        vec3 tex = vec3(texture3d(iChannel3, p, p, 0.1).rrr / 2.);

        if (mod(p.y + p.x / p.x + k * 12., 20.) < 5.0 + sin(p.x) * 2.) {
            c.gb += 122.7;
        } else if (mod(p.y + p.x * sin(k * 12.), 20.) < 3.0 + sin(p.x) * 2.) {
            c.r = 0.;
            //c.b = 0.;
            //c.g = 0.;
        }
        c += tex + vec3(0., 0. , 180.) / 4. ;
        float b = 0.0 + f / 40.0;
        fragColor = vec4(vec3(c * b + pow(b, 2.0)) * (f * .0159), 1.0) / 32. ;
      //fragColor = fragColor * 0.3;

    } else fragColor = vec4(0.);

    return fragColor ;
}

/* ------------------------ SCENE 6 ------- GRID --------------------*/



vec2 Scene6_obj_rnd(in vec3 p) {
    float bar_p = 1.0;
	float bar_w = (0.08325 * 3.) * 0.2 + sin(p.z + iGlobalTime) / 8. * cos(p.x + iGlobalTime) / .8;
	float bar_x = length(max(abs(mod(p.yz, bar_p)-.5)-bar_w, 0.0));
	float bar_y = length(max(abs(mod(p.xz, bar_p)-.5)-bar_w, 0.0));
	float bar_z = length(max(abs(mod(p.xy, bar_p)-.5)-bar_w, 0.0)) ;
	float tube_p = 0.04120325;
	float tube_w = 0.0215375 + sin(p.x * p.z) / 103.;
    float tube_pp = 0.02060162;
	float tube_x=length(mod(p.yz, tube_p)-tube_pp) - tube_w ;
	float tube_y=length(mod(p.xz, tube_p)-tube_pp) - tube_w;
	float tube_z=length(mod(p.xy, tube_p)-tube_pp) - tube_w;
	return vec2(-min(min(
                	max(
                    	max(-bar_x,-bar_y),
                    	-bar_z
                	),
                    tube_y
            	),tube_z),
        1.0);
}

vec2 Scene6_op_rep(vec3 p, vec3 c) {
  vec3 q = mod(p, c) - 14.5 * c;
  return Scene6_obj_rnd(q);
}

vec2 Scene6_distance_to_obj(in vec3 p) {
  return Scene6_op_rep(p / 2.0, vec3(5.0));
}

vec4 Scene6() {
  vec2 vPos = uv;
  float k = iGlobalTime / 4.0;

  float sink = sin(k);

  // Camera setup.
  vec3 vuv = vec3(1., 0, 0); // Camera up vector.
  vec3 prp = vec3(1., -1.0,  -k * 18.0); //cam position
  vec3 vrp = prp + vec3(
      sink * 6.283193,
      sink * 20. + 40.,
      sink * 20.); //cam lookat

  vec3 vpn = normalize(vrp - prp);
  vec3 u = normalize(cross(vuv, vpn));
  vec3 v = cross(vpn, u);
  vec3 vcv = (prp + vpn);
  vec3 scrCoord = (vcv + vPos.x * u * iResolution.x/iResolution.y + vPos.y * v);
  vec3 scp = normalize(scrCoord - prp);

  float maxd = 140.0; //Max depth
  vec2 d = vec2(2.);
  vec3 p;

  float f = -1.0;
  for(int i = 0; i < 56; i++) {
      if ((abs(d.x) < .001) || (f > maxd)) break;
      f += d.x;
      p = prp + scp * f;
      d = Scene6_distance_to_obj(p);
  }

  if (f < maxd) {
      fragColor = vec4(f / 24.) * vec4(10.0, 40.0, 190.0, 255.) / 255.;
      if (mod(p.x * 2. + p.y * 2. + k * 24. - getFreq(0.1).r * 10., 42.0) > 40.0) fragColor = vec4(111.0, 98.0, 84.0, 255) / 255. / 2. * getFreq(0.1).r * 20.;//mod(p.y, 4.0) / 1.;
  } else {
      fragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
    if (showCode == 1.) {
        vec4 creds = texture2D(iChannel5, vec2(puv.x, -puv.y * 0.9 - 0.03));
        fragColor += creds.a * (creds - pow(fragColor, creds));//0.8 + fragColor * (1.- creds.a);
    }
  return fragColor;

}

/* -------------------------- SCENE 7 --------- grid grettz -----*/




vec2 Scene7_obj_rnd(in vec3 p) {
    float bar_p = 1.0;
	float bar_w = (0.08325 * 3.) * 0.2 + sin(p.z + iGlobalTime) / 8. * cos(p.x + iGlobalTime) / .8;
	float bar_x = length(max(abs(mod(p.yz, bar_p)-.5)-bar_w, 0.0));
	float bar_y = length(max(abs(mod(p.xz, bar_p)-.5)-bar_w, 0.0));
	float bar_z = length(max(abs(mod(p.xy, bar_p)-.5)-bar_w, 0.0)) ;
	float tube_p = 0.04120325 + sceneTime / 1000.;
	float tube_w = 0.0215375 + sin(p.x * p.z) / 103.;
    float tube_pp = 0.02060162;
	float tube_x=length(mod(p.yz, tube_p)-tube_pp) - tube_w ;
	float tube_y=length(mod(p.xz, tube_p)-tube_pp) - tube_w;
	float tube_z=length(mod(p.xy, tube_p)-tube_pp) - tube_w;
	return vec2(-min(min(
                	max(
                    	max(-bar_x,-bar_y),
                    	-bar_z
                	),
                    tube_y
            	),tube_z),
        1.0);
}

vec2 op_rep(vec3 p, vec3 c) {
  vec3 q = mod(p, c) - 14.5 * c;
  return Scene7_obj_rnd(q);
}

vec2 Scene7_distance_to_obj(in vec3 p) {
  return op_rep(p / 2.0, vec3(5.0));
}

vec4 Scene7() {
  vec2 vPos = uv;
  float k = iGlobalTime / 4.0;

  if (sceneTime > 10.) {
      //vPos.x += sin(vPos.y) / 2. * sin((10. - sceneTime / 16.));
  }
  float sink = sin(k);

  // Camera setup.
  vec3 vuv = vec3(sin(k) / 10. + 0.2, cos(k) / 10. + 0.2, 0); // Camera up vector.
  vec3 prp = vec3(1. + sin(k) * 0.2, -1.0,  -k * 18.0); //cam position
  vec3 vrp = prp + vec3(0.,
      40.,
      sin(k) * 10.); //cam lookat

  vec3 vpn = normalize(vrp - prp);
  vec3 u = normalize(cross(vuv, vpn));
  vec3 v = cross(vpn, u);
  vec3 vcv = (prp + vpn);
  vec3 scrCoord = (vcv + vPos.x * u * iResolution.x/iResolution.y + vPos.y * v);
  vec3 scp = normalize(scrCoord - prp);

  float maxd = 40.0; //Max depth
  vec2 d = vec2(2.);
  vec3 p;

  float f = -1.0;
  vec4 tc = vec4(0.0);

  for(int i = 0; i < 96; i++) {
      if ((abs(d.x) < .001) || (f > maxd)) break;
      f += d.x;
      p = prp + scp * f;
      d = Scene7_distance_to_obj(p);

      float sinz = sin(p.z / 2.2) * 2.5 + 4.0;

  	  if (p.y > (sinz) && p.y < (0.5 + sinz) && p.x > 0. && p.x < 2.) {
    	  tc = texture2D(iChannel4, vec2(p.z / 76. + k / 8., -p.x / 2. + sin(p.z + k) / 8.));
          if (tc.a > 0.03) {
          		d.y = 2.0;
          		break;
      	  }
 	  }

  }

    if (f < maxd) {

        fragColor = vec4(f / 24.);
        if (d.y == 1.0) {

            float kpi = mod(k + sin(p.x) * 12. + cos(p.y / 2.) * 14. + k + barMod, 128.0 );
            if (kpi > 120.0) {
                //fragColor.r += 1. -f / 20. * getFreq(0.1).r * 10.;
                fragColor += vec4(239., 159. ,23., 255.) / 256. * (sin(barMod) / 2. + 0.5);
                fragColor += (128. - kpi) / 36.;

            } else {
                fragColor *= vec4(10.0, 40.0, 130.0, 255.) / 255.;
            }
        }
        if (d.y == 2.0) fragColor = tc;


    } else
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);

    return fragColor;

}

vec4 Scene8 () {
    vec4 fragColor = vec4(0.);
    vec4 text = texture2D(iChannel7, vec2(puv.x, -puv.y));
    fragColor += text * text.a;
    return fragColor;
}
vec4 Scene9 () {
    vec4 fragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return fragColor;
}
// main

void main() {
    puv = gl_FragCoord.xy / iResolution.xy;
    uv = ((2.0 * gl_FragCoord.xy) - iResolution.xy)
        / min(iResolution.x, iResolution.y);

    if (scene == 1) gl_FragColor = Scene1();
    if (scene == 2) gl_FragColor = Scene2();
    if (scene == 3) gl_FragColor = Scene3();
    if (scene == 4) gl_FragColor = Scene4();
    if (scene == 5) gl_FragColor = Scene5();
    if (scene == 6) gl_FragColor = Scene6();
    if (scene == 7) gl_FragColor = Scene7();
    if (scene == 8) gl_FragColor = Scene8();
    if (scene == 9) gl_FragColor = Scene9();
    gl_FragColor *= fade;

}
