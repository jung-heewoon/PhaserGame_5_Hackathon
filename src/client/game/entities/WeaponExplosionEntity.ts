import TPFEntity from 'twopointfive-phaser-3/src/twopointfive/entity.ts';
import { Tile } from 'twopointfive-phaser-3/src/twopointfive/world/tile.ts';
import type Renderer from 'twopointfive-phaser-3/src/twopointfive/renderer/renderer.ts';
import type { EntityContext } from 'twopointfive-phaser-3/src/twopointfive/types.ts';
import type {
  WeaponExplosionCatalog,
  WeaponExplosionVariant,
} from '../assets/WeaponExplosionAssets.ts';
import type { WeaponExplosionVfx } from '../systems/WeaponExplosionVfx.ts';

const STASH_X = -9999;
const STASH_Y = -9999;

export default class WeaponExplosionEntity extends TPFEntity {
  /** EnemyEntity(zIndex=2) 앞 */
  zIndex = 3;

  private readonly vfx: WeaponExplosionVfx | null;
  private readonly catalog: WeaponExplosionCatalog | null;
  private active = false;
  private ageMs = 0;
  private maxAgeMs = 0;
  private displayScale = 1;
  private frameW = 96;
  private frameH = 96;

  constructor(
    x: number,
    y: number,
    settings: Record<string, unknown> | null,
    context: Partial<EntityContext> | null,
  ) {
    super(x, y, settings, context);
    this.type = TPFEntity.TYPE.NONE;
    this.checkAgainst = TPFEntity.TYPE.NONE;
    this.collides = TPFEntity.COLLIDES.NEVER;
    this.dynamicLight = false;
    this.rotateToView = true;
    this.gravityFactor = 0;
    this.vfx = (settings?.weaponExplosionVfx as WeaponExplosionVfx) ?? null;
    this.catalog = (settings?.weaponExplosionCatalog as WeaponExplosionCatalog) ?? null;
  }

  isPlaying(): boolean {
    return this.active && !this._killed;
  }

  activate(worldX: number, worldY: number, z: number, variant: WeaponExplosionVariant): void {
    if (!this.catalog || !this.context.renderer) return;

    const meta = this.catalog.getMeta(variant);
    const image = this.catalog.getImage(variant);
    if (!image) return;

    this.frameW = meta.frameWidth;
    this.frameH = meta.frameHeight;
    this.displayScale = meta.displayScale;
    this.maxAgeMs = meta.frameCount * meta.frameMs;

    const halfW = (this.frameW * this.displayScale) / 2;
    const halfH = (this.frameH * this.displayScale) / 2;

    this._killed = false;
    this.active = true;
    this.ageMs = 0;
    this.pos.x = worldX - halfW;
    this.pos.y = worldY - halfH;
    this.pos.z = z;
    this.last.x = this.pos.x;
    this.last.y = this.pos.y;
    this.size = { x: this.frameW * this.displayScale, y: this.frameH * this.displayScale };

    this.animSheet = { image, width: this.frameW, height: this.frameH };
    this.anims = {};
    const frames = Array.from({ length: meta.frameCount }, (_, i) => i);
    const frameTimeSec = meta.frameMs / 1000;
    const anim = this.addAnim('explode', frameTimeSec, frames, true);
    anim.rewind();
    this.currentAnim = anim;

    this.tile = new Tile(image, 0, this.frameW, this.frameH, this.displayScale);
    this.tile.quad.setColor({ r: 1, g: 1, b: 1 });
    this.tile.quad.setAlpha(1);

    if (this.context.culledSectors) {
      this.context.culledSectors.moveEntity(this);
    }
    this.ensureInGameState();
    this.syncVisuals();
  }

  private ensureInGameState(): void {
    const gs = this.context.game;
    if (gs && !gs.entities.includes(this)) {
      gs.entities.push(this);
    }
  }

  update(): void {
    if (this._killed || !this.active) return;

    const tick = this.context.tick ?? 1 / 60;
    this.ageMs += tick * 1000;
    this.currentAnim?.update();
    this.syncVisuals();

    const anim = this.currentAnim;
    const animDone = anim?.stop && anim.loopCount > 0;
    if (animDone || this.ageMs >= this.maxAgeMs) {
      this.vfx?.release(this);
    }
  }

  draw(renderer?: Renderer): void {
    if (!this.isPlaying()) return;
    const r = renderer || this.context.renderer;
    if (this.tile && r) {
      this.tile.draw(r);
    }
  }

  finish(): void {
    this.active = false;
    this._killed = true;
    this.ageMs = 0;
    this.currentAnim = null;
    this.pos.x = STASH_X;
    this.pos.y = STASH_Y;
    this.pos.z = 0;
    this.last.x = STASH_X;
    this.last.y = STASH_Y;
    if (this.tile) {
      this.tile.quad.setAlpha(0);
    }
    this.tile = null;
  }

  private syncVisuals(): void {
    if (!this.tile || !this.animSheet || !this.currentAnim) return;

    const w = this.animSheet.width * this.displayScale;
    const h = this.animSheet.height * this.displayScale;
    this.tile.scale = this.displayScale;
    this.tile.quad.setSize(w, h);
    this.tile.setTile(this.currentAnim.tile);

    if (this.rotateToView && this.context.camera) {
      this.tile.quad.rotation[1] = this.context.camera.rotation[1];
      this.tile.quad.rotation[2] = 0;
    }

    this.updateQuad();
  }

  updateQuad(): void {
    if (!this.tile || !this.animSheet) return;

    const ctx = this.context;
    const camera = ctx.camera;
    const collisionMap = ctx.collisionMap;
    const culledSectors = ctx.culledSectors;

    const tpos = this.tile.quad.position;
    const halfW = (this.animSheet.width * this.displayScale) / 2;
    const halfH = (this.animSheet.height * this.displayScale) / 2;
    tpos[0] = this.pos.x + halfW;
    tpos[2] = this.pos.y + halfH;
    const ts = collisionMap && 'tilesize' in collisionMap ? collisionMap.tilesize : 64;
    tpos[1] = this.pos.z - ts / 2 + (this.animSheet.height * this.displayScale) / 2;

    if (this.rotateToView && camera) {
      this.tile.quad.rotation[1] = camera.rotation[1];
      this.tile.quad.rotation[2] = 0;
    }
    this.tile.quad._dirty = true;

    if (
      !this._killed &&
      culledSectors &&
      (this.pos.x !== this.last.x || this.pos.y !== this.last.y)
    ) {
      culledSectors.moveEntity(this);
    }
  }
}
