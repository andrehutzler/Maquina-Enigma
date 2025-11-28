import { beforeAll, describe, test, expect } from "vitest";

let m;

beforeAll(async () => {
  m = await import("../../front/src/lib/enigma.ts");
});

describe("Enigma machine comprehensive tests", () => {
  test("RotorFactory and ReflectorFactory provide expected ids", () => {
    const rotorIds = m.RotorFactory.getAvailableIds();
    expect(rotorIds).toEqual(expect.arrayContaining(["I", "II", "III", "IV", "V"]));
    const reflIds = m.ReflectorFactory.getAvailableIds();
    expect(reflIds).toEqual(expect.arrayContaining(["B", "C"]));
  });

  test("Rotor setPosition and get positionLetter", () => {
    const r = m.RotorFactory.create("I", "A");
    r.setPosition("Z");
    expect(r.positionLetter).toBe("Z");
    r.setPosition("A");
    expect(r.positionLetter).toBe("A");
  });

  test("Rotor rotation wraps from Z to A", () => {
    const r = m.RotorFactory.create("I", "Z");
    expect(r.positionLetter).toBe("Z");
    r.rotate();
    expect(r.positionLetter).toBe("A");
  });

  test("Rotor forward then backward returns original letter (no other offsets)", () => {
    const r = m.RotorFactory.create("III", "A");
    for (const ch of m.ALPHABET) {
      const f = r.forward(ch);
      const b = r.backward(f);
      expect(b).toBe(ch);
    }
  });

  test("Reflector is involutive (reflect twice -> original) for all letters", () => {
    const refl = m.ReflectorFactory.create("B");
    for (const ch of m.ALPHABET) {
      const r1 = refl.reflect(ch);
      const r2 = refl.reflect(r1);
      expect(r2).toBe(ch);
    }
  });

  test("Plugboard with no pairs maps letters to themselves", () => {
    const pb = new m.Plugboard([]);
    for (const ch of m.ALPHABET) {
      expect(pb.swap(ch)).toBe(ch);
      expect(pb.isConnected(ch)).toBe(false);
    }
  });

  test("Plugboard pair swaps both letters", () => {
    const pb = new m.Plugboard(["AZ", "BC"]);
    expect(pb.swap("A")).toBe("Z");
    expect(pb.swap("Z")).toBe("A");
    expect(pb.swap("B")).toBe("C");
    expect(pb.swap("C")).toBe("B");
    expect(pb.isConnected("A")).toBe(true);
    expect(pb.isConnected("D")).toBe(false);
  });

  test("EnigmaFactory.createDefault returns positions AAA", () => {
    const e = m.EnigmaFactory.createDefault();
    expect(e.getPositions()).toEqual(["A", "A", "A"]);
  });

  test("Enigma setPositions and getPositions", () => {
    const e = m.EnigmaFactory.createDefault();
    e.setPositions(["B", "C", "D"]);
    expect(e.getPositions()).toEqual(["B", "C", "D"]);
  });

  test("Enciphering non-letter returns same character (unchanged)", () => {
    const e = m.EnigmaFactory.createDefault();
    expect(e.encipherChar("1")).toBe("1");
    expect(e.encipherChar(" ")).toBe(" ");
    expect(e.encipherChar(".")).toBe(".");
  });

  test("Same input letter never results in same output letter across full alphabet (with default settings)", () => {
    const e = m.EnigmaFactory.createDefault();
    const results = new Set();
    for (const ch of m.ALPHABET) {
      const out = e.encipherChar(ch);
      // same-letter -> same output is extremely unlikely for Enigma; assert not equal
      expect(out).not.toBe(ch);
      results.add(out);
    }
    // outputs should all be letters
    expect(results.size).toBeLessThanOrEqual(26);
  });

  test("Enciphering then re-enciphering after resetting positions deciphers (symmetry)", () => {
    const settings = {
      rotors: ["I", "II", "III"],
      reflector: "B",
      positions: ["A", "A", "A"],
      plugboardPairs: ["AQ", "BT"],
    };
    const e1 = m.EnigmaFactory.create(settings);
    const e2 = m.EnigmaFactory.create(settings);
    const plaintext = "HELLOWORLD";
    const cipher = e1.encipherText(plaintext);
    // reset positions by recreating machine and encipher the cipher -> should recover plaintext
    const recovered = e2.encipherText(cipher);
    expect(recovered).toBe(plaintext);
  });

  test("EncipherText preserves non-letter characters", () => {
    const e = m.EnigmaFactory.createDefault();
    const text = "HELLO, WORLD! 123";
    const out = e.encipherText(text);
    // non-letters remain equal in position
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (!/[A-Z]/i.test(ch)) expect(out[i]).toBe(ch);
    }
  });

  test("SignalTracer records a path with expected first and last steps", () => {
    const e = m.EnigmaFactory.createDefault();
    const path = e.encipherCharWithPath("A");
    expect(path.inputLetter).toBe("A");
    expect(path.steps.length).toBeGreaterThan(0);
    expect(path.steps[0].component).toBe("input");
    expect(path.steps[path.steps.length - 1].component).toBe("output");
  });

  test("Rotor.isAtNotch reports correctly for known notch letters", () => {
    const rI = m.RotorFactory.create("I", "Q"); // I has notch Q
    expect(rI.isAtNotch()).toBe(true);
    const rII = m.RotorFactory.create("II", "E"); // II notch E
    expect(rII.isAtNotch()).toBe(true);
  });

  test("Rotors step logic: middle at notch causes left+middle rotate", () => {
    // place middle rotor at its notch so next step rotates middle and left
    const settings = {
      rotors: ["I", "II", "III"],
      reflector: "B",
      positions: ["A", m.RotorFactory.getConfig("II").notch, "A"], // middle at notch E
      plugboardPairs: [],
    };
    const e = m.EnigmaFactory.create(settings);
    const before = e.getPositions();
    e.encipherChar("A");
    const after = e.getPositions();
    // middle and left should have moved at least once
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
  });

  test("Right notch causes middle rotor to rotate", () => {
    // set right rotor at its notch (III notch V) so middle advances on step
    const settings = {
      rotors: ["I", "II", "III"],
      reflector: "B",
      positions: ["A", "A", m.RotorFactory.getConfig("III").notch],
      plugboardPairs: [],
    };
    const e = m.EnigmaFactory.create(settings);
    const before = e.getPositions();
    e.encipherChar("A");
    const after = e.getPositions();
    // middle should have rotated because right was at notch
    expect(after[1]).not.toBe(before[1]);
  });

  test("Enigma.encipherChar is deterministic for fixed starting positions", () => {
    const settings = {
      rotors: ["V", "IV", "III"],
      reflector: "C",
      positions: ["M", "N", "O"],
      plugboardPairs: ["AZ"],
    };
    const e1 = m.EnigmaFactory.create(settings);
    const e2 = m.EnigmaFactory.create(settings);
    const out1 = e1.encipherText("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    const out2 = e2.encipherText("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    expect(out1).toBe(out2);
  });

  test("Rotors cloning preserves id, wiring and position", () => {
    const r = m.RotorFactory.create("IV", "X");
    r.rotate();
    const clone = r.clone();
    expect(clone.id).toBe(r.id);
    expect(clone.wiring).toBe(r.wiring);
    expect(clone.position).toBe(r.position);
  });

  test("Plugboard ignores invalid pairs gracefully", () => {
    const pb = new m.Plugboard(["A", "ABC", "1A", "A1", "AA"]);
    // invalid entries ignored => all letters map to themselves
    for (const ch of m.ALPHABET) expect(pb.swap(ch)).toBe(ch);
  });

  test("Multiple encipherChar calls advance rotors cumulatively", () => {
    const e = m.EnigmaFactory.createDefault();
    const p1 = e.getPositions();
    e.encipherChar("A");
    e.encipherChar("B");
    const p2 = e.getPositions();
    expect(p2).not.toEqual(p1);
  });

  test("Enigma.encipherText handles empty string", () => {
    const e = m.EnigmaFactory.createDefault();
    expect(e.encipherText("")).toBe("");
  });
});