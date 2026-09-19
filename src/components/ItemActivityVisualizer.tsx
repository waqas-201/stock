import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import {
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  AlertTriangle,
  Clock,
  User,
  Info,
  Layers,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { StockItem, ItemAuditEntry } from '../types';

interface ItemActivityVisualizerProps {
  item: StockItem;
  trail: ItemAuditEntry[];
  onSelectEvent?: (event: ItemAuditEntry) => void;
  selectedEventId?: string | null;
}

export const ItemActivityVisualizer: React.FC<ItemActivityVisualizerProps> = ({
  item,
  trail = [],
  onSelectEvent,
  selectedEventId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(600);
  const chartHeight = 200;

  const [hoveredEvent, setHoveredEvent] = useState<ItemAuditEntry | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [internalSelectedEvent, setInternalSelectedEvent] = useState<ItemAuditEntry | null>(null);

  // View mode inside item visualizer: both are bar charts!
  // 'balance_bars': stock balance quantity bars per event
  // 'delta_bars': added (+) vs reduced (-) quantity bars per event
  const [viewMode, setViewMode] = useState<'balance_bars' | 'delta_bars'>('balance_bars');

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setChartWidth(Math.max(280, entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const activeEvent = internalSelectedEvent || (selectedEventId ? trail.find((e) => e.id === selectedEventId) : null);

  // Chronologically sorted entries
  const sortedTrail = useMemo(() => {
    const list = [...trail];
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return list;
  }, [trail]);

  // Threshold and extremes
  const threshold = item.lowStockThreshold ?? 5;

  const margin = { top: 20, right: 28, bottom: 32, left: 42 };
  const innerWidth = Math.max(180, chartWidth - margin.left - margin.right);
  const innerHeight = Math.max(100, chartHeight - margin.top - margin.bottom);

  // X & Y Scales
  const { xScale, yScaleBalance, yScaleDelta, yMaxBalance, yMaxDelta, timeDomain } = useMemo(() => {
    if (sortedTrail.length === 0) {
      const now = new Date();
      return {
        xScale: d3.scaleTime().domain([now, now]).range([0, innerWidth]),
        yScaleBalance: d3.scaleLinear().domain([0, 10]).range([innerHeight, 0]),
        yScaleDelta: d3.scaleLinear().domain([0, 10]).range([innerHeight, 0]),
        yMaxBalance: 10,
        yMaxDelta: 10,
        timeDomain: [now, now] as [Date, Date],
      };
    }

    const timestamps = sortedTrail.map((e) => new Date(e.timestamp).getTime());
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const minDate = new Date(minTimestamp);
    const maxDate = new Date(maxTimestamp);

    // Ensure at least 1 day range for nice rendering
    if (minDate.getTime() === maxDate.getTime()) {
      minDate.setDate(minDate.getDate() - 1);
      maxDate.setDate(maxDate.getDate() + 1);
    }

    const balances = sortedTrail.map((e) => Number(e.balanceAfter ?? item.quantity));
    const deltas = sortedTrail.map((e) => Math.abs(Number(e.delta || (e.action === 'created' ? e.newQuantity || 0 : 0))));

    const maxBalance = balances.length ? Math.max(...balances) : item.quantity;
    const maxDelta = deltas.length ? Math.max(...deltas) : 0;

    const highestBalance = Math.max(maxBalance, threshold * 1.35, item.quantity, 5);
    const highestDelta = Math.max(maxDelta, 5);

    const x = d3.scaleTime().domain([minDate, maxDate]).range([0, innerWidth]);
    const yBalance = d3
      .scaleLinear()
      .domain([0, highestBalance * 1.15])
      .range([innerHeight, 0])
      .nice();

    const yDelta = d3
      .scaleLinear()
      .domain([0, highestDelta * 1.2])
      .range([innerHeight, 0])
      .nice();

    return {
      xScale: x,
      yScaleBalance: yBalance,
      yScaleDelta: yDelta,
      yMaxBalance: highestBalance,
      yMaxDelta: highestDelta,
      timeDomain: [minDate, maxDate] as [Date, Date],
    };
  }, [sortedTrail, item.quantity, threshold, innerWidth, innerHeight]);

  const xTicks = useMemo(() => {
    const count = chartWidth < 450 ? 3 : 5;
    return xScale.ticks(count);
  }, [xScale, chartWidth]);

  const thresholdY = yScaleBalance(threshold);

  const handlePointClick = (event: ItemAuditEntry) => {
    setInternalSelectedEvent(event);
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  return (
    <div className="p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <span>Item Activity & Stock Level Bar Chart</span>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200">
                {sortedTrail.length} events
              </span>
            </h4>
          </div>
        </div>

        {/* View Switcher & Legend */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setViewMode('balance_bars')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'balance_bars' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stock Level Bars
            </button>
            <button
              type="button"
              onClick={() => setViewMode('delta_bars')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'delta_bars' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Movement Delta Bars
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 text-[10px] text-slate-500 font-medium">
            {viewMode === 'balance_bars' ? (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                  <span>Stock &gt; {threshold}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  <span>Low Stock (≤ {threshold})</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 border-b-2 border-dashed border-amber-600 inline-block" />
                  <span>Alert Threshold</span>
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                  <span>Added (+)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  <span>Reduced (−)</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl bg-white border border-slate-200/90 p-2 overflow-hidden select-none"
        onMouseLeave={() => {
          setHoveredEvent(null);
          setTooltipPos(null);
        }}
      >
        <svg width={chartWidth} height={chartHeight} className="overflow-visible cursor-crosshair">
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Horizontal Grid lines */}
            {(viewMode === 'balance_bars' ? yScaleBalance : yScaleDelta).ticks(4).map((tick, idx) => {
              const y = (viewMode === 'balance_bars' ? yScaleBalance : yScaleDelta)(tick);
              return (
                <g key={`grid_${idx}`} className="opacity-40">
                  <line x1={0} y1={y} x2={innerWidth} y2={y} stroke="#cbd5e1" strokeDasharray="2 3" />
                  <text x={-6} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* X-Grid lines */}
            {xTicks.map((tick, idx) => {
              const x = xScale(tick);
              return (
                <g key={`xtick_${idx}`} className="opacity-40">
                  <line x1={x} y1={0} x2={x} y2={innerHeight} stroke="#cbd5e1" strokeDasharray="2 3" />
                  <text x={x} y={innerHeight + 16} textAnchor="middle" className="text-[10px] fill-slate-400 font-mono">
                    {tick.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </text>
                </g>
              );
            })}

            {/* Zero Baseline */}
            <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#94a3b8" strokeWidth="1.5" />

            {/* Threshold Alert Line (only on balance_bars) */}
            {viewMode === 'balance_bars' && thresholdY >= 0 && thresholdY <= innerHeight && (
              <g>
                <line
                  x1={0}
                  y1={thresholdY}
                  x2={innerWidth}
                  y2={thresholdY}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={innerWidth + 4}
                  y={thresholdY + 3}
                  className="text-[9px] fill-amber-700 font-bold font-mono"
                >
                  ≤{threshold}
                </text>
              </g>
            )}

            {/* Mode 1: Stock Level Balance Bars */}
            {viewMode === 'balance_bars' &&
              sortedTrail.map((ev) => {
                const x = xScale(new Date(ev.timestamp));
                const barWidth = Math.max(10, Math.min(28, innerWidth / (sortedTrail.length * 1.5)));
                const bal = Number(ev.balanceAfter ?? item.quantity);
                const yPos = yScaleBalance(bal);
                const barHeight = Math.max(4, innerHeight - yPos);
                const isZero = bal === 0;
                const isLow = !isZero && bal <= threshold;
                const barColor = isZero ? '#f43f5e' : isLow ? '#f59e0b' : '#10b981';
                const isSelected = activeEvent?.id === ev.id;
                const isHovered = hoveredEvent?.id === ev.id;

                return (
                  <g key={`bal_bar_${ev.id}`}>
                    <rect
                      x={x - barWidth / 2}
                      y={yPos}
                      width={barWidth}
                      height={barHeight}
                      rx={3}
                      fill={barColor}
                      className={`transition-all cursor-pointer ${
                        isSelected ? 'stroke-2 stroke-slate-900 filter drop-shadow-md' : 'opacity-90 hover:opacity-100'
                      }`}
                      onClick={() => handlePointClick(ev)}
                      onMouseEnter={(e) => {
                        setHoveredEvent(ev);
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                        }
                      }}
                    />

                    {/* Quantity label above bar if room allows */}
                    {barWidth >= 14 && (
                      <text
                        x={x}
                        y={Math.max(10, yPos - 3)}
                        textAnchor="middle"
                        className="text-[9px] font-mono font-bold fill-slate-700 select-none"
                      >
                        {bal}
                      </text>
                    )}

                    {/* Marker circle for precision clicking */}
                    <circle
                      cx={x}
                      cy={yPos}
                      r={isSelected ? 4.5 : isHovered ? 4 : 3}
                      fill={barColor}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="cursor-pointer"
                      onClick={() => handlePointClick(ev)}
                    />
                  </g>
                );
              })}

            {/* Mode 2: Added / Reduced Delta Columns */}
            {viewMode === 'delta_bars' &&
              sortedTrail.map((ev) => {
                const x = xScale(new Date(ev.timestamp));
                const barWidth = Math.max(10, Math.min(28, innerWidth / (sortedTrail.length * 1.5)));
                const deltaVal = ev.delta || (ev.action === 'created' ? ev.newQuantity || 0 : 0);
                const isPositive = deltaVal >= 0;
                const barHeight = Math.max(4, innerHeight - yScaleDelta(Math.abs(deltaVal)));
                const yPos = innerHeight - barHeight;
                const isSelected = activeEvent?.id === ev.id;
                const isHovered = hoveredEvent?.id === ev.id;
                const barColor = isPositive ? '#10b981' : '#f59e0b';

                return (
                  <g key={`delta_bar_${ev.id}`}>
                    <rect
                      x={x - barWidth / 2}
                      y={yPos}
                      width={barWidth}
                      height={barHeight}
                      rx={3}
                      fill={barColor}
                      className={`transition-all cursor-pointer ${
                        isSelected ? 'stroke-2 stroke-slate-900 filter drop-shadow-md' : 'opacity-90 hover:opacity-100'
                      }`}
                      onClick={() => handlePointClick(ev)}
                      onMouseEnter={(e) => {
                        setHoveredEvent(ev);
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                        }
                      }}
                    />

                    {/* Delta label above bar */}
                    {barWidth >= 14 && (
                      <text
                        x={x}
                        y={Math.max(10, yPos - 3)}
                        textAnchor="middle"
                        className={`text-[9px] font-mono font-bold select-none ${
                          isPositive ? 'fill-emerald-700' : 'fill-amber-700'
                        }`}
                      >
                        {isPositive ? `+${deltaVal}` : `${deltaVal}`}
                      </text>
                    )}

                    {/* Marker circle */}
                    <circle
                      cx={x}
                      cy={yPos}
                      r={isSelected ? 4.5 : isHovered ? 4 : 3}
                      fill={barColor}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="cursor-pointer"
                      onClick={() => handlePointClick(ev)}
                    />
                  </g>
                );
              })}
          </g>
        </svg>

        {/* Hover Tooltip */}
        {hoveredEvent && tooltipPos && (
          <div
            className="absolute z-30 pointer-events-none shadow-xl bg-slate-900 text-white rounded-xl p-2.5 text-xs w-60 border border-slate-700/80 backdrop-blur-md"
            style={{
              left: Math.min(chartWidth - 260, Math.max(10, tooltipPos.x - 120)),
              top: Math.max(5, tooltipPos.y - 110),
            }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="font-bold text-slate-200 capitalize">{hoveredEvent.action.replace(/_/g, ' ')}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  (hoveredEvent.delta && hoveredEvent.delta > 0) || hoveredEvent.action === 'created'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : hoveredEvent.delta && hoveredEvent.delta < 0
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-indigo-500/20 text-indigo-300'
                }`}
              >
                {hoveredEvent.delta !== undefined
                  ? hoveredEvent.delta > 0
                    ? `+${hoveredEvent.delta} ${item.unit}`
                    : `${hoveredEvent.delta} ${item.unit}`
                  : hoveredEvent.action === 'created'
                  ? `Initial: ${hoveredEvent.newQuantity} ${item.unit}`
                  : 'Updated'}
              </span>
            </div>
            <div className="mt-1 space-y-0.5 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Balance After:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {hoveredEvent.balanceAfter ?? item.quantity} {item.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Operator:</span>
                <span className="text-slate-200">{hoveredEvent.performedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time:</span>
                <span className="text-slate-400 font-mono text-[10px]">
                  {new Date(hoveredEvent.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {hoveredEvent.summary && (
                <p className="text-[10px] text-slate-400 italic pt-0.5 line-clamp-1 border-t border-slate-800">
                  "{hoveredEvent.summary}"
                </p>
              )}
            </div>
            <div className="mt-1 pt-1 border-t border-slate-800/80 text-[10px] text-emerald-400 font-semibold text-center">
              Click bar to pin & highlight in trail
            </div>
          </div>
        )}
      </div>

      {/* Selected Event Details Inspector (when clicked) */}
      {activeEvent && (
        <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
                (activeEvent.delta && activeEvent.delta > 0) || activeEvent.action === 'created'
                  ? 'bg-emerald-600'
                  : activeEvent.delta && activeEvent.delta < 0
                  ? 'bg-amber-600'
                  : 'bg-indigo-600'
              }`}
            >
              {(activeEvent.delta && activeEvent.delta > 0) || activeEvent.action === 'created' ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : activeEvent.delta && activeEvent.delta < 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : (
                <Activity className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <span className="font-bold text-emerald-900 capitalize block">
                {activeEvent.action.replace(/_/g, ' ')}: {activeEvent.summary}
              </span>
              <span className="text-slate-600 text-[11px]">
                By {activeEvent.performedBy} on{' '}
                {new Date(activeEvent.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                — Resulting stock: <strong>{activeEvent.balanceAfter ?? item.quantity} {item.unit}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInternalSelectedEvent(null)}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer"
          >
            Clear Pin
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Compact inline Sparkline representing recent added/reduced movements for each item
 * Used on the stock table row and card view!
 */
export const ItemMiniActivitySparkline: React.FC<{
  item: StockItem;
  onClick?: () => void;
}> = ({ item, onClick }) => {
  const trail = item.auditTrail || [];
  const recentMovements = useMemo(() => {
    return trail.slice(-6);
  }, [trail]);

  // Compute total added and reduced in recent history
  const { recentAdded, recentReduced } = useMemo(() => {
    let added = 0;
    let reduced = 0;
    trail.forEach((e) => {
      if (e.delta && e.delta > 0) added += e.delta;
      else if (e.delta && e.delta < 0) reduced += Math.abs(e.delta);
    });
    return { recentAdded: added, recentReduced: reduced };
  }, [trail]);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-lg transition-all cursor-pointer group shadow-2xs"
      title={`Activity viz for ${item.itemName}: +${recentAdded} added, -${recentReduced} reduced. Click to inspect live data viz`}
    >
      <div className="flex items-end gap-0.5 h-4.5 w-12 pt-0.5">
        {recentMovements.length === 0 ? (
          <div className="w-full h-1 bg-slate-200 rounded-full" />
        ) : (
          recentMovements.map((m, idx) => {
            const isUp = (m.delta && m.delta > 0) || m.action === 'created';
            const isDown = m.delta && m.delta < 0;
            const h = Math.max(3, Math.min(16, Math.abs(m.delta || 4)));
            return (
              <span
                key={m.id || idx}
                style={{ height: `${h}px` }}
                className={`flex-1 rounded-xs transition-transform group-hover:scale-y-110 ${
                  isUp ? 'bg-emerald-500' : isDown ? 'bg-amber-500' : 'bg-slate-400'
                }`}
              />
            );
          })
        )}
      </div>

      <div className="flex flex-col text-[9px] leading-tight font-mono font-bold">
        <span className="text-emerald-700">+{recentAdded}</span>
        <span className="text-amber-700">-{recentReduced}</span>
      </div>
    </div>
  );
};
