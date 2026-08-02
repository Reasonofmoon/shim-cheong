import {
  ACESFilmicToneMapping,
  BackSide,
  CircleGeometry,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { SkyMood } from './palette';
import type { CameraRig } from './cameraRig';

/**
 * The sky is a single inverted sphere with a three-stop vertical gradient and a
 * soft sun bloom. It is cheaper than a cubemap, and — more usefully — every stop
 * is a uniform, so an act can drag the whole world from noon to storm by
 * animating three numbers.
 */
const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunSize;
  uniform float uHaze;
  varying vec3 vDir;

  void main() {
    float y = vDir.y;

    // Two separate ramps meeting at the horizon keeps the horizon line crisp
    // instead of muddying into a single smoothstep.
    vec3 col = y > 0.0
      ? mix(uHorizon, uZenith, pow(clamp(y, 0.0, 1.0), 0.55))
      : mix(uHorizon, uGround, pow(clamp(-y, 0.0, 1.0), 0.35));

    // Sun disc plus a wide forward-scatter halo.
    float cosAngle = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
    float disc = smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.35, cosAngle);
    float halo = pow(cosAngle, 6.0) * 0.35 + pow(cosAngle, 48.0) * 0.5;
    col += uSunColor * (disc * 0.9 + halo * uHaze);

    // A whisper of banding-breaking noise; large flat gradients band badly on
    // 8-bit displays and this is far cheaper than dithering in post.
    float grain = fract(sin(dot(vDir.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.006;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * Extending the index signature keeps this object directly assignable to
 * `ShaderMaterial.uniforms` while still giving every field a precise type at
 * the call sites below.
 */
interface SkyUniforms extends Record<string, { value: Color | Vector3 | number }> {
  uZenith: { value: Color };
  uHorizon: { value: Color };
  uGround: { value: Color };
  uSunDir: { value: Vector3 };
  uSunColor: { value: Color };
  uSunSize: { value: number };
  uHaze: { value: number };
}

/**
 * Owns the renderer, the scene graph root, the sky, and the three lights every
 * act shares. Acts never touch the renderer directly — they add objects and ask
 * the stage for mood changes.
 */
export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly key: DirectionalLight;
  readonly ambient: HemisphereLight;
  readonly worldFloor: Mesh;

  private readonly skyMesh: Mesh;
  private readonly skyUniforms: SkyUniforms;
  private readonly fog: FogExp2;

  /** Set by an act to widen or tighten the shadow frustum around the action. */
  private shadowRadius = 40;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.scene = new Scene();
    this.fog = new FogExp2(0xbdbcb4, 0.012);
    this.scene.fog = this.fog;

    this.skyUniforms = {
      uZenith: { value: new Color(0x4f86bd) },
      uHorizon: { value: new Color(0xcfe0e6) },
      uGround: { value: new Color(0x8d9163) },
      uSunDir: { value: new Vector3(0.45, 0.72, 0.4).normalize() },
      uSunColor: { value: new Color(0xfff2d6) },
      uSunSize: { value: 0.013 },
      uHaze: { value: 1 },
    };

    this.skyMesh = new Mesh(
      new SphereGeometry(900, 48, 32),
      new ShaderMaterial({
        uniforms: this.skyUniforms,
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.skyMesh.frustumCulled = false;
    this.skyMesh.renderOrder = -1000;
    this.scene.add(this.skyMesh);

    this.key = new DirectionalLight(0xfff2d6, 2.1);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0009;
    this.key.shadow.normalBias = 0.05;
    this.key.shadow.camera.near = 1;
    this.key.shadow.camera.far = 260;
    this.scene.add(this.key);
    this.scene.add(this.key.target);

    this.ambient = new HemisphereLight(0xbcd0e4, 0x6a6047, 0.85);
    this.scene.add(this.ambient);

    // The world floor.
    //
    // Acts build a detailed terrain patch a few hundred units across, which is
    // plenty for the action but not for a wide lens: past its edge the camera
    // sees straight into the void, and the distant ridgelines' skirts hang
    // there in mid-air. (This is exactly what put an unexplained grey slab in
    // the top-right of Act I.) A single large disc under everything closes that
    // hole and gives a real horizon line for the fog to eat into.
    this.worldFloor = new Mesh(
      // Radius is deliberately enormous. At 1500 the disc's own far edge landed
      // just under the frame top and read as a hard horizontal seam; pushed out
      // to 6000 the edge sits below the true horizon and the fog swallows it.
      new CircleGeometry(6000, 72).rotateX(-Math.PI / 2),
      new MeshStandardMaterial({ color: 0x8d9163, roughness: 1, metalness: 0 }),
    );
    this.worldFloor.name = 'worldFloor';
    this.worldFloor.position.y = -0.45;
    this.worldFloor.receiveShadow = false;
    this.worldFloor.renderOrder = -400;
    this.scene.add(this.worldFloor);
  }

  /** Snap every atmospheric property to a mood. Called on act entry. */
  applyMood(mood: SkyMood, exposure = 1): void {
    this.skyUniforms.uZenith.value.setHex(mood.zenith);
    this.skyUniforms.uHorizon.value.setHex(mood.horizon);
    this.skyUniforms.uGround.value.setHex(mood.ground);
    this.skyUniforms.uSunDir.value.set(mood.sun[0], mood.sun[1], mood.sun[2]).normalize();
    this.skyUniforms.uSunColor.value.setHex(mood.sunColor);

    this.key.color.setHex(mood.sunColor);
    this.key.intensity = mood.sunIntensity;
    this.ambient.color.setHex(mood.ambient);
    this.ambient.groundColor.setHex(mood.ground);
    this.ambient.intensity = mood.ambientIntensity;

    this.fog.color.setHex(mood.fog);
    this.fog.density = mood.fogDensity;
    this.renderer.toneMappingExposure = exposure;

    (this.worldFloor.material as MeshStandardMaterial).color.setHex(mood.ground);
    this.worldFloor.position.y = -0.45;
    this.worldFloor.visible = true;
  }

  /**
   * Override the floor. Acts set this to their own terrain colour so the seam
   * where the detailed patch ends is invisible; the water acts set it to the
   * deep-sea colour and drop it below the ocean plane.
   */
  setFloor(color: number, y = -0.45, visible = true): void {
    (this.worldFloor.material as MeshStandardMaterial).color.setHex(color);
    this.worldFloor.position.y = y;
    this.worldFloor.visible = visible;
  }

  /** Per-frame tweaks an act can make on top of its base mood. */
  setFogDensity(density: number): void {
    this.fog.density = density;
  }

  setFogColor(color: Color | number): void {
    if (typeof color === 'number') this.fog.color.setHex(color);
    else this.fog.color.copy(color);
  }

  setExposure(exposure: number): void {
    this.renderer.toneMappingExposure = exposure;
  }

  setSunHaze(haze: number): void {
    this.skyUniforms.uHaze.value = haze;
  }

  setSunSize(size: number): void {
    this.skyUniforms.uSunSize.value = size;
  }

  setSkyColors(zenith: Color, horizon: Color, ground: Color): void {
    this.skyUniforms.uZenith.value.copy(zenith);
    this.skyUniforms.uHorizon.value.copy(horizon);
    this.skyUniforms.uGround.value.copy(ground);
  }

  /**
   * Point the key light at a spot and size the shadow frustum around it. Acts
   * that only care about a courtyard get crisp shadows; acts that span a harbour
   * ask for a wider radius and accept softer ones.
   */
  focusShadows(center: Vector3, radius: number): void {
    this.shadowRadius = radius;
    const dir = this.skyUniforms.uSunDir.value;
    this.key.position.copy(center).addScaledVector(dir, Math.max(radius * 1.8, 60));
    this.key.target.position.copy(center);
    this.key.target.updateMatrixWorld();

    const cam = this.key.shadow.camera;
    cam.left = -radius;
    cam.right = radius;
    cam.top = radius;
    cam.bottom = -radius;
    cam.far = Math.max(radius * 4.5, 200);
    cam.updateProjectionMatrix();
  }

  get shadowSpan(): number {
    return this.shadowRadius;
  }

  /**
   * Atmosphere readouts.
   *
   * The ocean is drawn with a `ShaderMaterial`, so it does not participate in
   * three's automatic fog injection and has to compute fog itself from its own
   * uniforms. Exposing the scene's values here lets `Ocean.update` pull them
   * every frame instead of each act remembering to push them — which one act
   * did not, and it painted a beige band along its horizon in the middle of a
   * night storm.
   */
  get fogColor(): Color {
    return this.fog.color;
  }

  get fogDensity(): number {
    return this.fog.density;
  }

  get sunDirection(): Vector3 {
    return this.skyUniforms.uSunDir.value;
  }

  get sunColor(): Color {
    return this.key.color;
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  render(rig: CameraRig): void {
    this.skyMesh.position.copy(rig.camera.position);
    this.renderer.render(this.scene, rig.camera);
  }
}
