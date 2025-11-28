import { useMemo, type ReactNode } from "react";
import {
  ALPHABET,
  ROTOR_CONFIGS,
  REFLECTOR_CONFIGS,
  type SignalPath,
  type RotorType,
  type ReflectorType,
} from "../lib/enigma";

interface Props {
  signalPath: SignalPath | null;
  rotorTypes: [RotorType, RotorType, RotorType];
  rotorPositions: [string, string, string];
  reflectorType: ReflectorType;
  plugboardPairs: string[];
}

const LETTER_HEIGHT = 18;
const TOTAL_HEIGHT = 26 * LETTER_HEIGHT + 40;

export function SignalPathVisualization({
  signalPath,
  rotorTypes,
  rotorPositions,
  reflectorType,
  plugboardPairs,
}: Props) {
  // Get rotor wirings
  const rotorWirings = useMemo(() => {
    return rotorTypes.map((type, idx) => {
      const rotor = ROTOR_CONFIGS[type].factory();
      rotor.setPosicaoPorLetra(rotorPositions[idx]);
      return {
        type,
        position: rotorPositions[idx],
        wiring: rotor.wiring,
        positionOffset: rotor.posicao,
      };
    });
  }, [rotorTypes, rotorPositions]);

  const reflectorWiring = useMemo(() => {
    return REFLECTOR_CONFIGS[reflectorType].factory().wiring;
  }, [reflectorType]);

  // Build plugboard map
  const plugboardMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const pair of plugboardPairs) {
      if (pair.length === 2) {
        map.set(pair[0], pair[1]);
        map.set(pair[1], pair[0]);
      }
    }
    return map;
  }, [plugboardPairs]);

  // Calculate positions
  const columns = [
    { id: "input", label: "IN", x: 20 },
    { id: "plugboard", label: "PLUG", x: 80 },
    { id: "rotor_r", label: rotorTypes[2], x: 160 },
    { id: "rotor_m", label: rotorTypes[1], x: 240 },
    { id: "rotor_l", label: rotorTypes[0], x: 320 },
    { id: "reflector", label: `UKW-${reflectorType}`, x: 400 },
  ];

  const getY = (letterIndex: number) => 30 + letterIndex * LETTER_HEIGHT;

  // Get highlighted letters
  const highlightedLetters = useMemo(() => {
    if (!signalPath) return new Map<string, Set<number>>();
    const highlights = new Map<string, Set<number>>();
    
    const addHighlight = (col: string, idx: number) => {
      if (!highlights.has(col)) highlights.set(col, new Set());
      highlights.get(col)!.add(idx);
    };

    for (const step of signalPath.steps) {
      switch (step.component) {
        case "input":
          addHighlight("input", step.inputIndex);
          break;
        case "plugboard_in":
          addHighlight("input", step.inputIndex);
          addHighlight("plugboard", step.outputIndex);
          break;
        case "rotor_r":
          addHighlight("plugboard", step.inputIndex);
          addHighlight("rotor_r", step.outputIndex);
          break;
        case "rotor_m":
          addHighlight("rotor_r", step.inputIndex);
          addHighlight("rotor_m", step.outputIndex);
          break;
        case "rotor_l":
          addHighlight("rotor_m", step.inputIndex);
          addHighlight("rotor_l", step.outputIndex);
          break;
        case "reflector":
          addHighlight("rotor_l", step.inputIndex);
          addHighlight("reflector", step.inputIndex);
          addHighlight("reflector", step.outputIndex);
          break;
        case "rotor_l_back":
          addHighlight("reflector", step.inputIndex);
          addHighlight("rotor_l", step.outputIndex);
          break;
        case "rotor_m_back":
          addHighlight("rotor_l", step.inputIndex);
          addHighlight("rotor_m", step.outputIndex);
          break;
        case "rotor_r_back":
          addHighlight("rotor_m", step.inputIndex);
          addHighlight("rotor_r", step.outputIndex);
          break;
        case "plugboard_out":
          addHighlight("rotor_r", step.inputIndex);
          addHighlight("plugboard", step.outputIndex);
          break;
        case "output":
          addHighlight("plugboard", step.inputIndex);
          addHighlight("input", step.outputIndex);
          break;
      }
    }
    return highlights;
  }, [signalPath]);

  const isLetterHighlighted = (colId: string, letterIdx: number) => {
    return highlightedLetters.get(colId)?.has(letterIdx) ?? false;
  };

  // Render rotor internal wiring
  const renderRotorWiring = (
    rotorIdx: number,
    colX: number,
    wiring: string,
    positionOffset: number
  ) => {
    const lines: ReactNode[] = [];
    
    for (let i = 0; i < 26; i++) {
      const inputIdx = i;
      const idxComOffset = (inputIdx + positionOffset + 26) % 26;
      const outputLetter = wiring[idxComOffset];
      const outputIdx = outputLetter.charCodeAt(0) - 65;
      const finalOutputIdx = (outputIdx - positionOffset + 26) % 26;
      
      const y1 = getY(i);
      const y2 = getY(finalOutputIdx);
      
      // Check if this connection is active
      const componentId = rotorIdx === 0 ? "rotor_r" : rotorIdx === 1 ? "rotor_m" : "rotor_l";
      const isForwardActive = signalPath?.steps.some(
        s => s.component === componentId && s.inputIndex === i && s.outputIndex === finalOutputIdx
      );
      const backComponentId = rotorIdx === 0 ? "rotor_r_back" : rotorIdx === 1 ? "rotor_m_back" : "rotor_l_back";
      const isBackActive = signalPath?.steps.some(
        s => s.component === backComponentId && s.outputIndex === i && s.inputIndex === finalOutputIdx
      );
      
      const isActive = isForwardActive || isBackActive;
      
      lines.push(
        <line
          key={`rotor-${rotorIdx}-wire-${i}`}
          x1={colX - 20}
          y1={y1}
          x2={colX + 20}
          y2={y2}
          stroke={isActive ? "#fbbf24" : "#57534e"}
          strokeWidth={isActive ? 2 : 0.5}
          opacity={isActive ? 1 : 0.3}
        />
      );
    }
    return lines;
  };

  // Render connection between columns
  const renderConnection = (
    fromCol: number,
    toCol: number,
    fromIdx: number,
    toIdx: number,
    isActive: boolean,
    key: string
  ) => {
    const x1 = columns[fromCol].x + 25;
    const x2 = columns[toCol].x - 25;
    const y1 = getY(fromIdx);
    const y2 = getY(toIdx);
    
    return (
      <line
        key={key}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isActive ? "#fbbf24" : "#57534e"}
        strokeWidth={isActive ? 2.5 : 0.5}
        opacity={isActive ? 1 : 0.15}
        strokeLinecap="round"
      />
    );
  };

  // Render plugboard connections
  const renderPlugboardConnections = () => {
    const lines: ReactNode[] = [];
    
    // Connection from input to plugboard (all 26 letters)
    for (let i = 0; i < 26; i++) {
      const letter = ALPHABET[i];
      const mappedLetter = plugboardMap.get(letter) ?? letter;
      const mappedIdx = mappedLetter.charCodeAt(0) - 65;
      
      const isActiveIn = signalPath?.steps.some(
        s => s.component === "plugboard_in" && s.inputIndex === i
      );
      const isActiveOut = signalPath?.steps.some(
        s => s.component === "plugboard_out" && s.outputIndex === i
      );
      
      lines.push(
        renderConnection(0, 1, i, mappedIdx, isActiveIn || isActiveOut || false, `plug-${i}`)
      );
    }
    
    return lines;
  };

  // Render inter-rotor connections
  const renderInterRotorConnections = () => {
    const lines: ReactNode[] = [];
    
    // Plugboard to Rotor R
    for (let i = 0; i < 26; i++) {
      const isActive = signalPath?.steps.some(
        s => (s.component === "rotor_r" && s.inputIndex === i) ||
             (s.component === "rotor_r_back" && s.outputIndex === i)
      );
      lines.push(renderConnection(1, 2, i, i, isActive || false, `plug-rotor-r-${i}`));
    }
    
    // Rotor R to Rotor M
    for (let i = 0; i < 26; i++) {
      const isActive = signalPath?.steps.some(
        s => (s.component === "rotor_m" && s.inputIndex === i) ||
             (s.component === "rotor_m_back" && s.outputIndex === i)
      );
      lines.push(renderConnection(2, 3, i, i, isActive || false, `rotor-r-m-${i}`));
    }
    
    // Rotor M to Rotor L
    for (let i = 0; i < 26; i++) {
      const isActive = signalPath?.steps.some(
        s => (s.component === "rotor_l" && s.inputIndex === i) ||
             (s.component === "rotor_l_back" && s.outputIndex === i)
      );
      lines.push(renderConnection(3, 4, i, i, isActive || false, `rotor-m-l-${i}`));
    }
    
    // Rotor L to Reflector
    for (let i = 0; i < 26; i++) {
      const isActive = signalPath?.steps.some(
        s => (s.component === "reflector" && s.inputIndex === i) ||
             (s.component === "rotor_l_back" && s.inputIndex === i)
      );
      lines.push(renderConnection(4, 5, i, i, isActive || false, `rotor-l-ref-${i}`));
    }
    
    return lines;
  };

  // Render reflector internal wiring
  const renderReflectorWiring = () => {
    const lines: ReactNode[] = [];
    const colX = columns[5].x;
    const drawnPairs = new Set<string>();
    
    for (let i = 0; i < 26; i++) {
      const outputLetter = reflectorWiring[i];
      const outputIdx = outputLetter.charCodeAt(0) - 65;
      
      // Only draw each pair once
      const pairKey = [i, outputIdx].sort().join("-");
      if (drawnPairs.has(pairKey)) continue;
      drawnPairs.add(pairKey);
      
      const y1 = getY(i);
      const y2 = getY(outputIdx);
      
      const isActive = signalPath?.steps.some(
        s => s.component === "reflector" && (s.inputIndex === i || s.outputIndex === i)
      );
      
      // Draw arc for reflector
      const midY = (y1 + y2) / 2;
      const curveX = colX + 15 + Math.abs(outputIdx - i) * 1.5;
      
      lines.push(
        <path
          key={`ref-${i}-${outputIdx}`}
          d={`M ${colX + 20} ${y1} Q ${curveX} ${midY} ${colX + 20} ${y2}`}
          fill="none"
          stroke={isActive ? "#fbbf24" : "#57534e"}
          strokeWidth={isActive ? 2 : 0.5}
          opacity={isActive ? 1 : 0.3}
        />
      );
    }
    return lines;
  };

  return (
    <div className="bg-stone-900/80 rounded-xl p-4 border border-stone-600">
      <h3 className="text-amber-100 font-bold mb-3 text-center text-sm">
        Signal Path Visualization
      </h3>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <span className="text-amber-200/80">Active Signal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-stone-600"></div>
          <span className="text-amber-200/80">Wiring</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width="480"
          height={TOTAL_HEIGHT}
          className="mx-auto"
          style={{ minWidth: "480px" }}
        >
          {/* Background */}
          <rect x="0" y="0" width="480" height={TOTAL_HEIGHT} fill="transparent" />

          {/* Column headers */}
          {columns.map((col) => (
            <g key={col.id}>
              <text
                x={col.x}
                y={15}
                fill="#fef3c7"
                fontSize="10"
                textAnchor="middle"
                fontWeight="bold"
              >
                {col.label}
              </text>
              {/* Position indicator for rotors */}
              {(col.id === "rotor_r" || col.id === "rotor_m" || col.id === "rotor_l") && (
                <text
                  x={col.x}
                  y={TOTAL_HEIGHT - 5}
                  fill="#fbbf24"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {col.id === "rotor_r" ? rotorPositions[2] : col.id === "rotor_m" ? rotorPositions[1] : rotorPositions[0]}
                </text>
              )}
            </g>
          ))}

          {/* Render all connections first (behind letters) */}
          <g className="connections">
            {renderPlugboardConnections()}
            {renderInterRotorConnections()}
            {renderRotorWiring(0, columns[2].x, rotorWirings[2].wiring, rotorWirings[2].positionOffset)}
            {renderRotorWiring(1, columns[3].x, rotorWirings[1].wiring, rotorWirings[1].positionOffset)}
            {renderRotorWiring(2, columns[4].x, rotorWirings[0].wiring, rotorWirings[0].positionOffset)}
            {renderReflectorWiring()}
          </g>

          {/* Letter columns */}
          {columns.map((col) => (
            <g key={`letters-${col.id}`}>
              {ALPHABET.split("").map((letter, i) => {
                const isHighlighted = isLetterHighlighted(col.id, i);
                const isInput = col.id === "input" && signalPath?.inputLetter === letter;
                const isOutput = col.id === "input" && signalPath?.outputLetter === letter;
                
                return (
                  <g key={`${col.id}-${letter}`}>
                    <circle
                      cx={col.x}
                      cy={getY(i)}
                      r={7}
                      fill={isHighlighted ? "#fbbf24" : "#44403c"}
                      stroke={isInput ? "#22c55e" : isOutput ? "#ef4444" : isHighlighted ? "#fbbf24" : "#57534e"}
                      strokeWidth={isInput || isOutput ? 2 : 1}
                    />
                    <text
                      x={col.x}
                      y={getY(i) + 3}
                      fill={isHighlighted ? "#1c1917" : "#a8a29e"}
                      fontSize="8"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight={isHighlighted ? "bold" : "normal"}
                    >
                      {letter}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}

          {/* Direction arrows */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="#fbbf24" />
            </marker>
          </defs>
          
          {signalPath && (
            <>
              {/* Forward path indicator */}
              <text x="240" y={TOTAL_HEIGHT - 18} fill="#22c55e" fontSize="8" textAnchor="middle">
                Forward: {signalPath.inputLetter} → Plugboard → Rotors → Reflector
              </text>
              {/* Backward path indicator */}
              <text x="240" y={TOTAL_HEIGHT - 8} fill="#ef4444" fontSize="8" textAnchor="middle">
                Return: Reflector → Rotors → Plugboard → {signalPath.outputLetter}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Current signal info */}
      {signalPath && (
        <div className="mt-3 p-2 bg-stone-800 rounded-lg text-center">
          <span className="text-green-400 font-mono font-bold">{signalPath.inputLetter}</span>
          <span className="text-amber-200/60 mx-2">→</span>
          <span className="text-red-400 font-mono font-bold">{signalPath.outputLetter}</span>
        </div>
      )}

      {!signalPath && (
        <div className="mt-3 p-2 bg-stone-800 rounded-lg text-center text-stone-500 text-sm">
          Press a key to see the signal path
        </div>
      )}
    </div>
  );
}
