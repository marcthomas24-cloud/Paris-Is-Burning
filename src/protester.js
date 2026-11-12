// The Revolution campaign's player-controller slot.
//
// The protester controller (Gus's movement, actions and input handling) is a separate module that
// registers itself here. This file holds no gameplay: it defines what a controller must provide,
// checks an instance against that, and tells the rest of the game whether one is installed.
// The full contract is in docs/protester-interface.md.
//
// Registering (from the controller's own module, imported by main.js or dev tools):
//   import { Protester } from './protester.js';
//   Protester.register(MyController);
//
// With nothing registered, Revolution levels start in observer mode (main.js): Gus's model stands
// idle where the level starts, the camera can be turned, the police and crowd ignore him, and a
// banner says the controller is not installed. Observer mode is not a controller: it has no
// movement, no actions and no damage.

// fields every frame of the game reads from `game.player` (camera, crowd, HUD, riot police)
export const REQUIRED_FIELDS = [
  'pos', 'vel', 'knock', 'heading', 'health', 'stamina', 'speed',
  'sprinting', 'blocking', 'dead', 'invuln', 'staggerT', 'dodgeT', 'detained', 'grabbedBy',
  'rig', 'gear', 'lockTarget',
];
// methods the game calls
export const REQUIRED_METHODS = [
  'reset',        // () · back to this.start = { x, z, heading }, full health, nothing held
  'update',       // (dt, input, camYaw) · once per frame while playing
  'setActive',    // (on) · show or hide the rig; called when the player is swapped
  'forward',      // () · THREE.Vector3 the way he faces
  'hitTest',      // (pos) · true when a projectile at pos is inside his body
  'takeDamage',   // (amount, fromPos, push, projectile) · returns the damage applied
  'onGrabbed',    // (unit) · a snatch-squad officer has hold of him (riot.js)
];

export const Protester = {
  Controller: null,
  register(C) {
    const missing = REQUIRED_METHODS.filter((m) => typeof C.prototype[m] !== 'function');
    if (missing.length) throw new Error(`Protester controller is missing: ${missing.join(', ')}`);
    this.Controller = C;
  },
  available() { return !!this.Controller; },
  // fields and methods an instance lacks (empty when it fits the contract)
  check(p) {
    return [...REQUIRED_FIELDS.filter((f) => !(f in p)), ...REQUIRED_METHODS.filter((m) => typeof p[m] !== 'function')];
  },
};
