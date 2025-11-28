import { useMemo, type ReactNode } from "react";
import {
  ALPHABET,
  RotorFactory,
  ReflectorFactory,
  type SignalPath,
  type RotorId,
  type ReflectorId,
} from "../lib/enigma";

interface Props {
  signalPath: SignalPath | null;
  rotorTypes: readonly [RotorId, RotorId, RotorId];
  rotorPositions: readonly [string, string, string];
  reflectorType: ReflectorId;
  plugboardPairs: readonly string[];
}

interface Column {
  id: string;
  label: string;
  x: number;
}

interface RotorWiringData {
  type: RotorId;
  position: string;
  wiring: string;
  positionOffset: number;
}

const LETTER_HEIGHT = 18;
const LETTER_RADIUS = 7;
const TOTAL_HEIGHT = 26 * LETTER_HEIGHT + 40;
const SVG_WIDTH = 480;

const COLORS = {
  active: "#fbbf24",
  inactive: "#57534e",
  background: "#44403c",
  inputHighlight: "#22c55e",
  outputHighlight: "#ef4444",
  text: "#a8a29e",
  textHighlight: "#1c1917",
  header: "#fef3c7",
};

class HighlightManager {
  private highlights = new Map<string, Set<number>>();

  add(columnId: string, letterIndex: number): void {
    if (!this.highlights.has(columnId)) {
      this.highlights.set(columnId, new Set());
    }
    this.highlights.get(columnId)!.add(letterIndex);
  }

  isHighlighted(columnId: string, letterIndex: number): boolean {
    return this.highlights.get(columnId)?.has(letterIndex) ?? false;
  }

  static fromSignalPath(signalPath: SignalPath | null): HighlightManager {
    const manager = new HighlightManager();
    if (!signalPath) return manager;

    for (const step of signalPath.steps) {
      switch (step.component) {
        case "input":
          manager.add("input", step.inputIndex);
          break;
        case "plugboard_in":
          manager.add("input", step.inputIndex);
          manager.add("plugboard", step.outputIndex);
          break;
        case "rotor_r":
          manager.add("plugboard", step.inputIndex);
          manager.add("rotor_r", step.outputIndex);
          break;
        case "rotor_m":
          manager.add("rotor_r", step.inputIndex);
          manager.add("rotor_m", step.outputIndex);
          break;
        case "rotor_l":
          manager.add("rotor_m", step.inputIndex);
          manager.add("rotor_l", step.outputIndex);
          break;
        case "reflector":
          manager.add("rotor_l", step.inputIndex);
          manager.add("reflector", step.inputIndex);
          manager.add("reflector", step.outputIndex);
          break;
        case "rotor_l_back":
          manager.add("reflector", step.inputIndex);
          manager.add("rotor_l", step.outputIndex);
          break;
        case "rotor_m_back":
          manager.add("rotor_l", step.inputIndex);
          manager.add("rotor_m", step.outputIndex);
          break;
        case "rotor_r_back":
          manager.add("rotor_m", step.inputIndex);
          manager.add("rotor_r", step.outputIndex);
          break;
        case "plugboard_out":
          manager.add("rotor_r", step.inputIndex);
          manager.add("plugboard", step.outputIndex);
          break;
        case "output":
          manager.add("plugboard", step.inputIndex);
          manager.add("input", step.outputIndex);
          break;
      }
    }

    return manager;
  }
}

class SvgRenderer {
  private signalPath: SignalPath | null;

  constructor(signalPath: SignalPath | null) {
    this.signalPath = signalPath;
  }

  getY(letterIndex: number): number {
    return 30 + letterIndex * LETTER_HEIGHT;
  }

  isConnectionActive(
    component: string,
    inputIndex: number,
    outputIndex: number
  ): boolean {
    return (
      this.signalPath?.steps.some(
        (s) =>
          s.component === component &&
          s.inputIndex === inputIndex &&
          s.outputIndex === outputIndex
      ) ?? false
    );
  }

