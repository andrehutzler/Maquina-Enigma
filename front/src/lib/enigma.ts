// Enigma Machine TypeScript Implementation for Frontend
// Adapted from the original JS implementation

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Signal path step for visualization
export interface SignalStep {
  component: "input" | "plugboard_in" | "rotor_r" | "rotor_m" | "rotor_l" | "reflector" | "rotor_l_back" | "rotor_m_back" | "rotor_r_back" | "plugboard_out" | "output";
  inputLetter: string;
  outputLetter: string;
  inputIndex: number;
  outputIndex: number;
}

export interface SignalPath {
  steps: SignalStep[];
  inputLetter: string;
  outputLetter: string;
}

// Rotor class
export class Rotor {
  wiring: string;
  notchChar: string;
  posicao: number;
  inverseWiring: string;

  constructor(wiring: string, notchChar: string, posicaoInicial: number = 0) {
    if (wiring.length !== 26) {
      throw new Error("Rotor wiring must have 26 letters");
    }
    this.wiring = wiring.toUpperCase();
    this.notchChar = notchChar.toUpperCase();
    this.posicao = posicaoInicial % 26;
    this.inverseWiring = this._calcularInverseWiring();
  }

  _calcularInverseWiring(): string {
    const inv = new Array(26);
    for (let i = 0; i < 26; i++) {
      const saida = this.wiring[i];
      const idxSaida = saida.charCodeAt(0) - 65;
      inv[idxSaida] = ALPHABET[i];
    }
    return inv.join("");
  }

  girar(): void {
    this.posicao = (this.posicao + 1) % 26;
  }

  estaNoNotch(): boolean {
    const letraNaJanela = ALPHABET[this.posicao];
    return letraNaJanela === this.notchChar;
  }

  passarParaFrente(letra: string): string {
    const idxEntrada = letra.charCodeAt(0) - 65;
    const idxComOffset = (idxEntrada + this.posicao + 26) % 26;
    const letraSaida = this.wiring[idxComOffset];
    const idxSaida = letraSaida.charCodeAt(0) - 65;
    const idxFinal = (idxSaida - this.posicao + 26) % 26;
    return ALPHABET[idxFinal];
  }

  passarParaTras(letra: string): string {
    const idxEntrada = letra.charCodeAt(0) - 65;
    const idxComOffset = (idxEntrada + this.posicao + 26) % 26;
    const letraSaida = this.inverseWiring[idxComOffset];
    const idxSaida = letraSaida.charCodeAt(0) - 65;
    const idxFinal = (idxSaida - this.posicao + 26) % 26;
    return ALPHABET[idxFinal];
  }

  setPosicaoPorLetra(letra: string): void {
    const idx = letra.toUpperCase().charCodeAt(0) - 65;
    if (idx < 0 || idx > 25) throw new Error("Invalid position");
    this.posicao = idx;
  }

  getPosicaoLetra(): string {
    return ALPHABET[this.posicao];
  }
}

// Plugboard class
export class Plugboard {
  mapa: Map<string, string>;

  constructor(pares: string[] = []) {
    this.mapa = new Map();

    // Initialize identity mapping
    for (const letra of ALPHABET) {
      this.mapa.set(letra, letra);
    }

    // Apply pairs
    for (const par of pares) {
      if (par.length !== 2) continue;
      const a = par[0].toUpperCase();
      const b = par[1].toUpperCase();
      if (!ALPHABET.includes(a) || !ALPHABET.includes(b)) continue;

      this.mapa.set(a, b);
      this.mapa.set(b, a);
    }
  }

  trocar(letra: string): string {
    const l = letra.toUpperCase();
    if (!ALPHABET.includes(l)) return letra;
    return this.mapa.get(l) ?? l;
  }
}

// Reflector class
export class Reflector {
  wiring: string;

  constructor(wiring: string) {
    if (wiring.length !== 26) {
      throw new Error("Reflector wiring must have 26 letters");
    }
    this.wiring = wiring.toUpperCase();
  }

  refletir(letra: string): string {
    const idx = letra.charCodeAt(0) - 65;
    if (idx < 0 || idx > 25) return letra;
    return this.wiring[idx];
  }
}

// Main Enigma class
export class Enigma {
  reflector: Reflector;
  rotors: Rotor[];
  plugboard: Plugboard;

  constructor(reflector: Reflector, rotors: Rotor[], plugboard: Plugboard) {
    if (rotors.length !== 3) {
      throw new Error("Use exactly 3 rotors for M3 version");
    }
    this.reflector = reflector;
    this.rotors = rotors;
    this.plugboard = plugboard;
  }

  setPosicoes(posicoes: string[]): void {
    if (posicoes.length !== 3) {
      throw new Error("3 positions required (left, middle, right)");
    }
    for (let i = 0; i < 3; i++) {
      this.rotors[i].setPosicaoPorLetra(posicoes[i]);
    }
  }

  getPosicoes(): string[] {
    return this.rotors.map((r) => r.getPosicaoLetra());
  }

