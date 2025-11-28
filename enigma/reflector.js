// reflector.js
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export class Reflector {
  /**
   * @param {string} wiring - 26 letras, ex:
   *   B = "YRUHQSLDPXNGOKMIEBFZCWVJAT"
   *   C = "FVPJIAOYEDRZXWGCTKUQSBNMHL"
   */
  constructor(wiring) {
    if (wiring.length !== 26) {
      throw new Error("Wiring do refletor deve ter 26 letras");
    }
    this.wiring = wiring.toUpperCase();
  }

  refletir(letra) {
    const idx = letra.charCodeAt(0) - 65;
    if (idx < 0 || idx > 25) return letra;
    return this.wiring[idx];
  }
}