  createLine(
    key: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    isActive: boolean
  ): ReactNode {
    return (
      <line
        key={key}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isActive ? COLORS.active : COLORS.inactive}
        strokeWidth={isActive ? 2 : 0.5}
        opacity={isActive ? 1 : 0.3}
        strokeLinecap="round"
      />
    );
  }

  createArc(
    key: string,
    x: number,
    y1: number,
    y2: number,
    isActive: boolean
  ): ReactNode {
    const midY = (y1 + y2) / 2;
    const curveX = x + 15 + Math.abs((y2 - y1) / LETTER_HEIGHT) * 1.5;

    return (
      <path
        key={key}
        d={`M ${x + 20} ${y1} Q ${curveX} ${midY} ${x + 20} ${y2}`}
        fill="none"
        stroke={isActive ? COLORS.active : COLORS.inactive}
        strokeWidth={isActive ? 2 : 0.5}
        opacity={isActive ? 1 : 0.3}
      />
    );
  }
}

function getColumns(rotorTypes: readonly [RotorId, RotorId, RotorId], reflectorType: ReflectorId): Column[] {
  return [
    { id: "input", label: "IN", x: 20 },
    { id: "plugboard", label: "PLUG", x: 80 },
    { id: "rotor_r", label: String(rotorTypes[2]), x: 160 },
    { id: "rotor_m", label: String(rotorTypes[1]), x: 240 },
    { id: "rotor_l", label: String(rotorTypes[0]), x: 320 },
    { id: "reflector", label: `UKW-${reflectorType}`, x: 400 },
  ];
}

function getRotorWirings(
  rotorTypes: readonly [RotorId, RotorId, RotorId],
  rotorPositions: readonly [string, string, string]
): RotorWiringData[] {
  return rotorTypes.map((type, idx) => {
    const config = RotorFactory.getConfig(type);
    const positionIndex = rotorPositions[idx].charCodeAt(0) - 65;
    return {
      type,
      position: rotorPositions[idx],
      wiring: config.wiring,
      positionOffset: positionIndex,
    };
  });
}

function buildPlugboardMap(pairs: readonly string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of pairs) {
    if (pair.length === 2) {
      map.set(pair[0], pair[1]);
      map.set(pair[1], pair[0]);
    }
  }
  return map;
}

function renderRotorWiring(
  renderer: SvgRenderer,
  rotorIdx: number,
  colX: number,
  wiring: string,
  positionOffset: number,
  signalPath: SignalPath | null
): ReactNode[] {
  const lines: ReactNode[] = [];
  const componentId =
    rotorIdx === 0 ? "rotor_r" : rotorIdx === 1 ? "rotor_m" : "rotor_l";
  const backComponentId =
    rotorIdx === 0 ? "rotor_r_back" : rotorIdx === 1 ? "rotor_m_back" : "rotor_l_back";

  for (let i = 0; i < 26; i++) {
    const offsetIndex = (i + positionOffset + 26) % 26;
    const outputLetter = wiring[offsetIndex];
    const outputIdx = outputLetter.charCodeAt(0) - 65;
    const finalOutputIdx = (outputIdx - positionOffset + 26) % 26;

    const y1 = renderer.getY(i);
    const y2 = renderer.getY(finalOutputIdx);

    const isForwardActive = renderer.isConnectionActive(componentId, i, finalOutputIdx);
    const isBackActive = signalPath?.steps.some(
      (s) =>
        s.component === backComponentId &&
        s.outputIndex === i &&
        s.inputIndex === finalOutputIdx
    );

    lines.push(
      renderer.createLine(
        `rotor-${rotorIdx}-wire-${i}`,
        colX - 20,
        y1,
        colX + 20,
        y2,
        isForwardActive || isBackActive || false
      )
    );
  }

  return lines;
}

function renderPlugboardConnections(
  renderer: SvgRenderer,
  columns: Column[],
  plugboardMap: Map<string, string>,
  signalPath: SignalPath | null
): ReactNode[] {
  const lines: ReactNode[] = [];

  for (let i = 0; i < 26; i++) {
    const letter = ALPHABET[i];
    const mappedLetter = plugboardMap.get(letter) ?? letter;
    const mappedIdx = mappedLetter.charCodeAt(0) - 65;

    const isActiveIn = signalPath?.steps.some(
      (s) => s.component === "plugboard_in" && s.inputIndex === i
    );
    const isActiveOut = signalPath?.steps.some(
      (s) => s.component === "plugboard_out" && s.outputIndex === i
    );

    const x1 = columns[0].x + 25;
    const x2 = columns[1].x - 25;

    lines.push(
      <line
        key={`plug-${i}`}
        x1={x1}
        y1={renderer.getY(i)}
        x2={x2}
        y2={renderer.getY(mappedIdx)}
        stroke={isActiveIn || isActiveOut ? COLORS.active : COLORS.inactive}
        strokeWidth={isActiveIn || isActiveOut ? 2.5 : 0.5}
        opacity={isActiveIn || isActiveOut ? 1 : 0.15}
        strokeLinecap="round"
      />
    );
  }

  return lines;
}

