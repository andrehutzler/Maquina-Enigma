export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALPHABET_SIZE = 26;
const ASCII_OFFSET = 65; // 'A' = 65 in ASCII

export type RotorId = "I" | "II" | "III" | "IV" | "V";
export type ReflectorId = "B" | "C";
export type ComponentType = 
  | "input" 
  | "plugboard_in" 
  | "rotor_r" 
  | "rotor_m" 
  | "rotor_l" 
  | "reflector" 
  | "rotor_l_back" 
  | "rotor_m_back" 
  | "rotor_r_back" 
  | "plugboard_out" 
  | "output";

export interface SignalStep {
  readonly component: ComponentType;
  readonly inputLetter: string;
  readonly outputLetter: string;
  readonly inputIndex: number;
  readonly outputIndex: number;
}

export interface SignalPath {
  readonly steps: readonly SignalStep[];
  readonly inputLetter: string;
  readonly outputLetter: string;
}

export interface RotorConfig {
  readonly id: RotorId;
  readonly wiring: string;
  readonly notch: string;
}

export interface ReflectorConfig {
  readonly id: ReflectorId;
  readonly wiring: string;
}

export interface EnigmaSettings {
  readonly rotors: readonly [RotorId, RotorId, RotorId];
  readonly reflector: ReflectorId;
  readonly positions: readonly [string, string, string];
  readonly plugboardPairs: readonly string[];
}

function letterToIndex(letter: string): number {
  return letter.charCodeAt(0) - ASCII_OFFSET;
}

function indexToLetter(index: number): string {
  return ALPHABET[((index % ALPHABET_SIZE) + ALPHABET_SIZE) % ALPHABET_SIZE];
}

function normalizeIndex(index: number): number {
  return ((index % ALPHABET_SIZE) + ALPHABET_SIZE) % ALPHABET_SIZE;
}

function isValidLetter(char: string): boolean {
  return char.length === 1 && ALPHABET.includes(char.toUpperCase());
}

export class Rotor {
  private readonly _id: RotorId;
  private readonly _wiring: string;
  private readonly _inverseWiring: string;
  private readonly _notch: string;
  private _position: number;

  constructor(config: RotorConfig, initialPosition: number = 0) {
    this.validateWiring(config.wiring);
    
    this._id = config.id;
    this._wiring = config.wiring.toUpperCase();
    this._notch = config.notch.toUpperCase();
    this._position = normalizeIndex(initialPosition);
    this._inverseWiring = this.computeInverseWiring();
  }

  get id(): RotorId { return this._id; }
  get position(): number { return this._position; }
  get positionLetter(): string { return indexToLetter(this._position); }
  get wiring(): string { return this._wiring; }
  get notch(): string { return this._notch; }

  private validateWiring(wiring: string): void {
    if (wiring.length !== ALPHABET_SIZE) {
      throw new Error(`Rotor wiring must have exactly ${ALPHABET_SIZE} letters`);
    }
  }

  private computeInverseWiring(): string {
    const inverse = new Array<string>(ALPHABET_SIZE);
    
    for (let i = 0; i < ALPHABET_SIZE; i++) {
      const outputLetter = this._wiring[i];
      const outputIndex = letterToIndex(outputLetter);
      inverse[outputIndex] = indexToLetter(i);
    }
    
    return inverse.join("");
  }

  rotate(): void {
    this._position = normalizeIndex(this._position + 1);
  }

  isAtNotch(): boolean {
    return this.positionLetter === this._notch;
  }

  setPosition(letter: string): void {
    if (!isValidLetter(letter)) {
      throw new Error(`Invalid position letter: ${letter}`);
    }
    this._position = letterToIndex(letter.toUpperCase());
  }

  forward(inputLetter: string): string {
    const inputIndex = letterToIndex(inputLetter);
    const offsetIndex = normalizeIndex(inputIndex + this._position);
    const outputLetter = this._wiring[offsetIndex];
    const outputIndex = letterToIndex(outputLetter);
    const finalIndex = normalizeIndex(outputIndex - this._position);
    
    return indexToLetter(finalIndex);
  }

  backward(inputLetter: string): string {
    const inputIndex = letterToIndex(inputLetter);
    const offsetIndex = normalizeIndex(inputIndex + this._position);
    const outputLetter = this._inverseWiring[offsetIndex];
    const outputIndex = letterToIndex(outputLetter);
    const finalIndex = normalizeIndex(outputIndex - this._position);
    
    return indexToLetter(finalIndex);
  }

  clone(): Rotor {
    const rotor = new Rotor({
      id: this._id,
      wiring: this._wiring,
      notch: this._notch,
    }, this._position);
    return rotor;
  }
}

