import { useState, useCallback, useEffect, useRef } from "react";
import {
  Enigma,
  Plugboard,
  ROTOR_CONFIGS,
  REFLECTOR_CONFIGS,
  type RotorType,
  type ReflectorType,
} from "../lib/enigma";
import { RotateCcw, Settings, Volume2, VolumeX } from "lucide-react";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const KEYBOARD_ROWS = ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"];

interface EnigmaConfig {
  rotors: [RotorType, RotorType, RotorType];
  reflector: ReflectorType;
  positions: [string, string, string];
  plugboardPairs: string[];
}

export function EnigmaMachine() {
  const [config, setConfig] = useState<EnigmaConfig>({
    rotors: ["I", "II", "III"],
    reflector: "B",
    positions: ["A", "A", "A"],
    plugboardPairs: [],
  });

  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [litLamp, setLitLamp] = useState<string | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [plugboardInput, setPlugboardInput] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const enigmaRef = useRef<Enigma | null>(null);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize enigma machine
  const initEnigma = useCallback(() => {
    const rotors = config.rotors.map((r) => ROTOR_CONFIGS[r].factory());
    const reflector = REFLECTOR_CONFIGS[config.reflector].factory();
    const plugboard = new Plugboard(config.plugboardPairs);
    const enigma = new Enigma(reflector, rotors, plugboard);
    enigma.setPosicoes(config.positions);
    enigmaRef.current = enigma;
  }, [config.rotors, config.reflector, config.plugboardPairs, config.positions]);

  useEffect(() => {
    initEnigma();
  }, [initEnigma]);

  // Play click sound
  const playClick = useCallback(() => {
    if (soundEnabled && clickSoundRef.current) {
      clickSoundRef.current.currentTime = 0;
      clickSoundRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Handle key press
  const handleKeyPress = useCallback(
    (key: string) => {
      if (!enigmaRef.current) return;
      const upperKey = key.toUpperCase();
      if (!ALPHABET.includes(upperKey)) return;

      playClick();
      setPressedKey(upperKey);

      const output = enigmaRef.current.encipherChar(upperKey);
      setLitLamp(output);

      setInputText((prev) => prev + upperKey);
      setOutputText((prev) => prev + output);

      // Update rotor positions in state
      const newPositions = enigmaRef.current.getPosicoes() as [string, string, string];
      setConfig((prev) => ({ ...prev, positions: newPositions }));

      setTimeout(() => {
        setLitLamp(null);
        setPressedKey(null);
      }, 150);
    },
    [playClick]
  );

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings) return;
      const key = e.key.toUpperCase();
      if (ALPHABET.includes(key)) {
        e.preventDefault();
        handleKeyPress(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress, showSettings]);

  // Reset machine
  const resetMachine = () => {
    setInputText("");
    setOutputText("");
    setConfig((prev) => ({ ...prev, positions: ["A", "A", "A"] }));
    initEnigma();
  };

  // Update rotor position
  const rotateRotor = (index: number, direction: 1 | -1) => {
    const currentPos = config.positions[index].charCodeAt(0) - 65;
    const newPos = (currentPos + direction + 26) % 26;
    const newLetter = ALPHABET[newPos];
    const newPositions = [...config.positions] as [string, string, string];
    newPositions[index] = newLetter;
    setConfig((prev) => ({ ...prev, positions: newPositions }));
  };

  // Parse plugboard input
  const updatePlugboard = () => {
    const pairs = plugboardInput
      .toUpperCase()
      .split(/[\s,]+/)
      .filter((p) => p.length === 2 && /^[A-Z]{2}$/.test(p));
    setConfig((prev) => ({ ...prev, plugboardPairs: pairs }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 flex flex-col items-center justify-center p-4">
      {/* Hidden audio element for click sound */}
      <audio
        ref={clickSoundRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbGxsbGxsbGxsbGxsbGxsbGxsbGxs"
        preload="auto"
      />

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-amber-100 tracking-wider" style={{ fontFamily: "serif" }}>
          ENIGMA M3
        </h1>
        <p className="text-amber-200/60 text-sm mt-1">Wehrmacht / Luftwaffe</p>
      </div>

      {/* Main Machine */}
      <div className="bg-gradient-to-b from-stone-700 to-stone-800 rounded-2xl p-6 shadow-2xl border-4 border-stone-600 max-w-2xl w-full">
        {/* Control buttons */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-stone-600 hover:bg-stone-500 text-amber-100 transition-colors"
            title={soundEnabled ? "Mute" : "Unmute"}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-stone-600 hover:bg-stone-500 text-amber-100 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={resetMachine}
            className="p-2 rounded-lg bg-stone-600 hover:bg-stone-500 text-amber-100 transition-colors"
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-stone-900/50 rounded-xl p-4 mb-4 border border-stone-600">
            <h3 className="text-amber-100 font-bold mb-3">Configuration</h3>
            
            {/* Rotor Selection */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {["Left", "Middle", "Right"].map((label, idx) => (
                <div key={label}>
                  <label className="text-amber-200/80 text-xs block mb-1">{label} Rotor</label>
                  <select
                    value={config.rotors[idx]}
                    onChange={(e) => {
                      const newRotors = [...config.rotors] as [RotorType, RotorType, RotorType];
                      newRotors[idx] = e.target.value as RotorType;
                      setConfig((prev) => ({ ...prev, rotors: newRotors }));
                    }}
                    className="w-full bg-stone-700 text-amber-100 rounded px-2 py-1 border border-stone-500"
                  >
                    {Object.keys(ROTOR_CONFIGS).map((r) => (
                      <option key={r} value={r}>
                        Rotor {r}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Reflector Selection */}
            <div className="mb-4">
              <label className="text-amber-200/80 text-xs block mb-1">Reflector</label>
              <select
                value={config.reflector}
                onChange={(e) => setConfig((prev) => ({ ...prev, reflector: e.target.value as ReflectorType }))}
                className="bg-stone-700 text-amber-100 rounded px-2 py-1 border border-stone-500"
              >
                {Object.keys(REFLECTOR_CONFIGS).map((r) => (
                  <option key={r} value={r}>
                    Reflector {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Plugboard */}
            <div>
              <label className="text-amber-200/80 text-xs block mb-1">
                Plugboard Pairs (e.g., AB CD EF)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={plugboardInput}
                  onChange={(e) => setPlugboardInput(e.target.value)}
                  placeholder="AB CD EF..."
                  className="flex-1 bg-stone-700 text-amber-100 rounded px-2 py-1 border border-stone-500"
                />
                <button
                  onClick={updatePlugboard}
                  className="px-3 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded"
                >
                  Apply
                </button>
              </div>
              {config.plugboardPairs.length > 0 && (
                <p className="text-amber-200/60 text-xs mt-1">
                  Active: {config.plugboardPairs.join(", ")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Rotors Display */}
        <div className="flex justify-center gap-4 mb-6">
          {config.positions.map((pos, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <button
                onClick={() => rotateRotor(idx, -1)}
                className="text-amber-300 hover:text-amber-100 text-lg font-bold"
              >
                ^
              </button>
              <div className="w-14 h-16 bg-gradient-to-b from-stone-500 to-stone-600 rounded-lg border-2 border-stone-400 flex items-center justify-center shadow-inner">
                <span className="text-2xl font-mono font-bold text-amber-100">{pos}</span>
              </div>
              <button
                onClick={() => rotateRotor(idx, 1)}
                className="text-amber-300 hover:text-amber-100 text-lg font-bold rotate-180"
              >
                ^
              </button>
              <span className="text-amber-200/60 text-xs mt-1">{config.rotors[idx]}</span>
            </div>
          ))}
        </div>

        {/* Lampboard */}
        <div className="bg-stone-900/50 rounded-xl p-4 mb-4">
          <div className="flex flex-col gap-2 items-center">
            {KEYBOARD_ROWS.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1 justify-center" style={{ marginLeft: rowIdx === 1 ? "16px" : rowIdx === 2 ? "8px" : "0" }}>
                {row.split("").map((letter) => (
                  <div
                    key={letter}
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm transition-all duration-100 ${
                      litLamp === letter
                        ? "bg-amber-300 text-stone-900 shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                        : "bg-stone-700 text-amber-100/50 border border-stone-600"
                    }`}
                  >
                    {letter}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard */}
        <div className="bg-stone-900/30 rounded-xl p-4">
          <div className="flex flex-col gap-2 items-center">
            {KEYBOARD_ROWS.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1 justify-center" style={{ marginLeft: rowIdx === 1 ? "16px" : rowIdx === 2 ? "8px" : "0" }}>
                {row.split("").map((letter) => (
                  <button
                    key={letter}
                    onMouseDown={() => handleKeyPress(letter)}
                    className={`w-10 h-10 rounded-lg font-mono font-bold text-sm transition-all ${
                      pressedKey === letter
                        ? "bg-amber-600 text-white transform scale-95"
                        : "bg-stone-600 text-amber-100 hover:bg-stone-500 shadow-md"
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Output Display */}
        <div className="mt-6 space-y-3">
          <div>
            <label className="text-amber-200/60 text-xs uppercase tracking-wider">Input</label>
            <div className="bg-stone-900 rounded-lg p-3 font-mono text-amber-100 min-h-[48px] break-all border border-stone-600">
              {inputText || <span className="text-stone-500">Type or click keys...</span>}
            </div>
          </div>
          <div>
            <label className="text-amber-200/60 text-xs uppercase tracking-wider">Output (Encrypted)</label>
            <div className="bg-stone-900 rounded-lg p-3 font-mono text-green-400 min-h-[48px] break-all border border-stone-600">
              {outputText || <span className="text-stone-500">Encrypted text appears here...</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-6 text-center text-amber-200/40 text-xs max-w-md">
        <p>
          The Enigma machine was used by Nazi Germany during WWII to encrypt military communications.
          Its code was famously broken by Alan Turing and the team at Bletchley Park.
        </p>
      </div>
    </div>
  );
}