function renderInterRotorConnections(
  renderer: SvgRenderer,
  columns: Column[],
  signalPath: SignalPath | null
): ReactNode[] {
  const lines: ReactNode[] = [];

  const connectionConfigs = [
    { from: 1, to: 2, component: "rotor_r", backComponent: "rotor_r_back", prefix: "plug-rotor-r" },
    { from: 2, to: 3, component: "rotor_m", backComponent: "rotor_m_back", prefix: "rotor-r-m" },
    { from: 3, to: 4, component: "rotor_l", backComponent: "rotor_l_back", prefix: "rotor-m-l" },
    { from: 4, to: 5, component: "reflector", backComponent: "rotor_l_back", prefix: "rotor-l-ref" },
  ];

  for (const config of connectionConfigs) {
    for (let i = 0; i < 26; i++) {
      const isActive = signalPath?.steps.some(
        (s) =>
          (s.component === config.component && s.inputIndex === i) ||
          (s.component === config.backComponent && 
            (config.component === "reflector" ? s.inputIndex === i : s.outputIndex === i))
      );

      const x1 = columns[config.from].x + 25;
      const x2 = columns[config.to].x - 25;

      lines.push(
        <line
          key={`${config.prefix}-${i}`}
          x1={x1}
          y1={renderer.getY(i)}
          x2={x2}
          y2={renderer.getY(i)}
          stroke={isActive ? COLORS.active : COLORS.inactive}
          strokeWidth={isActive ? 2.5 : 0.5}
          opacity={isActive ? 1 : 0.15}
          strokeLinecap="round"
        />
      );
    }
  }

  return lines;
}

function renderReflectorWiring(
  renderer: SvgRenderer,
  colX: number,
  reflectorWiring: string,
  signalPath: SignalPath | null
): ReactNode[] {
  const lines: ReactNode[] = [];
  const drawnPairs = new Set<string>();

  for (let i = 0; i < 26; i++) {
    const outputLetter = reflectorWiring[i];
    const outputIdx = outputLetter.charCodeAt(0) - 65;

    const pairKey = [i, outputIdx].sort().join("-");
    if (drawnPairs.has(pairKey)) continue;
    drawnPairs.add(pairKey);

    const y1 = renderer.getY(i);
    const y2 = renderer.getY(outputIdx);

    const isActive = signalPath?.steps.some(
      (s) =>
        s.component === "reflector" &&
        (s.inputIndex === i || s.outputIndex === i)
    );

    lines.push(renderer.createArc(`ref-${i}-${outputIdx}`, colX, y1, y2, isActive || false));
  }

  return lines;
}