export class Reflector {
  private readonly _id: ReflectorId;
  private readonly _wiring: string;

  constructor(config: ReflectorConfig) {
    this.validateWiring(config.wiring);
    
    this._id = config.id;
    this._wiring = config.wiring.toUpperCase();
  }

  get id(): ReflectorId { return this._id; }
  get wiring(): string { return this._wiring; }

  private validateWiring(wiring: string): void {
    if (wiring.length !== ALPHABET_SIZE) {
      throw new Error(`Reflector wiring must have exactly ${ALPHABET_SIZE} letters`);
    }
  }

  reflect(inputLetter: string): string {
    const index = letterToIndex(inputLetter);
    return this._wiring[index];
  }
}

export class Plugboard {
  private readonly _mappings: Map<string, string>;
  private readonly _pairs: readonly string[];

  constructor(pairs: readonly string[] = []) {
    this._pairs = pairs;
    this._mappings = this.buildMappings(pairs);
  }

  get pairs(): readonly string[] { return this._pairs; }

  private buildMappings(pairs: readonly string[]): Map<string, string> {
    const mappings = new Map<string, string>();
    
    for (const letter of ALPHABET) {
      mappings.set(letter, letter);
    }
    
    for (const pair of pairs) {
      if (pair.length !== 2) continue;
      
      const [a, b] = [pair[0].toUpperCase(), pair[1].toUpperCase()];
      
      if (!isValidLetter(a) || !isValidLetter(b)) continue;
      
      mappings.set(a, b);
      mappings.set(b, a);
    }
    
    return mappings;
  }

  swap(letter: string): string {
    const upperLetter = letter.toUpperCase();
    return this._mappings.get(upperLetter) ?? upperLetter;
  }

  isConnected(letter: string): boolean {
    const upperLetter = letter.toUpperCase();
    return this._mappings.get(upperLetter) !== upperLetter;
  }
}

export class SignalTracer {
  private _steps: SignalStep[] = [];

  record(component: ComponentType, inputLetter: string, outputLetter: string): void {
    this._steps.push({
      component,
      inputLetter,
      outputLetter,
      inputIndex: letterToIndex(inputLetter),
      outputIndex: letterToIndex(outputLetter),
    });
  }

  build(inputLetter: string, outputLetter: string): SignalPath {
    return {
      steps: Object.freeze([...this._steps]),
      inputLetter,
      outputLetter,
    };
  }

  reset(): void {
    this._steps = [];
  }
}

export class Enigma {
  private readonly _rotors: [Rotor, Rotor, Rotor]; // [left, middle, right]
  private readonly _reflector: Reflector;
  private readonly _plugboard: Plugboard;

  constructor(
    rotors: [Rotor, Rotor, Rotor],
    reflector: Reflector,
    plugboard: Plugboard
  ) {
    this._rotors = rotors;
    this._reflector = reflector;
    this._plugboard = plugboard;
  }

  get rotors(): readonly [Rotor, Rotor, Rotor] { return this._rotors; }
  get reflector(): Reflector { return this._reflector; }
  get plugboard(): Plugboard { return this._plugboard; }

  getPositions(): [string, string, string] {
    return [
      this._rotors[0].positionLetter,
      this._rotors[1].positionLetter,
      this._rotors[2].positionLetter,
    ];
  }

  setPositions(positions: readonly [string, string, string]): void {
    this._rotors[0].setPosition(positions[0]);
    this._rotors[1].setPosition(positions[1]);
    this._rotors[2].setPosition(positions[2]);
  }

  private stepRotors(): void {
    const [leftRotor, middleRotor, rightRotor] = this._rotors;

    const middleAtNotch = middleRotor.isAtNotch();
    const rightAtNotch = rightRotor.isAtNotch();

    if (middleAtNotch) {
      middleRotor.rotate();
      leftRotor.rotate();
    }

    if (rightAtNotch) {
      middleRotor.rotate();
    }

    rightRotor.rotate();
  }

