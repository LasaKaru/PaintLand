import GUI from 'lil-gui';
import { DEFAULT_STUDIO, VIBES, applyVibe, saveStudio, type StudioSettings } from '../render/StudioSettings';

export interface StudioHooks {
  onChange: () => void;
  onPlaySong: () => void;
  onRandomLook: () => void;
  stats: () => string;
}

/**
 * The Studio panel: every art value as a live slider (docs/08 §3).
 * Changes apply instantly and are saved per device.
 */
export class Studio {
  private readonly gui: GUI;
  private readonly statsLine = { fps: '' };

  constructor(private readonly s: StudioSettings, hooks: StudioHooks) {
    this.gui = new GUI({ title: 'Studio ✎', width: 300 });
    this.gui.hide();
    const save = (): void => {
      saveStudio(this.s);
      hooks.onChange();
    };

    const vibe = { vibe: s.vibe };
    this.gui.add(vibe, 'vibe', Object.keys(VIBES)).name('Vibe').onChange((v: string) => {
      applyVibe(this.s, v);
      this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
      save();
    });

    const cam = this.gui.addFolder('Camera');
    cam.add(s, 'fov', 55, 110, 1).name('Field of view').onChange(save);
    cam.add(s, 'renderScale', 0.5, 1, 0.05).name('Resolution').onChange(save);
    cam.add(s, 'autoResolution').name('Auto-balance 60 fps').onChange(save);
    cam.add(s, 'cameraRoll', 0, 1, 0.05).name('Roll in loops').onChange(save);
    cam.add(s, 'cameraShake', 0, 1, 0.05).name('Shake').onChange(save);

    const ink = this.gui.addFolder('Ink & paint');
    ink.add(s, 'inkStrength', 0, 1, 0.01).name('Ink strength').onChange(save);
    ink.add(s, 'lineWeight', 0.5, 3, 0.05).name('Line weight').onChange(save);
    ink.add(s, 'lineCrispness', 0, 1, 0.01).name('Line crispness').onChange(save);
    ink.add(s, 'lineBoilFps', 0, 24, 1).name('Line boil fps').onChange(save);
    ink.add(s, 'lineBoilAmount', 0, 2, 0.05).name('Line boil amount').onChange(save);
    ink.add(s, 'pencilLines', 0, 1, 0.01).name('Sketch lines').onChange(save);
    ink.add(s, 'colourBleed', 0, 6, 1).name('Colour bleed').onChange(save);
    ink.add(s, 'edgeDarkening', 0, 1, 0.01).name('Edge darkening').onChange(save);
    ink.add(s, 'wetEdges', 0, 1, 0.01).name('Wet edges').onChange(save);
    ink.add(s, 'granulation', 0, 1, 0.01).name('Granulation').onChange(save);
    ink.add(s, 'hatching', 0, 1, 0.01).name('Shadow hatching').onChange(save);
    ink.add(s, 'paperGrain', 0, 1, 0.01).name('Paper grain').onChange(save);
    ink.add(s, 'glow', 0, 2, 0.01).name('Glow').onChange(save);
    ink.add(s, 'border', 0, 1, 0.01).name('Sketchbook border').onChange(save);

    const grade = this.gui.addFolder('Colour');
    grade.add(s, 'saturation', 0, 1.5, 0.01).name('Saturation').onChange(save);
    grade.add(s, 'warmth', -1, 1, 0.01).name('Warmth').onChange(save);
    grade.add(s, 'atmosphere', 0, 1.5, 0.01).name('Atmosphere').onChange(save);
    grade.close();

    const motion = this.gui.addFolder('Motion & comfort');
    motion.add(s, 'speedLines', 0, 1, 0.01).name('Speed lines').onChange(save);
    motion.add(s, 'reducedMotion').name('Reduced motion').onChange(save);
    motion.close();

    const world = this.gui.addFolder('World & sound');
    world.add(s, 'musicVolume', 0, 1, 0.01).name('Radio').onChange(save);
    world.add(s, 'musicBox', 0, 1, 0.01).name('Music-box notes').onChange(save);
    world.add(s, 'engineHum', 0, 1, 0.01).name('Engine hum').onChange(save);
    world.add(s, 'wind', 0, 1, 0.01).name('Wind').onChange(save);
    world.close();

    const actions = {
      play: hooks.onPlaySong,
      look: hooks.onRandomLook,
      reset: () => {
        Object.assign(this.s, DEFAULT_STUDIO);
        this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
        save();
      },
    };
    this.gui.add(actions, 'play').name('♫ Play my song');
    this.gui.add(actions, 'look').name('✦ New look (rover + outfit)');
    this.gui.add(actions, 'reset').name('Reset to default');
    this.gui.add(this.statsLine, 'fps').name('Frame').disable().listen();
    setInterval(() => (this.statsLine.fps = hooks.stats()), 500);
  }

  toggle(): void {
    if (this.gui._hidden) this.gui.show();
    else this.gui.hide();
  }

  get open(): boolean {
    return !this.gui._hidden;
  }
}