function renderLetterColumns(
  columns: Column[],
  highlightManager: HighlightManager,
  signalPath: SignalPath | null,
  renderer: SvgRenderer
): ReactNode {
  return columns.map((col) => (
    <g key={`letters-${col.id}`}>
      {ALPHABET.split("").map((letter, i) => {
        const isHighlighted = highlightManager.isHighlighted(col.id, i);
        const isInput = col.id === "input" && signalPath?.inputLetter === letter;
        const isOutput = col.id === "input" && signalPath?.outputLetter === letter;

        let strokeColor = COLORS.inactive;
        if (isInput) strokeColor = COLORS.inputHighlight;
        else if (isOutput) strokeColor = COLORS.outputHighlight;
        else if (isHighlighted) strokeColor = COLORS.active;

        return (
          <g key={`${col.id}-${letter}`}>
            <circle
              cx={col.x}
              cy={renderer.getY(i)}
              r={LETTER_RADIUS}
              fill={isHighlighted ? COLORS.active : COLORS.background}
              stroke={strokeColor}
              strokeWidth={isInput || isOutput ? 2 : 1}
            />
            <text
              x={col.x}
              y={renderer.getY(i) + 3}
              fill={isHighlighted ? COLORS.textHighlight : COLORS.text}
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
  ));
}

export function SignalPathVisualization({
  signalPath,
  rotorTypes,
  rotorPositions,
  reflectorType,
  plugboardPairs,
}: Props) {
  // Memoized data
  const columns = useMemo(
    () => getColumns(rotorTypes, reflectorType),
    [rotorTypes, reflectorType]
  );

  const rotorWirings = useMemo(
    () => getRotorWirings(rotorTypes, rotorPositions),
    [rotorTypes, rotorPositions]
  );

  const reflectorWiring = useMemo(
    () => ReflectorFactory.getConfig(reflectorType).wiring,
    [reflectorType]
  );

  const plugboardMap = useMemo(
    () => buildPlugboardMap(plugboardPairs),
    [plugboardPairs]
  );

  const highlightManager = useMemo(
    () => HighlightManager.fromSignalPath(signalPath),
    [signalPath]
  );

  const renderer = useMemo(() => new SvgRenderer(signalPath), [signalPath]);

  return (
    <div className="bg-stone-900/80 rounded-xl p-4 border border-stone-600">
      <h3 className="text-amber-100 font-bold mb-3 text-center text-sm">
        Signal Path Visualization
      </h3>

      <div className="flex justify-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-amber-200/80">Active Signal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-stone-600" />
          <span className="text-amber-200/80">Wiring</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={SVG_WIDTH}
          height={TOTAL_HEIGHT}
          className="mx-auto"
          style={{ minWidth: `${SVG_WIDTH}px` }}
        >
          {columns.map((col) => (
            <g key={col.id}>
              <text
                x={col.x}
                y={15}
                fill={COLORS.header}
                fontSize="10"
                textAnchor="middle"
                fontWeight="bold"
              >
                {col.label}
              </text>
              {["rotor_r", "rotor_m", "rotor_l"].includes(col.id) && (
                <text
                  x={col.x}
                  y={TOTAL_HEIGHT - 5}
                  fill={COLORS.active}
                  fontSize="9"
                  textAnchor="middle"
                >
                  {col.id === "rotor_r"
                    ? rotorPositions[2]
                    : col.id === "rotor_m"
                    ? rotorPositions[1]
                    : rotorPositions[0]}
                </text>
              )}
            </g>
          ))}

          <g className="connections">
            {renderPlugboardConnections(renderer, columns, plugboardMap, signalPath)}
            {renderInterRotorConnections(renderer, columns, signalPath)}
            {renderRotorWiring(renderer, 0, columns[2].x, rotorWirings[2].wiring, rotorWirings[2].positionOffset, signalPath)}
            {renderRotorWiring(renderer, 1, columns[3].x, rotorWirings[1].wiring, rotorWirings[1].positionOffset, signalPath)}
            {renderRotorWiring(renderer, 2, columns[4].x, rotorWirings[0].wiring, rotorWirings[0].positionOffset, signalPath)}
            {renderReflectorWiring(renderer, columns[5].x, reflectorWiring, signalPath)}
          </g>

          {renderLetterColumns(columns, highlightManager, signalPath, renderer)}

          {signalPath && (
            <>
              <text
                x="240"
                y={TOTAL_HEIGHT - 18}
                fill={COLORS.inputHighlight}
                fontSize="8"
                textAnchor="middle"
              >
                Forward: {signalPath.inputLetter} → Plugboard → Rotors → Reflector
              </text>
              <text
                x="240"
                y={TOTAL_HEIGHT - 8}
                fill={COLORS.outputHighlight}
                fontSize="8"
                textAnchor="middle"
              >
                Return: Reflector → Rotors → Plugboard → {signalPath.outputLetter}
              </text>
            </>
          )}
        </svg>
      </div>

      <div className="mt-3 p-2 bg-stone-800 rounded-lg text-center">
        {signalPath ? (
          <>
            <span className="text-green-400 font-mono font-bold">
              {signalPath.inputLetter}
            </span>
            <span className="text-amber-200/60 mx-2">→</span>
            <span className="text-red-400 font-mono font-bold">
              {signalPath.outputLetter}
            </span>
          </>
        ) : (
          <span className="text-stone-500 text-sm">
            Press a key to see the signal path
          </span>
        )}
      </div>
    </div>
  );
}
