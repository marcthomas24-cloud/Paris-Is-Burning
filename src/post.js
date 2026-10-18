// Cinematic post-processing: half-resolution bloom for fire and lights, a
// filmic colour grade (cool shadows, warm highlights, restrained saturation),
// then tone mapping, vignette and fine film grain.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uSmoke: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uSmoke; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;           // linear HDR
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // split toning: teal-grey shadows, amber highlights
      vec3 shadowTint = vec3(0.90, 0.98, 1.06);
      vec3 highTint = vec3(1.07, 1.0, 0.9);
      float k = smoothstep(0.02, 0.6, l);
      c *= mix(shadowTint, highTint, k);
      // restrained saturation, a little more in the fire-lit highlights
      c = mix(vec3(l), c, 0.82 + k * 0.15);
      // smoke-heavy streets wash out towards a brown haze
      c = mix(c, vec3(l) * vec3(1.05, 0.98, 0.9), uSmoke * 0.18);
      // gentle S-curve in log space
      c = pow(c, vec3(1.06));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uHurt: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uHurt; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      // faint chromatic fringing towards the edges
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);
      vec3 c;
      c.r = texture2D(tDiffuse, uv + d * 0.0035 * (1.0 + uHurt * 4.0)).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv - d * 0.0035 * (1.0 + uHurt * 4.0)).b;
      float vig = smoothstep(0.85, 0.18, r2 * 1.6);
      c *= mix(0.62, 1.0, vig);
      float g = hash(uv * vec2(1920.0, 1080.0) + fract(uTime * 7.3)) - 0.5;
      c += g * 0.035;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 2 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2.5, size.y / 2.5), 0.55, 0.6, 0.92);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.finish = new ShaderPass(FinishShader);
    this.composer.addPass(this.finish);
  }
  setSize(w, h) {
    this.composer.setSize(w, h);
    this.bloom.setSize(w / 2.5, h / 2.5);
  }
  render(dt, time, smoke, hurt) {
    this.grade.uniforms.uSmoke.value = smoke;
    this.finish.uniforms.uTime.value = time;
    this.finish.uniforms.uHurt.value = hurt;
    this.composer.render(dt);
  }
}
