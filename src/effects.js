import * as THREE from 'three';
import { ShaderMount, pulsingBorderFragmentShader, getShaderColorFromString as rgba, getShaderNoiseTexture } from '@paper-design/shaders';

export const PALETTES = {
  premium: { background: '#f3f0e9', floor: '#e4ded0', shell: '#efe9dc', trim: '#384d48', metal: '#a4ada6', coral: '#db6a52', teal: '#347d78', light: '#fff4de' },
  retro: { background: '#f6efd9', floor: '#ead8b0', shell: '#f6dfaa', trim: '#63846d', metal: '#d0bc8d', coral: '#ec7950', teal: '#438a70', light: '#ffe1ab' },
};

export function makeFloorShader() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uCharge: { value: 0 }, uColorA: { value: new THREE.Color(PALETTES.premium.coral) }, uColorB: { value: new THREE.Color(PALETTES.premium.teal) }, uTopA: { value: new THREE.Vector2(-3, 0) }, uTopB: { value: new THREE.Vector2(3, 0) }, uEnergy: { value: new THREE.Vector2(1, 1) }, uImpacts: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, -10, 0)) }, uReduced: { value: 0 } },
    vertexShader: `varying vec2 vPoint; void main(){vPoint=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      precision highp float;
      varying vec2 vPoint;
      uniform float uTime,uCharge,uReduced;
      uniform vec3 uColorA,uColorB;
      uniform vec2 uTopA,uTopB,uEnergy;
      uniform vec4 uImpacts[4];
      void main(){
        float r=length(vPoint);
        if(r>5.07) discard;
        float lines=pow(.5+.5*cos(r*13.),30.)*.08;
        float outer=(1.-smoothstep(.015,.065,abs(r-4.8)))*(.12+uCharge*.5);
        float chargeRing=(1.-smoothstep(.015,.09,abs(r-(1.+uCharge*3.5))))*uCharge*.22;
        float a=(1.-smoothstep(.37,.63,length(vPoint-uTopA)))*uEnergy.x*.32;
        float b=(1.-smoothstep(.37,.63,length(vPoint-uTopB)))*uEnergy.y*.32;
        vec3 color=uColorA*(a+outer*.55+chargeRing)+uColorB*(b+outer*.45)+vec3(.3,.42,.36)*lines;
        float alpha=lines+outer+chargeRing+a+b;
        for(int i=0;i<4;i++){
          float age=uTime-uImpacts[i].z;
          if(age>=0. && age<.65 && uReduced<.5){
            float ring=(1.-smoothstep(.015,.07,abs(length(vPoint-uImpacts[i].xy)-age*3.)))*(1.-age/.65)*uImpacts[i].w;
            color+=mix(uColorA,uColorB,.5)*ring;alpha+=ring*.65;
          }
        }
        gl_FragColor=vec4(color/max(alpha,.001),min(alpha,.65));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export async function mountRim(element) {
  let mount, disposed = false, previous = '', theme = 'premium';
  const noise = getShaderNoiseTexture();
  try {
    await noise.decode();
    mount = new ShaderMount(element, pulsingBorderFragmentShader, {
      u_fit: 1, u_scale: 1, u_rotation: 0, u_originX: .5, u_originY: .5, u_offsetX: 0, u_offsetY: 0, u_worldWidth: 0, u_worldHeight: 0,
      u_colorBack: rgba('#00000000'), u_colors: [PALETTES.premium.coral, PALETTES.premium.teal].map(rgba), u_colorsCount: 2,
      u_roundness: .12, u_thickness: .018, u_marginLeft: .008, u_marginRight: .008, u_marginTop: .008, u_marginBottom: .008,
      u_aspectRatio: 0, u_softness: .65, u_intensity: .05, u_bloom: .18, u_spots: 2, u_spotSize: .5, u_pulse: 0, u_smoke: .02, u_smokeSize: .5, u_noiseTexture: noise,
    }, { alpha: true }, 0, 0, 1, 400000);
  } catch { element.replaceChildren(); element.dataset.fallback = 'true'; }
  const lost = event => { event.preventDefault(); mount?.dispose(); mount = null; element.replaceChildren(); element.dataset.fallback = 'true'; };
  mount?.canvasElement.addEventListener('webglcontextlost', lost);
  return {
    update(energy, paused, reduced, palette = theme, winner = null) {
      if (disposed || !mount) return;
      const key = `${energy.toFixed(2)}:${paused}:${reduced}:${palette}:${winner}`;
      if (key === previous) return; previous = key; theme = palette;
      const colors = winner === null ? [PALETTES[theme].coral, PALETTES[theme].teal] : [winner === 0 ? PALETTES[theme].coral : PALETTES[theme].teal];
      mount.setUniforms({ u_colors: colors.map(rgba), u_colorsCount: colors.length, u_intensity: .05 + energy * .28, u_bloom: .18 + energy * .2, u_pulse: reduced ? 0 : energy * .2 });
      mount.setSpeed(!paused && !reduced && energy > .02 ? .18 : 0);
    },
    dispose() { disposed = true; mount?.canvasElement.removeEventListener('webglcontextlost', lost); mount?.dispose(); },
  };
}
