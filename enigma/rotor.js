// rotor.js
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export class Rotor {
  /**
   * @param {string} wiring - 26 letras (ex: "EKMFLGDQVZNTOWYHXUSPAIBRCJ")
   * @param {string} notchChar - letra da posição de giro (ex: "Q")
   * @param {number} posicaoInicial - 0..25 (0 = 'A')
   */
  constructor(wiring, notchChar, posicaoInicial = 0) {
    if (wiring.length !== 26) {
      throw new Error("Wiring do rotor deve ter 26 letras");
    }

    this.wiring = wiring.toUpperCase();
    this.notchChar = notchChar.toUpperCase();
    this.posicao = posicaoInicial % 26;

    // pré-calcula inverso para o caminho de volta
    this.inverseWiring = this._calcularInverseWiring();
  }

  _calcularInverseWiring() {
    const inv = new Array(26);
    for (let i = 0; i < 26; i++) {
      const saida = this.wiring[i];          // letra de saída
      const idxSaida = saida.charCodeAt(0) - 65;
      inv[idxSaida] = ALFABETO[i];
    }
    return inv.join("");
  }

  // gira o rotor 1 posição
  girar() {
    this.posicao = (this.posicao + 1) % 26;
  }

  // checa se o rotor está na posição de notch (para acionar o próximo)
  estaNoNotch() {
    const letraNaJanela = ALFABETO[this.posicao];
    return letraNaJanela === this.notchChar;
  }

  /**
   * Passagem da direita para a esquerda (entrada -> saída)
   */
  passarParaFrente(letra) {
    const idxEntrada = letra.charCodeAt(0) - 65;

    // aplica offset da posição
    const idxComOffset = (idxEntrada + this.posicao + 26) % 26;

    // passa pelo wiring
    const letraSaida = this.wiring[idxComOffset];

    // remove offset
    const idxSaida = letraSaida.charCodeAt(0) - 65;
    const idxFinal = (idxSaida - this.posicao + 26) % 26;

    return ALFABETO[idxFinal];
  }

  /**
   * Passagem da esquerda para a direita (volta do refletor)
   */
  passarParaTras(letra) {
    const idxEntrada = letra.charCodeAt(0) - 65;

    // aplica offset
    const idxComOffset = (idxEntrada + this.posicao + 26) % 26;

    // passa pelo wiring inverso
    const letraSaida = this.inverseWiring[idxComOffset];

    // remove offset
    const idxSaida = letraSaida.charCodeAt(0) - 65;
    const idxFinal = (idxSaida - this.posicao + 26) % 26;

    return ALFABETO[idxFinal];
  }

  /**
   * Ajustar posição via letra (ex: 'A'..'Z')
   */
  setPosicaoPorLetra(letra) {
    const idx = letra.toUpperCase().charCodeAt(0) - 65;
    if (idx < 0 || idx > 25) throw new Error("Posição inválida");
    this.posicao = idx;
  }

  getPosicaoLetra() {
    return ALFABETO[this.posicao];
  }
}
