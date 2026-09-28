'use client';

import React from 'react';
import { LayoutState } from '../lib/types';

interface BlocksWorldCanvasProps {
  layout: LayoutState;
  hoveredBlock: string | null;
  onHoverBlock: (blockId: string | null) => void;
  columnMode: 'stable' | 'compact';
  onToggleColumnMode: () => void;
  showGrid?: boolean;
}

export const BlocksWorldCanvas: React.FC<BlocksWorldCanvasProps> = ({
  layout,
  hoveredBlock,
  onHoverBlock,
  columnMode,
  onToggleColumnMode,
  showGrid = true,
}) => {
  const { blocks, columnsCount, maxRow, gripper, columnLabels } = layout;

  // Canvas geometry constants
  const CANVAS_WIDTH = 960;
  const CANVAS_HEIGHT = 470;
  const TABLE_TOP_Y = 390;
  const TABLE_HEIGHT = 28;
  const RAIL_Y = 32;

  // Responsive column sizing
  const MARGIN_X = 80;
  const availableWidth = CANVAS_WIDTH - MARGIN_X * 2;
  const colWidth = availableWidth / columnsCount;
  const blockWidth = Math.min(108, Math.max(72, colWidth * 0.74));
  const blockHeight = 54;
  const blockSpacing = 3;

  // Column X center positions
  const getColCenterX = (col: number) => {
    return MARGIN_X + col * colWidth + colWidth / 2;
  };

  // Held block elevation
  const HELD_BLOCK_Y = 110;
  const GRIPPER_WRIST_Y = gripper.isHolding ? HELD_BLOCK_Y - 8 : 125;
  const gripperCenterX = getColCenterX(gripper.targetColumn);

  // Claw opening width
  const clawSpan = gripper.isHolding ? blockWidth + 6 : blockWidth + 34;

  return (
    <div className="relative w-full rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
      {/* Top Canvas Bar Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-slate-200">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                gripper.isHolding ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            {gripper.isHolding ? (
              <span>
                Arm Holding: <strong className="text-amber-300 font-mono text-sm">{gripper.heldBlock}</strong>
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">Arm Empty (Ready)</span>
            )}
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Active Blocks: <strong className="text-slate-300">{blocks.length}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Columns: <strong className="text-slate-300">{columnsCount}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Max Stack Height: <strong className="text-slate-300">{maxRow + 1}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Column Mode Selector */}
          <button
            onClick={onToggleColumnMode}
            title="Toggle between fixed stable column slots across steps or compact stacked alignment"
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
              columnMode === 'stable'
                ? 'bg-blue-950/60 border-blue-500/40 text-blue-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {columnMode === 'stable' ? '📐 Stable Columns' : '📦 Compact Columns'}
          </button>
        </div>
      </div>

      {/* Main SVG Viewport */}
      <div className="relative w-full aspect-[2/1] min-h-[380px] max-h-[500px] flex items-center justify-center pt-2">
        <svg
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Table Surface Gradient */}
            <linearGradient id="tableGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="25%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Table Bevel Highlight */}
            <linearGradient id="tableBevel" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.8" />
            </linearGradient>

            {/* Arm Gantry Rail Gradient */}
            <linearGradient id="railGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Trolley Metal Gradient */}
            <linearGradient id="trolleyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Block Drop Shadow */}
            <filter id="blockShadow" x="-10%" y="-10%" width="125%" height="135%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.45" />
            </filter>

            {/* Glow for Active / Hovered Block */}
            <filter id="activeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#38bdf8" floodOpacity="0.9" />
            </filter>

            {/* Held Block Glow */}
            <filter id="heldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#fbbf24" floodOpacity="0.75" />
            </filter>
          </defs>

          {/* Background Ambient Grid Markers */}
          {showGrid && (
            <g opacity="0.18">
              {Array.from({ length: columnsCount }).map((_, c) => {
                const cx = getColCenterX(c);
                return (
                  <line
                    key={`grid-col-${c}`}
                    x1={cx}
                    y1={RAIL_Y + 16}
                    x2={cx}
                    y2={TABLE_TOP_Y}
                    stroke="#94a3b8"
                    strokeDasharray="4 6"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          )}

          {/* 1. OVERHEAD GANTRY RAIL */}
          <g id="gantry-rail">
            {/* Rail shadow */}
            <rect
              x="30"
              y={RAIL_Y + 12}
              width={CANVAS_WIDTH - 60}
              height="4"
              fill="#000"
              opacity="0.5"
            />
            {/* Rail Beam */}
            <rect
              x="30"
              y={RAIL_Y}
              width={CANVAS_WIDTH - 60}
              height="12"
              rx="4"
              fill="url(#railGradient)"
              stroke="#334155"
              strokeWidth="1"
            />
            {/* Rail End Caps */}
            <rect x="24" y={RAIL_Y - 4} width="12" height="20" rx="3" fill="#475569" stroke="#1e293b" />
            <rect
              x={CANVAS_WIDTH - 36}
              y={RAIL_Y - 4}
              width="12"
              height="20"
              rx="3"
              fill="#475569"
              stroke="#1e293b"
            />
            {/* Rail Track Notch */}
            <line
              x1="40"
              y1={RAIL_Y + 6}
              x2={CANVAS_WIDTH - 40}
              y2={RAIL_Y + 6}
              stroke="#0f172a"
              strokeWidth="2"
            />
          </g>

          {/* 2. ROBOTIC ARM & TROLLEY (Smooth horizontal translation) */}
          <g
            id="robotic-arm"
            className="transition-all duration-300 ease-out"
            style={{
              transform: `translateX(${gripperCenterX}px)`,
            }}
          >
            {/* Trolley Carriage */}
            <rect
              x="-36"
              y={RAIL_Y - 6}
              width="72"
              height="24"
              rx="5"
              fill="url(#trolleyGradient)"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              filter="url(#blockShadow)"
            />
            {/* Roller Wheels */}
            <circle cx="-22" cy={RAIL_Y + 6} r="4" fill="#0f172a" />
            <circle cx="22" cy={RAIL_Y + 6} r="4" fill="#0f172a" />
            {/* Motor Casing */}
            <rect x="-18" y={RAIL_Y + 14} width="36" height="12" rx="3" fill="#334155" />
            <circle
              cx="0"
              cy={RAIL_Y + 20}
              r="3.5"
              fill={gripper.isHolding ? '#fbbf24' : '#34d399'}
              className="animate-pulse"
            />

            {/* Telescoping Piston Stem */}
            <rect
              x="-6"
              y={RAIL_Y + 24}
              width="12"
              height={Math.max(20, GRIPPER_WRIST_Y - (RAIL_Y + 24))}
              fill="#64748b"
              stroke="#475569"
              strokeWidth="1"
            />
            <rect
              x="-3"
              y={RAIL_Y + 28}
              width="6"
              height={Math.max(10, GRIPPER_WRIST_Y - (RAIL_Y + 34))}
              fill="#cbd5e1"
            />

            {/* Gripper Wrist Assembly */}
            <g transform={`translate(0, ${GRIPPER_WRIST_Y})`}>
              <polygon
                points="-24,-6 24,-6 14,8 -14,8"
                fill="#334155"
                stroke="#64748b"
                strokeWidth="1.5"
              />

              {/* Status LED on wrist */}
              <circle
                cx="0"
                cy="0"
                r="3"
                fill={gripper.isHolding ? '#f59e0b' : '#10b981'}
                stroke="#0f172a"
                strokeWidth="1"
              />

              {/* Left Claw Finger */}
              <path
                d={`M -14 6 L ${-clawSpan / 2} 18 L ${-clawSpan / 2 + 3} 36 L ${-clawSpan / 2 + 10} 38`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
              {/* Left Rubber Gripper Tip */}
              <rect
                x={-clawSpan / 2 + 5}
                y="30"
                width="7"
                height="10"
                rx="2"
                fill="#1e293b"
                className="transition-all duration-300"
              />

              {/* Right Claw Finger */}
              <path
                d={`M 14 6 L ${clawSpan / 2} 18 L ${clawSpan / 2 - 3} 36 L ${clawSpan / 2 - 10} 38`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
              {/* Right Rubber Gripper Tip */}
              <rect
                x={clawSpan / 2 - 12}
                y="30"
                width="7"
                height="10"
                rx="2"
                fill="#1e293b"
                className="transition-all duration-300"
              />
            </g>
          </g>

          {/* 3. TABLE SURFACE & PEDESTALS */}
          <g id="table">
            {/* Table Shadow */}
            <ellipse
              cx={CANVAS_WIDTH / 2}
              cy={TABLE_TOP_Y + TABLE_HEIGHT + 14}
              rx={CANVAS_WIDTH / 2 - 30}
              ry="10"
              fill="#000"
              opacity="0.4"
            />

            {/* Table Main Slab */}
            <rect
              x="40"
              y={TABLE_TOP_Y}
              width={CANVAS_WIDTH - 80}
              height={TABLE_HEIGHT}
              rx="6"
              fill="url(#tableGradient)"
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Table Bevel Top Stripe */}
            <rect
              x="42"
              y={TABLE_TOP_Y}
              width={CANVAS_WIDTH - 84}
              height="3"
              rx="1.5"
              fill="url(#tableBevel)"
            />

            {/* Table Industrial Legs */}
            <rect x="90" y={TABLE_TOP_Y + TABLE_HEIGHT} width="22" height="42" fill="#1e293b" stroke="#334155" />
            <rect x={CANVAS_WIDTH - 112} y={TABLE_TOP_Y + TABLE_HEIGHT} width="22" height="42" fill="#1e293b" stroke="#334155" />
            <rect x="75" y={TABLE_TOP_Y + TABLE_HEIGHT + 36} width="52" height="8" rx="2" fill="#0f172a" />
            <rect x={CANVAS_WIDTH - 127} y={TABLE_TOP_Y + TABLE_HEIGHT + 36} width="52" height="8" rx="2" fill="#0f172a" />

            {/* Column Pedestals / Docking Bays */}
            {Array.from({ length: columnsCount }).map((_, c) => {
              const cx = getColCenterX(c);
              const label = columnLabels[c];
              const isArmOver = gripper.targetColumn === c;

              return (
                <g key={`table-pedestal-${c}`}>
                  {/* Glowing landing pad */}
                  <rect
                    x={cx - blockWidth / 2 - 4}
                    y={TABLE_TOP_Y - 4}
                    width={blockWidth + 8}
                    height="5"
                    rx="2"
                    fill={isArmOver ? '#38bdf8' : '#475569'}
                    opacity={isArmOver ? 0.9 : 0.4}
                  />

                  {/* Column Label under table */}
                  <g transform={`translate(${cx}, ${TABLE_TOP_Y + TABLE_HEIGHT + 18})`}>
                    <text
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      COL {c}
                    </text>
                    {label?.baseBlock && (
                      <text
                        y="14"
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        [Base: {label.baseBlock}]
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </g>

          {/* 4. BLOCKS RENDERING */}
          <g id="blocks-layer">
            {blocks.map((b) => {
              const isHovered = hoveredBlock === b.id;
              let bx: number;
              let by: number;

              if (b.isHeld) {
                // Suspended under robotic gripper
                bx = gripperCenterX - blockWidth / 2;
                by = HELD_BLOCK_Y + 18;
              } else {
                // Stacked on table
                const cx = getColCenterX(b.column);
                bx = cx - blockWidth / 2;
                by = TABLE_TOP_Y - (b.row + 1) * (blockHeight + blockSpacing);
              }

              return (
                <g
                  key={`block-${b.id}`}
                  className="cursor-pointer transition-all duration-300 ease-out"
                  transform={`translate(${bx}, ${by})`}
                  onMouseEnter={() => onHoverBlock(b.id)}
                  onMouseLeave={() => onHoverBlock(null)}
                  filter={
                    isHovered
                      ? 'url(#activeGlow)'
                      : b.isHeld
                      ? 'url(#heldGlow)'
                      : 'url(#blockShadow)'
                  }
                >
                  {/* Block Card Background */}
                  <rect
                    width={blockWidth}
                    height={blockHeight}
                    rx="9"
                    fill={b.color}
                    stroke={isHovered ? '#ffffff' : b.colorAccent}
                    strokeWidth={isHovered ? '2.5' : '1.5'}
                  />

                  {/* Top Bevel Highlight */}
                  <line
                    x1="8"
                    y1="4"
                    x2={blockWidth - 8}
                    y2="4"
                    stroke="#ffffff"
                    strokeOpacity="0.45"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Bottom Dark Bevel */}
                  <line
                    x1="8"
                    y1={blockHeight - 3}
                    x2={blockWidth - 8}
                    y2={blockHeight - 3}
                    stroke="#000000"
                    strokeOpacity="0.35"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Centered Block Identifier */}
                  <text
                    x={blockWidth / 2}
                    y={blockHeight / 2 + 7}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="21"
                    fontWeight="800"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    letterSpacing="0.05em"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                  >
                    {b.id}
                  </text>

                  {/* Status Badges */}
                  {/* Clear Sparkle Indicator */}
                  {b.isClear && !b.isHeld && (
                    <g transform={`translate(${blockWidth - 18}, 5)`}>
                      <circle cx="6" cy="6" r="6" fill="#0f172a" opacity="0.75" />
                      <text
                        x="6"
                        y="9.5"
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        ★
                      </text>
                    </g>
                  )}

                  {/* Table Base Indicator */}
                  {b.isTable && (
                    <g transform={`translate(6, ${blockHeight - 14})`}>
                      <rect width="28" height="10" rx="3" fill="#0f172a" opacity="0.6" />
                      <text
                        x="14"
                        y="7.5"
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="7"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        BASE
                      </text>
                    </g>
                  )}

                  {/* Held Indicator */}
                  {b.isHeld && (
                    <g transform={`translate(${blockWidth / 2 - 20}, -14)`}>
                      <rect width="40" height="12" rx="3" fill="#f59e0b" />
                      <text
                        x="20"
                        y="9"
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="800"
                      >
                        HELD
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Block Hover Info Tooltip Bar */}
      <div className="h-6 mt-1 flex items-center justify-between text-xs px-2 text-slate-400">
        <div>
          {hoveredBlock ? (
            <span className="flex items-center gap-1.5 animate-fadeIn">
              <span className="text-sky-400 font-bold">Block {hoveredBlock}:</span>
              {(() => {
                const b = blocks.find((item) => item.id === hoveredBlock);
                if (!b) return null;
                if (b.isHeld) return <span className="text-amber-300">Held by robotic gripper</span>;
                if (b.isTable) {
                  return (
                    <span className="text-slate-300">
                      On table in Col {b.column} {b.isClear ? '(Top is clear)' : ''}
                    </span>
                  );
                }
                return (
                  <span className="text-slate-300">
                    Stacked on Block <strong>{b.supportedBy}</strong> in Col {b.column}{' '}
                    {b.isClear ? '(Top is clear)' : ''}
                  </span>
                );
              })()}
            </span>
          ) : (
            <span className="text-slate-500 italic">Hover any block to inspect its spatial state</span>
          )}
        </div>
        <div className="text-[11px] text-slate-500">
          ★ = Clear top | BASE = Table surface
        </div>
      </div>
    </div>
  );
};
