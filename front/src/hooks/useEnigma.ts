import { useState, useCallback, useRef, useEffect } from "react";
import {
  Enigma,
  EnigmaFactory,
  ALPHABET,
  type RotorId,
  type ReflectorId,
  type SignalPath,
  type EnigmaSettings,
} from "../lib/enigma";

export interface EnigmaState {
  rotors: [RotorId, RotorId, RotorId];
  reflector: ReflectorId;
  positions: [string, string, string];
  plugboardPairs: string[];
  inputText: string;
  outputText: string;
  currentSignalPath: SignalPath | null;
  litLamp: string | null;
  pressedKey: string | null;
}

export interface EnigmaActions {
  processKey: (key: string) => void;
  reset: () => void;
  setRotor: (index: number, rotorId: RotorId) => void;
  setReflector: (reflectorId: ReflectorId) => void;
  setPosition: (index: number, position: string) => void;
  rotatePosition: (index: number, direction: 1 | -1) => void;
  setPlugboardPairs: (pairs: string[]) => void;
}

export interface UseEnigmaReturn {
  state: EnigmaState;
  actions: EnigmaActions;
}

const DEFAULT_SETTINGS: EnigmaSettings = {
  rotors: ["I", "II", "III"],
  reflector: "B",
  positions: ["A", "A", "A"],
  plugboardPairs: [],
};

export function useEnigma(
  initialSettings: Partial<EnigmaSettings> = {}
): UseEnigmaReturn {
  const settings: EnigmaSettings = {
    ...DEFAULT_SETTINGS,
    ...initialSettings,
    rotors: initialSettings.rotors ?? DEFAULT_SETTINGS.rotors,
    positions: initialSettings.positions ?? DEFAULT_SETTINGS.positions,
  };

  const [rotors, setRotors] = useState<[RotorId, RotorId, RotorId]>(
    settings.rotors as [RotorId, RotorId, RotorId]
  );
  const [reflector, setReflectorState] = useState<ReflectorId>(settings.reflector);
  const [positions, setPositions] = useState<[string, string, string]>(
    settings.positions as [string, string, string]
  );
  const [plugboardPairs, setPlugboardPairsState] = useState<string[]>(
    [...settings.plugboardPairs]
  );
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [currentSignalPath, setCurrentSignalPath] = useState<SignalPath | null>(null);
  const [litLamp, setLitLamp] = useState<string | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const enigmaRef = useRef<Enigma | null>(null);

  const rebuildEnigma = useCallback(() => {
    enigmaRef.current = EnigmaFactory.create({
      rotors,
      reflector,
      positions,
      plugboardPairs,
    });
  }, [rotors, reflector, positions, plugboardPairs]);

  useEffect(() => {
    rebuildEnigma();
  }, [rebuildEnigma]);

  const processKey = useCallback((key: string) => {
    if (!enigmaRef.current) return;

    const upperKey = key.toUpperCase();
    if (!ALPHABET.includes(upperKey)) return;

    setPressedKey(upperKey);

    const signalPath = enigmaRef.current.encipherCharWithPath(upperKey);
    setCurrentSignalPath(signalPath);
    setLitLamp(signalPath.outputLetter);

    setInputText((prev) => prev + upperKey);
    setOutputText((prev) => prev + signalPath.outputLetter);

    const newPositions = enigmaRef.current.getPositions();
    setPositions(newPositions);

    setTimeout(() => {
      setLitLamp(null);
      setPressedKey(null);
    }, 150);
  }, []);

  const reset = useCallback(() => {
    setInputText("");
    setOutputText("");
    setCurrentSignalPath(null);
    setLitLamp(null);
    setPressedKey(null);
    setPositions(["A", "A", "A"]);
  }, []);

  const setRotor = useCallback((index: number, rotorId: RotorId) => {
    setRotors((prev) => {
      const newRotors = [...prev] as [RotorId, RotorId, RotorId];
      newRotors[index] = rotorId;
      return newRotors;
    });
  }, []);

  const setReflector = useCallback((reflectorId: ReflectorId) => {
    setReflectorState(reflectorId);
  }, []);

  const setPosition = useCallback((index: number, position: string) => {
    setPositions((prev) => {
      const newPositions = [...prev] as [string, string, string];
      newPositions[index] = position.toUpperCase();
      return newPositions;
    });
  }, []);

  const rotatePosition = useCallback((index: number, direction: 1 | -1) => {
    setPositions((prev) => {
      const currentPos = prev[index].charCodeAt(0) - 65;
      const newPos = ((currentPos + direction + 26) % 26);
      const newLetter = ALPHABET[newPos];
      
      const newPositions = [...prev] as [string, string, string];
      newPositions[index] = newLetter;
      return newPositions;
    });
  }, []);

  const setPlugboardPairs = useCallback((pairs: string[]) => {
    const validPairs = pairs
      .map((p) => p.toUpperCase())
      .filter((p) => p.length === 2 && /^[A-Z]{2}$/.test(p));
    
    setPlugboardPairsState(validPairs);
  }, []);

  return {
    state: {
      rotors,
      reflector,
      positions,
      plugboardPairs,
      inputText,
      outputText,
      currentSignalPath,
      litLamp,
      pressedKey,
    },
    actions: {
      processKey,
      reset,
      setRotor,
      setReflector,
      setPosition,
      rotatePosition,
      setPlugboardPairs,
    },
  };
}