  _stepRotores(): void {
    const [rotorEsq, rotorMeio, rotorDir] = this.rotors;

    const meioNoNotch = rotorMeio.estaNoNotch();
    const dirNoNotch = rotorDir.estaNoNotch();

    // Double-step mechanism
    if (meioNoNotch) {
      rotorMeio.girar();
      rotorEsq.girar();
    }

    if (dirNoNotch) {
      rotorMeio.girar();
    }

    rotorDir.girar();
  }

  encipherChar(letra: string): string {
    const result = this.encipherCharWithPath(letra);
    return result.outputLetter;
  }

  encipherCharWithPath(letra: string): SignalPath {
    let c = letra.toUpperCase();
    const steps: SignalStep[] = [];

    if (!ALPHABET.includes(c)) {
      return {
        steps: [],
        inputLetter: letra,
        outputLetter: letra,
      };
    }

    const originalInput = c;

    // 1. Step rotors
    this._stepRotores();

    // Input
    steps.push({
      component: "input",
      inputLetter: c,
      outputLetter: c,
      inputIndex: c.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    // 2. Plugboard (input)
    let prev = c;
    c = this.plugboard.trocar(c);
    steps.push({
      component: "plugboard_in",
      inputLetter: prev,
      outputLetter: c,
      inputIndex: prev.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    // 3. Forward path: right -> left
    prev = c;
    c = this.rotors[2].passarParaFrente(c);
    steps.push({
      component: "rotor_r",
      inputLetter: prev,
      outputLetter: c,
      inputIndex: prev.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    prev = c;
    c = this.rotors[1].passarParaFrente(c);
    steps.push({
      component: "rotor_m",
      inputLetter: prev,
      outputLetter: c,
      inputIndex: prev.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    prev = c;
    c = this.rotors[0].passarParaFrente(c);
    steps.push({
      component: "rotor_l",
      inputLetter: prev,
      outputLetter: c,
      inputIndex: prev.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    // 4. Reflector
    prev = c;
    c = this.reflector.refletir(c);
    steps.push({
      component: "reflector",
      inputLetter: prev,
      outputLetter: c,
      inputIndex: prev.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    // 5. Backward path: left -> right
    prev = c;
    c = this.rotors[0].passarParaTras(c);
    steps.push({
      component: "rotor_l_back",
      inputLetter: prev,
      outputLetter: c,
      inputIndex: prev.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    prev = c;
    c = this.rotors[1].passarParaTras(c);
    steps.push({
      component: "rotor_m_back",
      inputLetter: prev,
      outputLetter: c,
      inputIndex: prev.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    prev = c;
    c = this.rotors[2].passarParaTras(c);
    steps.push({
      component: "rotor_r_back",
      inputLetter: prev,
      outputLetter: c,
      inputIndex: prev.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    // 6. Plugboard (output)
    prev = c;
    c = this.plugboard.trocar(c);
    steps.push({
      component: "plugboard_out",
      inputLetter: prev,
      outputLetter: c,
      inputIndex: prev.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    // Output
    steps.push({
      component: "output",
      inputLetter: c,
      outputLetter: c,
      inputIndex: c.charCodeAt(0) - 65,
      outputIndex: c.charCodeAt(0) - 65,
    });

    return {
      steps,
      inputLetter: originalInput,
      outputLetter: c,
    };
  }

  encipherText(texto: string): string {
    let resultado = "";
    for (const ch of texto) {
      resultado += this.encipherChar(ch);
    }
    return resultado;
  }
}

// Standard M3 Rotors
export const ROTOR_I = () => new Rotor("EKMFLGDQVZNTOWYHXUSPAIBRCJ", "Q");
export const ROTOR_II = () => new Rotor("AJDKSIRUXBLHWTMCQGZNPYFVOE", "E");
export const ROTOR_III = () => new Rotor("BDFHJLCPRTXVZNYEIWGAKMUSQO", "V");
export const ROTOR_IV = () => new Rotor("ESOVPZJAYQUIRHXLNFTGKDCMWB", "J");
export const ROTOR_V = () => new Rotor("VZBRGITYUPSDNHLXAWMJQOFECK", "Z");

// Standard Reflectors
export const REFLECTOR_B = () => new Reflector("YRUHQSLDPXNGOKMIEBFZCWVJAT");
export const REFLECTOR_C = () => new Reflector("FVPJIAOYEDRZXWGCTKUQSBNMHL");

// Rotor configurations
export const ROTOR_CONFIGS = {
  I: { name: "I", factory: ROTOR_I },
  II: { name: "II", factory: ROTOR_II },
  III: { name: "III", factory: ROTOR_III },
  IV: { name: "IV", factory: ROTOR_IV },
  V: { name: "V", factory: ROTOR_V },
} as const;

export const REFLECTOR_CONFIGS = {
  B: { name: "B", factory: REFLECTOR_B },
  C: { name: "C", factory: REFLECTOR_C },
} as const;

export type RotorType = keyof typeof ROTOR_CONFIGS;
export type ReflectorType = keyof typeof REFLECTOR_CONFIGS;
