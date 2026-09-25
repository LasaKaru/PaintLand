import * as THREE from 'three';

const mrtHeader = /* glsl */ `
layout(location = 0) out highp vec4 gColor;
layout(location = 1) out highp vec4 gNormal;
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.07 + 11.3; a *= 0.5; } return v; }
`;

export const skyUniforms = {
  uTop: { value: new THREE.Color('#8fc3ea') },
  uHorizon: { value: new THREE.Color('#f3efe0') },
  uSunDirWorld: { value: new THREE.Vector3(0.3, 0.6, -0.5).normalize() },
  uSunColor: { value: new THREE.Color('#fff4d8') },
  uCloudLit: { value: new THREE.Color('#fbfaf4') },
  uCloudShade: { value: new THREE.Color('#b9b8e0') },
  uNight: { value: 0 },
  uTime: { value: 0 },
  uCloudCover: { value: 0.5 },
};

/** Painted sky dome: gradient, brushy clouds with lavender undersides, sun, stars. */
export function createSky(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.BackSide,
    depthWrite: true,
    uniforms: skyUniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${mrtHeader}
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDirWorld; uniform vec3 uSunColor;
      uniform vec3 uCloudLit; uniform vec3 uCloudShade; uniform float uNight; uniform float uTime; uniform float uCloudCover;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.32, h));
        // Wash banding like layered watercolour.
        col *= 0.97 + 0.03 * smoothstep(0.4, 0.6, fract(h * 5.0 + fbm(d.xz * 3.0) * 0.6));

        // Sun disc and halo.
        float sd = max(dot(d, uSunDirWorld), 0.0);
        col = mix(col, uSunColor, smoothstep(0.9975, 0.999, sd) * (1.0 - uNight * 0.3));
        col += uSunColor * pow(sd, 18.0) * 0.18;

        // Clouds on a flattened dome.
        vec2 p = d.xz / max(d.y + 0.08, 0.05) * 0.9 + vec2(uTime * 0.004, 0.0);
        float c = fbm(p * 0.8);
        float cover = smoothstep(0.62 - uCloudCover * 0.25, 0.8 - uCloudCover * 0.2, c);
        float shade = smoothstep(0.35, 0.9, fbm(p * 0.8 + vec2(0.06, 0.09)));
        vec3 cloud = mix(uCloudLit, uCloudShade, shade * 0.8);
        float fade = smoothstep(0.0, 0.18, d.y);
        col = mix(col, cloud, cover * fade);
        // Ink-ish cloud rims.
        float rim = smoothstep(0.02, 0.0, abs(c - (0.66 - uCloudCover * 0.22))) * fade;
        col = mix(col, uCloudShade * 0.8, rim * 0.35);

        // Stars at night.
        vec2 sp = d.xz / max(d.y, 0.1) * 60.0;
        float star = step(0.996, hash21(floor(sp))) * uNight * smoothstep(0.1, 0.4, d.y);
        col += vec3(star);

        gColor = vec4(col, star * 0.6);
        gNormal = vec4(0.5, 0.5, 0.5, 0.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  mesh.name = 'sky';
  return mesh;
}

export const waterUniforms = {
  uDeep: { value: new THREE.Color('#2fb5b4') },
  uShallow: { value: new THREE.Color('#7fded3') },
  uFoam: { value: new THREE.Color('#f4fbf6') },
  uSunDirWorld: skyUniforms.uSunDirWorld,
  uSunColor: skyUniforms.uSunColor,
  uTime: { value: 0 },
  uNight: skyUniforms.uNight,
  uRain: { value: 0 },
};

/** The painted sea: flat teal with scrolling scribble ripples and foam doodles. */
export function createWater(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: waterUniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vViewNormal;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vViewNormal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${mrtHeader}
      uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam; uniform vec3 uSunDirWorld; uniform vec3 uSunColor;
      uniform float uTime; uniform float uNight; uniform float uRain;
      varying vec3 vWorld;
      varying vec3 vViewNormal;
      void main() {
        vec2 p = vWorld.xz;
        float dist = length(vWorld - cameraPosition);
        float n = fbm(p * 0.004 + uTime * 0.01);
        vec3 col = mix(uDeep, uShallow, smoothstep(0.35, 0.75, n));

        // Scribbled ripple lines (contours of a drifting noise field).
        // Constant pixel width via fwidth, broken into strokes so it reads as hand-drawn.
        float f = fbm(p * 0.02 + vec2(uTime * 0.03, uTime * 0.017)) * 7.0;
        float w = fwidth(f);
        float dLine = abs(fract(f + 0.5) - 0.5);
        float lines = 1.0 - smoothstep(w * 0.7, w * 1.8, dLine);
        lines *= step(0.42, vnoise(p * 0.06 + 3.0));
        float lineFade = 1.0 - smoothstep(120.0, 700.0, dist);
        col = mix(col, uFoam, lines * 0.65 * lineFade);

        // Rain rings.
        if (uRain > 0.0) {
          vec2 cell = floor(p * 0.25);
          vec2 fp = fract(p * 0.25) - 0.5;
          float t = fract(uTime * 0.8 + vnoise(cell * 3.1) * 7.0);
          float ring = 1.0 - smoothstep(0.0, 0.04, abs(length(fp) - t * 0.45));
          col = mix(col, uFoam, ring * (1.0 - t) * uRain * 0.6 * lineFade);
        }

        // Sun glitter as little white dashes.
        vec3 v = normalize(cameraPosition - vWorld);
        vec3 r = reflect(-uSunDirWorld, vec3(0.0, 1.0, 0.0));
        float glint = pow(max(dot(r, v), 0.0), 60.0);
        float sparkle = step(0.8, vnoise(p * 0.6 + uTime * 0.5));
        col += uSunColor * glint * sparkle * 0.8 * (1.0 - uNight);

        col *= mix(1.0, 0.45, uNight);
        gColor = vec4(col, glint * sparkle * 0.3);
        gNormal = vec4(normalize(vViewNormal) * 0.5 + 0.5, 0.013);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1).rotateX(-Math.PI / 2), material);
  mesh.name = 'sea';
  mesh.frustumCulled = false;
  return mesh;
}
