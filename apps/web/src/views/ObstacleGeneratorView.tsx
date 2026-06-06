import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ObstacleInput, Point } from '@dnd/shared';
import { useSession } from '../useSession.js';
import { useGameStore } from '../store.js';

type DrawTool = 'polygon' | 'rectangle' | 'line' | 'circle';
type ObstacleType = 'blocks_movement' | 'blocks_vision' | 'blocks_both';
type EditorMode = 'draw' | 'select';
type GridKind = 'none' | 'square' | 'hex';

const TYPE_COLOR: Record<ObstacleType, string> = {
  blocks_movement: '#ef4444',
  blocks_vision: '#eab308',
  blocks_both: '#f97316',
};

const TYPE_LABEL: Record<ObstacleType, string> = {
  blocks_movement: 'Movement',
  blocks_vision: 'Vision',
  blocks_both: 'Both',
};

// --- hex helpers ---

function hexVertices(cx: number, cy: number, size: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // pointy-top
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`;
  }).join(' ');
}

function snapToHex(pt: Point, size: number): Point {
  // Convert pixel → fractional axial → round → pixel (pointy-top layout)
  const q = (pt.x * (Math.sqrt(3) / 3) - pt.y / 3) / size;
  const r = (pt.y * 2) / 3 / size;
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return {
    x: Math.round(size * Math.sqrt(3) * (rq + rr / 2)),
    y: Math.round(size * 1.5 * rr),
  };
}

// --- main component ---

export function ObstacleGeneratorView() {
  const sessionId = useSession('dm');
  const connected = useGameStore((s) => s.connected);
  const state = useGameStore((s) => s.state);
  const activeMap = useGameStore((s) => s.activeMap)();
  const loadObstacles = useGameStore((s) => s.loadObstacles);

  const [obstacles, setObstacles] = useState<ObstacleInput[]>([]);
  const [mode, setMode] = useState<EditorMode>('draw');
  const [tool, setTool] = useState<DrawTool>('polygon');
  const [obstacleType, setObstacleType] = useState<ObstacleType>('blocks_both');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  // Standalone canvas dimensions — only editable when no session map is connected.
  const [standaloneW, setStandaloneW] = useState(1200);
  const [standaloneH, setStandaloneH] = useState(800);

  const [gridKind, setGridKind] = useState<GridKind>('none');
  const [gridSize, setGridSize] = useState(50);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    index: number;
    startPt: Point;    // raw SVG coords at drag start
    origPoints: Point[];
    moved: boolean;
  } | null>(null);

  // Sync grid defaults from active map when it loads
  useEffect(() => {
    if (!activeMap) return;
    if (activeMap.gridType !== 'continuous') setGridKind(activeMap.gridType as GridKind);
    setGridSize(activeMap.gridSize);
  }, [activeMap?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Session map dimensions take priority: obstacles must be in the same logical
  // coordinate space that MapScene uses (0..map.width × 0..map.height).
  // When standalone, use the user-set canvas size (default 1200×800).
  const mapWidth = activeMap?.width ?? standaloneW;
  const mapHeight = activeMap?.height ?? standaloneH;
  const imageUrl = localImageUrl ?? activeMap?.imageUrl ?? null;

  // Correct SVG coordinate transform that handles preserveAspectRatio letterboxing
  const getSVGPt = (e: { clientX: number; clientY: number }): Point => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const t = pt.matrixTransform(ctm.inverse());
    return { x: t.x, y: t.y };
  };

  const snapPt = (pt: Point): Point => {
    if (gridKind === 'square') {
      return {
        x: Math.round(pt.x / gridSize) * gridSize,
        y: Math.round(pt.y / gridSize) * gridSize,
      };
    }
    if (gridKind === 'hex') return snapToHex(pt, gridSize);
    return { x: Math.round(pt.x), y: Math.round(pt.y) };
  };

  // ---- event handlers ----

  const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode === 'select') { setSelectedIndex(null); return; }
    if (e.detail >= 2) return; // handled by dblclick
    const pt = snapPt(getSVGPt(e));

    if (tool === 'polygon') {
      setCurrentPoints((prev) => [...prev, pt]);
      return;
    }
    // 2-click tools
    if (currentPoints.length === 0) {
      setCurrentPoints([pt]);
    } else {
      const p1 = currentPoints[0];
      let points: Point[];
      if (tool === 'rectangle') {
        points = [p1, { x: pt.x, y: p1.y }, pt, { x: p1.x, y: pt.y }];
      } else {
        points = [p1, pt];
      }
      setObstacles((prev) => [...prev, { type: obstacleType, shape: tool, points }]);
      setCurrentPoints([]);
    }
  };

  const handleSVGDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== 'draw' || tool !== 'polygon') return;
    e.preventDefault();
    const pt = snapPt(getSVGPt(e));
    const finalPoints = [...currentPoints, pt];
    if (finalPoints.length >= 3) {
      setObstacles((prev) => [...prev, { type: obstacleType, shape: 'polygon', points: finalPoints }]);
      setCurrentPoints([]);
    }
  };

  const handleSVGPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const raw = getSVGPt(e);
    setMousePos(snapPt(raw));

    const drag = dragRef.current;
    if (!drag) return;
    const dx = raw.x - drag.startPt.x;
    const dy = raw.y - drag.startPt.y;
    if (!drag.moved && Math.hypot(dx, dy) > 3) drag.moved = true;
    if (drag.moved) {
      setObstacles((prev) => {
        const next = [...prev];
        next[drag.index] = {
          ...next[drag.index],
          points: drag.origPoints.map((p) => ({ x: Math.round(p.x + dx), y: Math.round(p.y + dy) })),
        };
        return next;
      });
    }
  };

  const handleSVGPointerLeave = () => {
    setMousePos(null);
    dragRef.current = null;
  };

  const handleSVGPointerUp = () => {
    dragRef.current = null;
  };

  const handleObstaclePointerDown = (e: React.PointerEvent, index: number) => {
    if (mode !== 'select') return;
    e.stopPropagation();
    dragRef.current = {
      index,
      startPt: getSVGPt(e),
      origPoints: [...obstacles[index].points],
      moved: false,
    };
    setSelectedIndex(index);
  };

  const handleObstacleClick = (e: React.MouseEvent, index: number) => {
    if (mode !== 'select') return;
    e.stopPropagation(); // prevent SVG onClick from deselecting
    setSelectedIndex(index);
  };

  // ---- toolbar actions ----

  const switchMode = (m: EditorMode) => {
    setMode(m);
    setCurrentPoints([]);
    if (m === 'draw') setSelectedIndex(null);
  };

  const onLocalImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    setLocalImageUrl(URL.createObjectURL(file));
    e.target.value = '';
  };

  const exportJSON = () => {
    const data = JSON.stringify({ obstacles }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obstacles_${activeMap?.name ?? 'map'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- hint text ----

  const hint =
    mode === 'select'
      ? selectedIndex !== null
        ? 'Drag to move · Click elsewhere to deselect'
        : 'Click an obstacle to select and drag it'
      : tool === 'polygon'
      ? currentPoints.length === 0
        ? 'Click to place points · Double-click to close polygon'
        : `${currentPoints.length} pts placed · Double-click to close`
      : currentPoints.length === 0
      ? 'Click to place start point'
      : 'Click to finish shape';

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2 text-sm">
        <span className="font-semibold">Obstacle editor · {sessionId}</span>
        <span
          className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
          title={connected ? 'connected' : 'disconnected'}
        />
        <div className="mx-2 h-5 w-px bg-slate-700" />

        {/* Mode */}
        {(['draw', 'select'] as EditorMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`rounded px-2 py-1 capitalize ${mode === m ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            {m}
          </button>
        ))}

        {mode === 'draw' && (
          <>
            <div className="mx-2 h-5 w-px bg-slate-700" />
            {(['polygon', 'rectangle', 'line', 'circle'] as DrawTool[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTool(t); setCurrentPoints([]); }}
                className={`rounded px-2 py-1 capitalize ${tool === t ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
              >
                {t}
              </button>
            ))}
            <div className="mx-2 h-5 w-px bg-slate-700" />
            {(Object.entries(TYPE_LABEL) as [ObstacleType, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setObstacleType(t)}
                style={{
                  borderColor: TYPE_COLOR[t],
                  backgroundColor: obstacleType === t ? TYPE_COLOR[t] + '33' : undefined,
                }}
                className={`rounded border-2 px-2 py-1 text-xs ${obstacleType === t ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
              >
                {label}
              </button>
            ))}
          </>
        )}

        {mode === 'select' && selectedIndex !== null && (
          <>
            <div className="mx-2 h-5 w-px bg-slate-700" />
            <button
              onClick={() => { setObstacles((prev) => prev.filter((_, i) => i !== selectedIndex)); setSelectedIndex(null); }}
              className="rounded bg-red-800 px-2 py-1 hover:bg-red-700"
            >
              Delete
            </button>
          </>
        )}

        <div className="mx-2 h-5 w-px bg-slate-700" />

        {/* Grid */}
        <span className="text-slate-400">Grid:</span>
        {(['none', 'square', 'hex'] as GridKind[]).map((g) => (
          <button
            key={g}
            onClick={() => setGridKind(g)}
            className={`rounded px-2 py-1 capitalize ${gridKind === g ? 'bg-teal-700' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            {g}
          </button>
        ))}
        {gridKind !== 'none' && (
          <label className="flex items-center gap-1 text-slate-300">
            Size:
            <input
              type="number"
              min={10}
              max={500}
              step={5}
              value={gridSize}
              onChange={(e) => setGridSize(Math.max(10, Number(e.target.value)))}
              className="w-16 rounded bg-slate-800 px-2 py-1 text-white"
            />
          </label>
        )}

        <div className="mx-2 h-5 w-px bg-slate-700" />

        <span className="text-slate-400">{obstacles.length}</span>
        {currentPoints.length > 0 && (
          <button onClick={() => setCurrentPoints([])} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
            Cancel
          </button>
        )}
        <button
          onClick={() => { setObstacles((prev) => prev.slice(0, -1)); setSelectedIndex(null); }}
          disabled={obstacles.length === 0}
          className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600 disabled:opacity-40"
        >
          Undo
        </button>
        <button
          onClick={() => { setObstacles([]); setSelectedIndex(null); }}
          disabled={obstacles.length === 0}
          className="rounded bg-red-900 px-2 py-1 hover:bg-red-800 disabled:opacity-40"
        >
          Clear all
        </button>

        <div className="mx-2 h-5 w-px bg-slate-700" />

        {!activeMap && (
          <>
            <span className="text-slate-400">Canvas:</span>
            <input
              type="number" min={100} max={8000} step={50}
              value={standaloneW}
              onChange={(e) => setStandaloneW(Math.max(100, Number(e.target.value)))}
              className="w-20 rounded bg-slate-800 px-2 py-1 text-white"
            />
            <span className="text-slate-500">×</span>
            <input
              type="number" min={100} max={8000} step={50}
              value={standaloneH}
              onChange={(e) => setStandaloneH(Math.max(100, Number(e.target.value)))}
              className="w-20 rounded bg-slate-800 px-2 py-1 text-white"
            />
            <div className="mx-1 h-5 w-px bg-slate-700" />
          </>
        )}
        {activeMap && (
          <span className="text-xs text-slate-500">
            {mapWidth}×{mapHeight} (session)
          </span>
        )}
        <label className="cursor-pointer rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
          Load image
          <input type="file" accept="image/*" onChange={onLocalImage} className="hidden" />
        </label>
        <button
          onClick={exportJSON}
          disabled={obstacles.length === 0}
          className="rounded bg-emerald-700 px-2 py-1 hover:bg-emerald-600 disabled:opacity-40"
        >
          Export JSON
        </button>
        {state && (
          <button
            onClick={() => loadObstacles(obstacles)}
            disabled={obstacles.length === 0}
            className="rounded bg-blue-700 px-2 py-1 hover:bg-blue-600 disabled:opacity-40"
          >
            Apply to game
          </button>
        )}

        <Link to={`/dm/${sessionId}`} className="ml-auto rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">
          DM view ↗
        </Link>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-950">
        {(() => {
          // Extend the viewport by a margin so obstacles can be drawn and viewed
          // outside the map boundary. 20% of the larger dimension, minimum 150 units.
          const margin = Math.max(150, Math.round(Math.max(mapWidth, mapHeight) * 0.2));
          const vbW = mapWidth + 2 * margin;
          const vbH = mapHeight + 2 * margin;
          return (
        <svg
          ref={svgRef}
          viewBox={`${-margin} ${-margin} ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          style={{ display: 'block', cursor: mode === 'select' ? 'default' : 'crosshair' }}
          onClick={handleSVGClick}
          onDoubleClick={handleSVGDoubleClick}
          onPointerMove={handleSVGPointerMove}
          onPointerLeave={handleSVGPointerLeave}
          onPointerUp={handleSVGPointerUp}
        >
          {/* Dark background covers the whole extended viewport */}
          <rect x={-margin} y={-margin} width={vbW} height={vbH} fill="#0b0e14" />

          {/* Map area background when no image */}
          {!imageUrl && <rect x={0} y={0} width={mapWidth} height={mapHeight} fill="#141a26" />}

          {imageUrl && (
            <image href={imageUrl} x={0} y={0} width={mapWidth} height={mapHeight} preserveAspectRatio="none" />
          )}

          {/* Map boundary indicator */}
          <rect
            x={0} y={0} width={mapWidth} height={mapHeight}
            fill="none"
            stroke="rgba(100,160,220,0.35)"
            strokeWidth={2}
            strokeDasharray="10 6"
            pointerEvents="none"
          />

          {gridKind === 'square' && <SquareGrid width={mapWidth} height={mapHeight} size={gridSize} />}
          {gridKind === 'hex' && <HexGrid width={mapWidth} height={mapHeight} size={gridSize} />}

          {obstacles.map((obs, i) => (
            <ObstacleShape
              key={i}
              obstacle={obs}
              color={TYPE_COLOR[obs.type]}
              selected={selectedIndex === i}
              onPointerDown={(e) => handleObstaclePointerDown(e, i)}
              onClick={(e) => handleObstacleClick(e, i)}
              cursor={mode === 'select' ? 'grab' : undefined}
            />
          ))}

          {mode === 'draw' && currentPoints.length > 0 && mousePos && (
            <DrawPreview tool={tool} points={currentPoints} mousePos={mousePos} color={TYPE_COLOR[obstacleType]} />
          )}
        </svg>
          );
        })()}

        {!imageUrl && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-600">
            <span>No map image — load one or connect to a session</span>
            <span className="text-sm">Obstacles can be drawn outside the dashed map boundary</span>
          </div>
        )}

        <div className="absolute bottom-3 right-3 space-y-1 rounded bg-slate-900/80 px-3 py-2 text-xs">
          <div className="font-semibold text-slate-300">Obstacle type</div>
          {(Object.entries(TYPE_LABEL) as [ObstacleType, string][]).map(([t, label]) => (
            <div key={t} className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm opacity-70" style={{ backgroundColor: TYPE_COLOR[t] }} />
              <span className="text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        <div className="absolute bottom-3 left-3 rounded bg-slate-900/60 px-2 py-1 text-xs text-slate-500">
          {hint}
        </div>
      </div>
    </div>
  );
}

// --- Grid overlays ---

function SquareGrid({ width, height, size }: { width: number; height: number; size: number }) {
  return (
    <g pointerEvents="none">
      <defs>
        <pattern id="squareGrid" width={size} height={size} patternUnits="userSpaceOnUse">
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#squareGrid)" />
    </g>
  );
}

function HexGrid({ width, height, size }: { width: number; height: number; size: number }) {
  const dx = Math.sqrt(3) * size;
  const dy = 1.5 * size;
  const maxR = Math.ceil(height / dy) + 1;
  const maxQ = Math.ceil(width / dx) + 2;

  const hexes: { cx: number; cy: number }[] = [];
  for (let r = 0; r <= maxR; r++) {
    for (let q = 0; q <= maxQ; q++) {
      hexes.push({
        cx: q * dx + (r % 2 === 1 ? dx / 2 : 0),
        cy: r * dy,
      });
    }
  }

  return (
    <g pointerEvents="none">
      {hexes.map(({ cx, cy }, i) => (
        <polygon
          key={i}
          points={hexVertices(cx, cy, size)}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

// --- ObstacleShape ---

function ObstacleShape({
  obstacle,
  color,
  selected,
  onPointerDown,
  onClick,
  cursor,
}: {
  obstacle: ObstacleInput;
  color: string;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  cursor?: string;
}) {
  const { shape, points } = obstacle;
  if (points.length === 0) return null;

  const style = cursor ? { cursor } : undefined;
  const fillColor = color;
  const strokeColor = selected ? 'white' : color;
  const strokeW = selected ? 3 : 2;
  const fillOp = selected ? 0.55 : 0.35;

  if (shape === 'circle' && points.length >= 2) {
    const [center, edge] = points;
    const r = Math.hypot(edge.x - center.x, edge.y - center.y);
    return (
      <circle
        cx={center.x} cy={center.y} r={r}
        fill={fillColor} fillOpacity={fillOp}
        stroke={strokeColor} strokeWidth={strokeW} strokeOpacity={0.9}
        style={style}
        onPointerDown={onPointerDown}
        onClick={onClick}
      />
    );
  }

  if (shape === 'line' && points.length >= 2) {
    return (
      <polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={strokeColor} strokeWidth={selected ? 5 : 3} strokeOpacity={0.9}
        strokeLinecap="round"
        style={style}
        onPointerDown={onPointerDown}
        onClick={onClick}
      />
    );
  }

  return (
    <polygon
      points={points.map((p) => `${p.x},${p.y}`).join(' ')}
      fill={fillColor} fillOpacity={fillOp}
      stroke={strokeColor} strokeWidth={strokeW} strokeOpacity={0.9}
      style={style}
      onPointerDown={onPointerDown}
      onClick={onClick}
    />
  );
}

// --- DrawPreview ---

function DrawPreview({
  tool,
  points,
  mousePos,
  color,
}: {
  tool: DrawTool;
  points: Point[];
  mousePos: Point;
  color: string;
}) {
  const dashed = { strokeDasharray: '6 4' } as const;

  if (tool === 'polygon') {
    return (
      <>
        <polyline
          points={[...points, mousePos].map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.6}
          {...dashed}
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} opacity={0.9} />
        ))}
      </>
    );
  }

  if (points.length === 0) return null;
  const anchor = points[0];

  if (tool === 'line') {
    return (
      <line
        x1={anchor.x} y1={anchor.y} x2={mousePos.x} y2={mousePos.y}
        stroke={color} strokeWidth={3} strokeOpacity={0.6} strokeLinecap="round"
        {...dashed}
      />
    );
  }

  if (tool === 'rectangle') {
    return (
      <rect
        x={Math.min(anchor.x, mousePos.x)}
        y={Math.min(anchor.y, mousePos.y)}
        width={Math.abs(mousePos.x - anchor.x)}
        height={Math.abs(mousePos.y - anchor.y)}
        fill={color} fillOpacity={0.2}
        stroke={color} strokeWidth={2} strokeOpacity={0.6}
        {...dashed}
      />
    );
  }

  if (tool === 'circle') {
    const r = Math.hypot(mousePos.x - anchor.x, mousePos.y - anchor.y);
    return (
      <circle
        cx={anchor.x} cy={anchor.y} r={r}
        fill={color} fillOpacity={0.2}
        stroke={color} strokeWidth={2} strokeOpacity={0.6}
        {...dashed}
      />
    );
  }

  return null;
}
