import { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw, Settings, Volume2, VolumeX, Eye, EyeOff } from "lucide-react";

import { useEnigma } from "../hooks/useEnigma";
import { SignalPathVisualization } from "./SignalPathVisualization";
import {
  ALPHABET,
  RotorFactory,
  ReflectorFactory,
  type RotorId,
  type ReflectorId,
} from "../lib/enigma";

const KEYBOARD_LAYOUT = {
  rows: ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"],
  offsets: [0, 16, 8], // Pixel offsets for staggered layout
} as const;

interface ControlButtonsProps {
  showVisualization: boolean;
  soundEnabled: boolean;
  showSettings: boolean;
  onToggleVisualization: () => void;
  onToggleSound: () => void;
  onToggleSettings: () => void;
  onReset: () => void;
}

function ControlButtons({
  showVisualization,
  soundEnabled,
  showSettings,
  onToggleVisualization,
  onToggleSound,
  onToggleSettings,
  onReset,
}: ControlButtonsProps) {
  const buttonClass = "p-2 rounded-lg transition-colors text-amber-100";
  const defaultClass = `${buttonClass} bg-stone-600 hover:bg-stone-500`;
  const activeClass = `${buttonClass} bg-amber-700 hover:bg-amber-600`;

  return (
    <div className="flex justify-end gap-2 mb-4">
      <button
        onClick={onToggleVisualization}
        className={showVisualization ? activeClass : defaultClass}
        title={showVisualization ? "Hide Visualization" : "Show Visualization"}
      >
        {showVisualization ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
      <button
        onClick={onToggleSound}
        className={defaultClass}
        title={soundEnabled ? "Mute" : "Unmute"}
      >
        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      <button
        onClick={onToggleSettings}
        className={showSettings ? activeClass : defaultClass}
        title="Settings"
      >
        <Settings size={18} />
      </button>
      <button
        onClick={onReset}
        className={defaultClass}
        title="Reset"
      >
        <RotateCcw size={18} />
      </button>
    </div>
  );
}

interface SettingsPanelProps {
  rotors: [RotorId, RotorId, RotorId];
  reflector: ReflectorId;
  plugboardPairs: string[];
  onRotorChange: (index: number, rotorId: RotorId) => void;
  onReflectorChange: (reflectorId: ReflectorId) => void;
  onPlugboardChange: (pairs: string[]) => void;
}

function SettingsPanel({
  rotors,
  reflector,
  plugboardPairs,
  onRotorChange,
  onReflectorChange,
  onPlugboardChange,
}: SettingsPanelProps) {
  const [plugboardInput, setPlugboardInput] = useState(plugboardPairs.join(" "));

  const handleApplyPlugboard = () => {
    const pairs = plugboardInput
      .toUpperCase()
      .split(/[\s,]+/)
      .filter((p) => p.length === 2 && /^[A-Z]{2}$/.test(p));
    onPlugboardChange(pairs);
  };

  const rotorLabels = ["Left", "Middle", "Right"] as const;
  const availableRotors = RotorFactory.getAvailableIds();
  const availableReflectors = ReflectorFactory.getAvailableIds();

  return (
    <div className="bg-stone-900/50 rounded-xl p-4 mb-4 border border-stone-600">
      <h3 className="text-amber-100 font-bold mb-3">Configuration</h3>

      {/* Rotor Selection */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {rotorLabels.map((label, idx) => (
          <div key={label}>
            <label className="text-amber-200/80 text-xs block mb-1">
              {label} Rotor
            </label>
            <select
              value={rotors[idx]}
              onChange={(e) => onRotorChange(idx, e.target.value as RotorId)}
              className="w-full bg-stone-700 text-amber-100 rounded px-2 py-1 border border-stone-500"
            >
              {availableRotors.map((id) => (
                <option key={id} value={id}>
                  Rotor {id}
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
          value={reflector}
          onChange={(e) => onReflectorChange(e.target.value as ReflectorId)}
          className="bg-stone-700 text-amber-100 rounded px-2 py-1 border border-stone-500"
        >
          {availableReflectors.map((id) => (
            <option key={id} value={id}>
              Reflector {id}
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
            onClick={handleApplyPlugboard}
            className="px-3 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded"
          >
            Apply
          </button>
        </div>
        {plugboardPairs.length > 0 && (
          <p className="text-amber-200/60 text-xs mt-1">
            Active: {plugboardPairs.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

interface RotorDisplayProps {
  positions: [string, string, string];
  rotorIds: [RotorId, RotorId, RotorId];
  onRotate: (index: number, direction: 1 | -1) => void;
}

function RotorDisplay({ positions, rotorIds, onRotate }: RotorDisplayProps) {
  return (
    <div className="flex justify-center gap-4 mb-6">
      {positions.map((position, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <button
            onClick={() => onRotate(idx, -1)}
            className="text-amber-300 hover:text-amber-100 text-lg font-bold"
            aria-label={`Rotate rotor ${idx + 1} backward`}
          >
            ^
          </button>
          <div className="w-14 h-16 bg-gradient-to-b from-stone-500 to-stone-600 rounded-lg border-2 border-stone-400 flex items-center justify-center shadow-inner">
            <span className="text-2xl font-mono font-bold text-amber-100">
              {position}
            </span>
          </div>
          <button
            onClick={() => onRotate(idx, 1)}
            className="text-amber-300 hover:text-amber-100 text-lg font-bold rotate-180"
            aria-label={`Rotate rotor ${idx + 1} forward`}
          >
            ^
          </button>
          <span className="text-amber-200/60 text-xs mt-1">{rotorIds[idx]}</span>
        </div>
      ))}
    </div>
  );
}

interface LampboardProps {
  litLamp: string | null;
}

function Lampboard({ litLamp }: LampboardProps) {
  return (
    <div className="bg-stone-900/50 rounded-xl p-4 mb-4">
      <div className="flex flex-col gap-2 items-center">
        {KEYBOARD_LAYOUT.rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="flex gap-1 justify-center"
            style={{ marginLeft: KEYBOARD_LAYOUT.offsets[rowIdx] }}
          >
            {row.split("").map((letter) => {
              const isLit = litLamp === letter;
              return (
                <div
                  key={letter}
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center 
                    font-mono font-bold text-sm transition-all duration-100
                    ${isLit
                      ? "bg-amber-300 text-stone-900 shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                      : "bg-stone-700 text-amber-100/50 border border-stone-600"
                    }
                  `}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface KeyboardProps {
  pressedKey: string | null;
  onKeyPress: (key: string) => void;
}

function Keyboard({ pressedKey, onKeyPress }: KeyboardProps) {
  return (
    <div className="bg-stone-900/30 rounded-xl p-4">
      <div className="flex flex-col gap-2 items-center">
        {KEYBOARD_LAYOUT.rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="flex gap-1 justify-center"
            style={{ marginLeft: KEYBOARD_LAYOUT.offsets[rowIdx] }}
          >
            {row.split("").map((letter) => {
              const isPressed = pressedKey === letter;
              return (
                <button
                  key={letter}
                  onMouseDown={() => onKeyPress(letter)}
                  className={`
                    w-10 h-10 rounded-lg font-mono font-bold text-sm transition-all
                    ${isPressed
                      ? "bg-amber-600 text-white transform scale-95"
                      : "bg-stone-600 text-amber-100 hover:bg-stone-500 shadow-md"
                    }
                  `}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TextDisplayProps {
  inputText: string;
  outputText: string;
}

function TextDisplay({ inputText, outputText }: TextDisplayProps) {
  return (
    <div className="mt-6 space-y-3">
      <div>
        <label className="text-amber-200/60 text-xs uppercase tracking-wider">
          Input
        </label>
        <div className="bg-stone-900 rounded-lg p-3 font-mono text-amber-100 min-h-[48px] break-all border border-stone-600">
          {inputText || (
            <span className="text-stone-500">Type or click keys...</span>
          )}
        </div>
      </div>
      <div>
        <label className="text-amber-200/60 text-xs uppercase tracking-wider">
          Output (Encrypted)
        </label>
        <div className="bg-stone-900 rounded-lg p-3 font-mono text-green-400 min-h-[48px] break-all border border-stone-600">
          {outputText || (
            <span className="text-stone-500">Encrypted text appears here...</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function EnigmaMachine() {
  const { state, actions } = useEnigma();

  const [showSettings, setShowSettings] = useState(false);
  const [showVisualization, setShowVisualization] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const clickSoundRef = useRef<HTMLAudioElement | null>(null);

  const playClick = useCallback(() => {
    if (soundEnabled && clickSoundRef.current) {
      clickSoundRef.current.currentTime = 0;
      clickSoundRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  const handleKeyPress = useCallback(
    (key: string) => {
      playClick();
      actions.processKey(key);
    },
    [playClick, actions]
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 flex flex-col items-center justify-center p-4">
      {/* Audio element for click sound */}
      <audio
        ref={clickSoundRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbGxsbGxsbGxsbGxsbGxsbGxsbGxs"
        preload="auto"
      />

      <header className="text-center mb-6">
        <h1
          className="text-4xl font-bold text-amber-100 tracking-wider"
          style={{ fontFamily: "serif" }}
        >
          ENIGMA M3
        </h1>
        <p className="text-amber-200/60 text-sm mt-1">Wehrmacht / Luftwaffe</p>
      </header>

      <div
        className={`
          flex gap-6 items-start justify-center w-full max-w-7xl
          ${showVisualization ? "flex-col xl:flex-row" : ""}
        `}
      >
        <main className="bg-gradient-to-b from-stone-700 to-stone-800 rounded-2xl p-6 shadow-2xl border-4 border-stone-600 max-w-2xl w-full">
          <ControlButtons
            showVisualization={showVisualization}
            soundEnabled={soundEnabled}
            showSettings={showSettings}
            onToggleVisualization={() => setShowVisualization((v) => !v)}
            onToggleSound={() => setSoundEnabled((s) => !s)}
            onToggleSettings={() => setShowSettings((s) => !s)}
            onReset={actions.reset}
          />

          {showSettings && (
            <SettingsPanel
              rotors={state.rotors}
              reflector={state.reflector}
              plugboardPairs={state.plugboardPairs}
              onRotorChange={actions.setRotor}
              onReflectorChange={actions.setReflector}
              onPlugboardChange={actions.setPlugboardPairs}
            />
          )}

          <RotorDisplay
            positions={state.positions}
            rotorIds={state.rotors}
            onRotate={actions.rotatePosition}
          />

          <Lampboard litLamp={state.litLamp} />

          <Keyboard
            pressedKey={state.pressedKey}
            onKeyPress={handleKeyPress}
          />

          <TextDisplay
            inputText={state.inputText}
            outputText={state.outputText}
          />
        </main>

        {showVisualization && (
          <aside className="w-full max-w-xl xl:max-w-lg flex-shrink-0">
            <SignalPathVisualization
              signalPath={state.currentSignalPath}
              rotorTypes={state.rotors}
              rotorPositions={state.positions}
              reflectorType={state.reflector}
              plugboardPairs={state.plugboardPairs}
            />
          </aside>
        )}
      </div>

      <footer className="mt-6 text-center text-amber-200/40 text-xs max-w-md">
        <p>
          The Enigma machine was used by Nazi Germany during WWII to encrypt
          military communications. Its code was famously broken by Alan Turing
          and the team at Bletchley Park.
        </p>
      </footer>
    </div>
  );
}
