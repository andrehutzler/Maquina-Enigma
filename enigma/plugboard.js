// plugboard.js
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export class Plugboard {
  /**
   * pares: array de strings tipo ["AR", "GK", "OX"]
   */
  constructor(pares = []) {
    // mapa de substituição, por exemplo A<->R
    this.mapa = new Map();

    // inicializa identidade (A->A, B->B...)
    for (const letra of ALFABETO) {
      this.mapa.set(letra, letra);
    }

    // aplica pares
    for (const par of pares) {
      if (par.length !== 2) continue;
      const a = par[0].toUpperCase();
      const b = par[1].toUpperCase();
      if (!ALFABETO.includes(a) || !ALFABETO.includes(b)) continue;

      this.mapa.set(a, b);
      this.mapa.set(b, a);
    }
  }

  trocar(letra) {
    const l = letra.toUpperCase();
    if (!ALFABETO.includes(l)) return letra; // ignora não-letras
    return this.mapa.get(l) ?? l;
  }
}
