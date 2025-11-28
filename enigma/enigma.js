// enigma.js
import { Plugboard } from "./plugboard.js";
import { Rotor } from "./rotor.js";
import { Reflector } from "./reflector.js";

// Essas imports são só pro teste no terminal.
// Se depois forem usar esse mesmo arquivo no navegador/bundler,
// vocês podem remover a parte do "CLI" no final.
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export class Enigma {
  /**
   * @param {Reflector} reflector - refletor B ou C
   * @param {Rotor[]} rotors - array [esquerda, meio, direita]
   * @param {Plugboard} plugboard
   */
  constructor(reflector, rotors, plugboard) {
    if (rotors.length !== 3) {
      throw new Error("Use exatamente 3 rotores na versão M3");
    }
    this.reflector = reflector;
    this.rotors = rotors;
    this.plugboard = plugboard;
  }

  setPosicoes(posicoes) {
    if (posicoes.length !== 3) {
      throw new Error("São necessárias 3 posições (esq, meio, dir)");
    }
    for (let i = 0; i < 3; i++) {
      this.rotors[i].setPosicaoPorLetra(posicoes[i]);
    }
  }

  _stepRotores() {
    const [rotorEsq, rotorMeio, rotorDir] = this.rotors;

    const meioNoNotch = rotorMeio.estaNoNotch();
    const dirNoNotch = rotorDir.estaNoNotch();

    // double-step clássico
    if (meioNoNotch) {
      rotorMeio.girar();
      rotorEsq.girar();
    }

    if (dirNoNotch) {
      rotorMeio.girar();
    }

    rotorDir.girar();
  }

  encipherChar(letra) {
    let c = letra.toUpperCase();
    if (!ALFABETO.includes(c)) {
      return letra; // mantém espaço, pontuação etc.
    }

    // 1. step dos rotores
    this._stepRotores();

    // 2. plugboard (entrada)
    c = this.plugboard.trocar(c);

    // 3. rota: direita -> esquerda
    c = this.rotors[2].passarParaFrente(c);
    c = this.rotors[1].passarParaFrente(c);
    c = this.rotors[0].passarParaFrente(c);

    // 4. refletor
    c = this.reflector.refletir(c);

    // 5. volta: esquerda -> direita
    c = this.rotors[0].passarParaTras(c);
    c = this.rotors[1].passarParaTras(c);
    c = this.rotors[2].passarParaTras(c);

    // 6. plugboard (saída)
    c = this.plugboard.trocar(c);

    return c;
  }

  encipherText(texto) {
    let resultado = "";
    for (const ch of texto) {
      resultado += this.encipherChar(ch);
    }
    return resultado;
  }
}

/**
 * Helpers com os rotores/refletores padrão M3
 */

export const ROTOR_I   = () => new Rotor("EKMFLGDQVZNTOWYHXUSPAIBRCJ", "Q");
export const ROTOR_II  = () => new Rotor("AJDKSIRUXBLHWTMCQGZNPYFVOE", "E");
export const ROTOR_III = () => new Rotor("BDFHJLCPRTXVZNYEIWGAKMUSQO", "V");
export const ROTOR_IV  = () => new Rotor("ESOVPZJAYQUIRHXLNFTGKDCMWB", "J");
export const ROTOR_V   = () => new Rotor("VZBRGITYUPSDNHLXAWMJQOFECK", "Z");

export const REFLECTOR_B = () =>
  new Reflector("YRUHQSLDPXNGOKMIEBFZCWVJAT");

export const REFLECTOR_C = () =>
  new Reflector("FVPJIAOYEDRZXWGCTKUQSBNMHL");


/* ============================================================
   CLI SIMPLES PARA TESTAR NO TERMINAL
   (só roda se você fizer: node enigma.js)
   ============================================================ */

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("=== TESTE RÁPIDO DA ENIGMA ===");
  console.log("Config fixa para o teste:");
  console.log("  Rotores (esq-meio-dir): I - II - III");
  console.log("  Refletor:               B");
  console.log("  Posições iniciais:      AAA");
  console.log("  Plugboard:              (vazio)");
  console.log("");

  rl.question("Digite o texto para cifrar: ", (textoClaro) => {
    const textoClaroUpper = textoClaro.toUpperCase();

    // Monta máquina para CIFRAR
    const plugboard1 = new Plugboard([]);
    const enigma1 = new Enigma(
      REFLECTOR_B(),
      [ROTOR_I(), ROTOR_II(), ROTOR_III()],
      plugboard1
    );
    enigma1.setPosicoes(["A", "A", "A"]);

    const cifrado = enigma1.encipherText(textoClaroUpper);

    console.log("\n=== RESULTADO ===");
    console.log("Texto claro:   ", textoClaroUpper);
    console.log("Texto cifrado: ", cifrado);

    // Monta outra máquina igual para DECIFRAR
    const plugboard2 = new Plugboard([]);
    const enigma2 = new Enigma(
      REFLECTOR_B(),
      [ROTOR_I(), ROTOR_II(), ROTOR_III()],
      plugboard2
    );
    enigma2.setPosicoes(["A", "A", "A"]);

    const decifrado = enigma2.encipherText(cifrado);
    console.log("Texto decifrado:", decifrado);
    console.log("=================\n");

    rl.close();
  });
}