  encipherCharWithPath(char: string): SignalPath {
    const tracer = new SignalTracer();
    let signal = char.toUpperCase();

    if (!isValidLetter(signal)) {
      return {
        steps: [],
        inputLetter: char,
        outputLetter: char,
      };
    }

    const originalInput = signal;

    this.stepRotors();

    tracer.record("input", signal, signal);

    const afterPlugboardIn = this._plugboard.swap(signal);
    tracer.record("plugboard_in", signal, afterPlugboardIn);
    signal = afterPlugboardIn;

    const afterRotorR = this._rotors[2].forward(signal);
    tracer.record("rotor_r", signal, afterRotorR);
    signal = afterRotorR;

    const afterRotorM = this._rotors[1].forward(signal);
    tracer.record("rotor_m", signal, afterRotorM);
    signal = afterRotorM;

    const afterRotorL = this._rotors[0].forward(signal);
    tracer.record("rotor_l", signal, afterRotorL);
    signal = afterRotorL;

    const afterReflector = this._reflector.reflect(signal);
    tracer.record("reflector", signal, afterReflector);
    signal = afterReflector;

    const afterRotorLBack = this._rotors[0].backward(signal);
    tracer.record("rotor_l_back", signal, afterRotorLBack);
    signal = afterRotorLBack;

    const afterRotorMBack = this._rotors[1].backward(signal);
    tracer.record("rotor_m_back", signal, afterRotorMBack);
    signal = afterRotorMBack;

    const afterRotorRBack = this._rotors[2].backward(signal);
    tracer.record("rotor_r_back", signal, afterRotorRBack);
    signal = afterRotorRBack;

    const afterPlugboardOut = this._plugboard.swap(signal);
    tracer.record("plugboard_out", signal, afterPlugboardOut);
    signal = afterPlugboardOut;

    tracer.record("output", signal, signal);

    return tracer.build(originalInput, signal);
  }

  encipherChar(char: string): string {
    return this.encipherCharWithPath(char).outputLetter;
  }

  encipherText(text: string): string {
    return text
      .split("")
      .map((char) => this.encipherChar(char))
      .join("");
  }
}

export class RotorFactory {
  private static readonly CONFIGS: Record<RotorId, RotorConfig> = {
    I:   { id: "I",   wiring: "EKMFLGDQVZNTOWYHXUSPAIBRCJ", notch: "Q" },
    II:  { id: "II",  wiring: "AJDKSIRUXBLHWTMCQGZNPYFVOE", notch: "E" },
    III: { id: "III", wiring: "BDFHJLCPRTXVZNYEIWGAKMUSQO", notch: "V" },
    IV:  { id: "IV",  wiring: "ESOVPZJAYQUIRHXLNFTGKDCMWB", notch: "J" },
    V:   { id: "V",   wiring: "VZBRGITYUPSDNHLXAWMJQOFECK", notch: "Z" },
  };

  static create(id: RotorId, position: string = "A"): Rotor {
    const config = this.CONFIGS[id];
    const rotor = new Rotor(config, letterToIndex(position));
    return rotor;
  }

  static getConfig(id: RotorId): RotorConfig {
    return this.CONFIGS[id];
  }

  static getAvailableIds(): readonly RotorId[] {
    return Object.keys(this.CONFIGS) as RotorId[];
  }
}

export class ReflectorFactory {
  private static readonly CONFIGS: Record<ReflectorId, ReflectorConfig> = {
    B: { id: "B", wiring: "YRUHQSLDPXNGOKMIEBFZCWVJAT" },
    C: { id: "C", wiring: "FVPJIAOYEDRZXWGCTKUQSBNMHL" },
  };

  static create(id: ReflectorId): Reflector {
    const config = this.CONFIGS[id];
    return new Reflector(config);
  }

  static getConfig(id: ReflectorId): ReflectorConfig {
    return this.CONFIGS[id];
  }

  static getAvailableIds(): readonly ReflectorId[] {
    return Object.keys(this.CONFIGS) as ReflectorId[];
  }
}

export class EnigmaFactory {
  static create(settings: EnigmaSettings): Enigma {
    const rotors: [Rotor, Rotor, Rotor] = [
      RotorFactory.create(settings.rotors[0], settings.positions[0]),
      RotorFactory.create(settings.rotors[1], settings.positions[1]),
      RotorFactory.create(settings.rotors[2], settings.positions[2]),
    ];

    const reflector = ReflectorFactory.create(settings.reflector);
    const plugboard = new Plugboard(settings.plugboardPairs);

    return new Enigma(rotors, reflector, plugboard);
  }

  static createDefault(): Enigma {
    return this.create({
      rotors: ["I", "II", "III"],
      reflector: "B",
      positions: ["A", "A", "A"],
      plugboardPairs: [],
    });
  }
}

// Legacy Exports (for backward compatibility).

export const ROTOR_CONFIGS = {
  I: { name: "I", factory: () => RotorFactory.create("I") },
  II: { name: "II", factory: () => RotorFactory.create("II") },
  III: { name: "III", factory: () => RotorFactory.create("III") },
  IV: { name: "IV", factory: () => RotorFactory.create("IV") },
  V: { name: "V", factory: () => RotorFactory.create("V") },
} as const;

export const REFLECTOR_CONFIGS = {
  B: { name: "B", factory: () => ReflectorFactory.create("B") },
  C: { name: "C", factory: () => ReflectorFactory.create("C") },
} as const;

export type RotorType = RotorId;
export type ReflectorType = ReflectorId;
