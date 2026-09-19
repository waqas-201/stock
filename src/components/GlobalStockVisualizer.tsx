import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  ExternalLink,
  Sparkles,
  Info,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { StockItem, StockTag } from '../types';
import { GlobalAuditRecord } from '../lib/stockStorage';
import { Tag as TagIcon, Hash } from 'lucide-react';
import { getTagStyle } from '../lib/tagUtils';

export type TimePeriodPreset = 'today' | '7d' | '20d' | '30d' | '60d' | 'all' | 'custom';
export type VisualizerMetricFilter = 'all' | 'inbound' | 'outbound';

interface GlobalStockVisualizerProps {
  items: StockItem[];
  globalLogs: GlobalAuditRecord[];
  onViewItemDetails: (item: StockItem) => void;
  onReceiveStock?: (item: StockItem) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
  managedTags?: StockTag[];
}

interface ChartEventPoint {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  action: string;
  timestamp: string;
  dateObj: Date;
  delta: number;
  newQuantity?: number;
  balanceAfter?: number;
  previousQuantity?: number;
  performedBy: string;
  summary: string;
  details?: string;
  type: 'inbound' | 'outbound' | 'neutral';
}

interface ChartSeriesItem extends ChartEventPoint {
  runningNet: number;
  absDelta: number;
}

export const GlobalStockVisualizer: React.FC<GlobalStockVisualizerProps> = ({
  items = [],
  globalLogs = [],
  onViewItemDetails,
  onReceiveStock,
  selectedTag,
  onSelectTag,
  managedTags = [],
}) => {
  const safeItems = Array.isArray(items) ? items : [];
  const isTagActive = Boolean(selectedTag);

  // Filter items and logs when a specific tag is selected
  const scopedItems = useMemo(() => {
    if (!selectedTag) return safeItems;
    return safeItems.filter(
      (item) => Array.isArray(item.tags) && item.tags.includes(selectedTag)
    );
  }, [safeItems, selectedTag]);

  const scopedItemIds = useMemo(
    () => new Set(scopedItems.map((item) => item.id)),
    [scopedItems]
  );
  // Collapsible panel state (default open)
  const [isExpanded, setIsExpanded] = useState(true);

  // Time period filter state
  const [periodPreset, setPeriodPreset] = useState<TimePeriodPreset>('20d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Event category filter in chart
  const [metricFilter, setMetricFilter] = useState<VisualizerMetricFilter>('all');

  // Chart view mode: Dedicated Bar Charts only (no line chart)
  const [chartMode, setChartMode] = useState<'volume' | 'inventory' | 'net_bars'>('volume');

  // Interactive Hover & Click state
  const [hoveredPoint, setHoveredPoint] = useState<ChartEventPoint | null>(null);
  const [hoveredItem, setHoveredItem] = useState<StockItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ChartEventPoint | null>(null);

  // SVG Container responsive measurement
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);
  const chartHeight = 260;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setChartWidth(Math.max(320, entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 1. Determine Date Range Bounds
  const { startDate, endDate, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    let start = new Date(now);
    let label = 'Last 20 Days';

    if (periodPreset === 'today') {
      start.setHours(0, 0, 0, 0);
      label = 'Today';
    } else if (periodPreset === '7d') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      label = 'Last 7 Days';
    } else if (periodPreset === '20d') {
      start.setDate(start.getDate() - 20);
      start.setHours(0, 0, 0, 0);
      label = 'Last 20 Days';
    } else if (periodPreset === '30d') {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      label = 'Last 30 Days';
    } else if (periodPreset === '60d') {
      start.setDate(start.getDate() - 60);
      start.setHours(0, 0, 0, 0);
      label = 'Last 60 Days';
    } else if (periodPreset === 'all') {
      start = new Date('2020-01-01T00:00:00.000Z');
      label = 'All Time';
    } else if (periodPreset === 'custom') {
      if (customStartDate) {
        start = new Date(customStartDate + 'T00:00:00');
      } else {
        start.setDate(start.getDate() - 30);
      }
      if (customEndDate) {
        end.setTime(new Date(customEndDate + 'T23:59:59.999').getTime());
      }
      label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }

    return { startDate: start, endDate: end, dateRangeLabel: label };
  }, [periodPreset, customStartDate, customEndDate]);

  // 2. Synthesize all Global Events & Item Events in this period
  const { allPeriodEvents, filteredEvents, periodStats } = useMemo(() => {
    const rawEvents: ChartEventPoint[] = [];
    const seenIds = new Set<string>();

    const itemMap = new Map<string, StockItem>();
    scopedItems.forEach((item) => itemMap.set(item.id, item));

    // A. Extract from global audit logs (scoped to selectedTag when active)
    globalLogs.forEach((log) => {
      if (isTagActive && !scopedItemIds.has(log.itemId)) return;
      const d = new Date(log.timestamp);
      if (isNaN(d.getTime())) return;
      if (d >= startDate && d <= endDate) {
        const deltaVal = log.delta !== undefined ? log.delta : 0;
        let type: 'inbound' | 'outbound' | 'neutral' = 'neutral';
        if (deltaVal > 0 || log.action === 'created' || log.action === 'restocked') {
          type = 'inbound';
        } else if (deltaVal < 0) {
          type = 'outbound';
        }

        const id = log.id || `log_${log.timestamp}_${log.itemId}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          rawEvents.push({
            id,
            itemId: log.itemId,
            itemName: log.itemName || itemMap.get(log.itemId)?.itemName || 'Inventory Item',
            unit: log.unit || itemMap.get(log.itemId)?.unit || 'Unit',
            action: log.action,
            timestamp: log.timestamp,
            dateObj: d,
            delta: deltaVal,
            newQuantity: log.newQuantity,
            balanceAfter: log.balanceAfter ?? log.newQuantity,
            previousQuantity: log.previousQuantity,
            performedBy: log.performedBy || 'Staff Member',
            summary: log.summary || 'Stock event recorded',
            details: log.details,
            type,
          });
        }
      }
    });

    // B. Extract from item audit trails if not already included
    scopedItems.forEach((item) => {
      if (item.auditTrail && Array.isArray(item.auditTrail)) {
        item.auditTrail.forEach((entry) => {
          const d = new Date(entry.timestamp);
          if (isNaN(d.getTime())) return;
          if (d >= startDate && d <= endDate) {
            const id = entry.id || `item_${item.id}_${entry.timestamp}`;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              const deltaVal =
                entry.delta !== undefined
                  ? entry.delta
                  : entry.newQuantity !== undefined && entry.previousQuantity !== undefined
                  ? entry.newQuantity - entry.previousQuantity
                  : 0;

              let type: 'inbound' | 'outbound' | 'neutral' = 'neutral';
              if (deltaVal > 0 || entry.action === 'created' || entry.action === 'restocked') {
                type = 'inbound';
              } else if (deltaVal < 0) {
                type = 'outbound';
              }

              rawEvents.push({
                id,
                itemId: item.id,
                itemName: item.itemName,
                unit: item.unit,
                action: entry.action,
                timestamp: entry.timestamp,
                dateObj: d,
                delta: deltaVal,
                newQuantity: entry.newQuantity,
                balanceAfter: entry.balanceAfter ?? entry.newQuantity,
                previousQuantity: entry.previousQuantity,
                performedBy: entry.performedBy || 'Staff Member',
                summary: entry.summary || 'Item stock update',
                details: entry.details,
                type,
              });
            }
          }
        });
      }
    });

    // Sort chronologically ascending for timeline continuity
    rawEvents.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Compute period stats
    let totalInboundUnits = 0;
    let totalOutboundUnits = 0;
    let inboundCount = 0;
    let outboundCount = 0;
    const activeItemIds = new Set<string>();
    const activeStaff = new Set<string>();

    rawEvents.forEach((e) => {
      activeItemIds.add(e.itemId);
      if (e.performedBy) activeStaff.add(e.performedBy);
      if (e.delta > 0) {
        totalInboundUnits += e.delta;
        inboundCount++;
      } else if (e.delta < 0) {
        totalOutboundUnits += Math.abs(e.delta);
        outboundCount++;
      }
    });

    // Apply Metric filter
    let filtered = rawEvents;
    if (metricFilter === 'inbound') {
      filtered = rawEvents.filter((e) => e.type === 'inbound');
    } else if (metricFilter === 'outbound') {
      filtered = rawEvents.filter((e) => e.type === 'outbound');
    }

    return {
      allPeriodEvents: rawEvents,
      filteredEvents: filtered,
      periodStats: {
        totalEvents: rawEvents.length,
        totalInboundUnits,
        inboundCount,
        totalOutboundUnits,
        outboundCount,
        netMovement: totalInboundUnits - totalOutboundUnits,
        distinctItemsMoved: activeItemIds.size,
        distinctStaffCount: activeStaff.size,
      },
    };
  }, [scopedItems, globalLogs, startDate, endDate, metricFilter, isTagActive, scopedItemIds]);

  // Total current stock units across scoped items
  const currentTotalStock = useMemo(() => {
    return scopedItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
  }, [scopedItems]);

  // 3. Prepare D3 Scales and Geometry
  const margin = { top: 24, right: 32, bottom: 36, left: 48 };
  const innerWidth = Math.max(200, chartWidth - margin.left - margin.right);
  const innerHeight = Math.max(120, chartHeight - margin.top - margin.bottom);

  // Time X-Scale
  const xScale = useMemo(() => {
    return d3
      .scaleTime()
      .domain([startDate, endDate])
      .range([0, innerWidth]);
  }, [startDate, endDate, innerWidth]);

  // Aggregate events by day or calculate running cumulative stock
  const { chartSeries, maxY, minY } = useMemo<{
    chartSeries: ChartSeriesItem[];
    maxY: number;
    minY: number;
  }>(() => {
    if (filteredEvents.length === 0) {
      return { chartSeries: [], maxY: 50, minY: 0 };
    }

    // Compute cumulative stock curve working backwards from currentTotalStock
    // or forwards from initial
    let maxDelta = 0;
    let runningNet = 0;

    const series: ChartSeriesItem[] = filteredEvents.map((ev) => {
      runningNet += ev.delta;
      maxDelta = Math.max(maxDelta, Math.abs(ev.delta));
      return {
        ...ev,
        runningNet,
        absDelta: Math.abs(ev.delta),
      };
    });

    const netValues = series.map((s) => s.runningNet);
    const minNet = netValues.length ? Math.min(...netValues) : 0;
    const maxNet = netValues.length ? Math.max(...netValues) : 0;
    const topVal = Math.max(maxDelta, Math.abs(maxNet), Math.abs(minNet), 10);

    return {
      chartSeries: series,
      maxY: topVal,
      minY: -topVal,
    };
  }, [filteredEvents]);

  // Y-Scale for Flow / Delta Activity Bars
  const yScaleVolume = useMemo(() => {
    return d3
      .scaleLinear()
      .domain([-maxY * 1.15, maxY * 1.15])
      .range([innerHeight, 0]);
  }, [maxY, innerHeight]);

  // Inventory Levels Bar Chart Data & Scales
  const topInventoryItems = useMemo(() => {
    const list = [...scopedItems];
    return list.slice(0, 18);
  }, [scopedItems]);

  const maxItemQuantity = useMemo(() => {
    if (topInventoryItems.length === 0) return 10;
    const maxQ = Math.max(...topInventoryItems.map((i) => i.quantity || 0));
    const maxT = Math.max(...topInventoryItems.map((i) => i.lowStockThreshold ?? 5));
    return Math.max(maxQ, maxT, 10);
  }, [topInventoryItems]);

  const yScaleInventory = useMemo(() => {
    return d3
      .scaleLinear()
      .domain([0, maxItemQuantity * 1.18])
      .range([innerHeight, 0]);
  }, [maxItemQuantity, innerHeight]);

  const xScaleInventory = useMemo(() => {
    return d3
      .scaleBand()
      .domain(topInventoryItems.map((i) => i.id))
      .range([0, innerWidth])
      .padding(0.28);
  }, [topInventoryItems, innerWidth]);

  // Y-Scale for Net Movement Bars
  const yScaleNetBars = useMemo(() => {
    if (chartSeries.length === 0) {
      return d3.scaleLinear().domain([-10, 10]).range([innerHeight, 0]);
    }
    const deltas = chartSeries.map((s) => s.delta);
    const maxD = Math.max(...deltas.map(Math.abs), 10);
    return d3
      .scaleLinear()
      .domain([-maxD * 1.18, maxD * 1.18])
      .range([innerHeight, 0]);
  }, [chartSeries, innerHeight]);

  // Generate X-Axis ticks
  const xTicks = useMemo(() => {
    const count = chartWidth < 500 ? 4 : chartWidth < 768 ? 6 : 9;
    return xScale.ticks(count);
  }, [xScale, chartWidth]);

  // Format tick labels
  const formatTickDate = (d: Date) => {
    if (periodPreset === 'today') {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Zero-line Y coordinate
  const zeroLineY =
    chartMode === 'inventory'
      ? innerHeight
      : chartMode === 'net_bars'
      ? yScaleNetBars(0)
      : yScaleVolume(0);

  // Clear hover when mouse leaves
  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoveredItem(null);
    setTooltipPos(null);
  };

  // Find linked StockItem object for an event
  const getLinkedItem = (itemId: string): StockItem | undefined => {
    return items.find((i) => i.id === itemId);
  };

  return (
    <div
      id="global-stock-visualizer"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
    >
      {/* 1. Header Bar: Title, Live Status Indicator, Quick Period Filter & Expand Toggle */}
      <div className="p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Interactive Stock Activity & Inventory Bar Chart</span>
              </h2>
              {isTagActive ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <TagIcon className="w-3 h-3 text-emerald-700" />
                  <span>Filtered:</span>
                  <span className="font-mono font-bold">#{selectedTag}</span>
                  <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded-full">
                    {scopedItems.length} items • {currentTotalStock.toLocaleString()} units
                  </span>
                  {onSelectTag && (
                    <button
                      type="button"
                      onClick={() => onSelectTag(null)}
                      className="text-emerald-700 hover:text-emerald-950 ml-1 text-[11px] underline font-semibold cursor-pointer"
                      title="Reset visualizer to show whole stock"
                    >
                      Show All Stock
                    </button>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                  Live Whole Stock ({safeItems.length} items)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTagActive
                ? `Real-time activity and stock volume filtered for tag #${selectedTag} (${scopedItems.length} SKUs).`
                : 'Bar chart of stock movement activity, inbound & outbound flow, and live inventory levels across products.'}
            </p>
          </div>
        </div>

        {/* Right side controls: Period presets, Metric toggle, and Expand toggle */}
        <div className="flex items-center gap-1.5 flex-wrap self-end md:self-auto">
          {/* Preset Buttons */}
          <div className="inline-flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 text-xs font-semibold">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7D' },
                { id: '20d', label: '20D' },
                { id: '30d', label: '30D' },
                { id: 'all', label: 'All' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  periodPreset === p.id
                    ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Toggle Panel Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="min-h-[30px] px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            title={isExpanded ? 'Collapse Visualizer' : 'Expand Visualizer'}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hide</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Show Chart</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Custom Date Range Selectors if selected */}
      {periodPreset === 'custom' && isExpanded && (
        <div className="px-4 py-2 bg-emerald-50/40 border-b border-emerald-100 flex items-center gap-2 flex-wrap text-xs text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-emerald-900">Custom Date Range:</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
          {(customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* 2. Expanded Body: Metrics Ribbon + Interactive SVG Data Viz + Event Inspector */}
      {isExpanded && (
        <div className="p-3.5 sm:p-5 space-y-4">
          {/* Top Activity Ribbon for Selected Period */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* A. Inbound / Added Units */}
            <div
              onClick={() => setMetricFilter((prev) => (prev === 'inbound' ? 'all' : 'inbound'))}
              role="button"
              tabIndex={0}
              className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                metricFilter === 'inbound'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                  <span>Added In Stock</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-white/80 px-1.5 py-0.2 rounded-md border border-emerald-200/60">
                  {periodStats.inboundCount} events
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">
                  +{periodStats.totalInboundUnits.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-800 font-medium">units</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                {metricFilter === 'inbound' ? '● Filtering inbound only' : 'Click to isolate on chart'}
              </span>
            </div>

            {/* B. Outbound / Sold Units */}
            <div
              onClick={() => setMetricFilter((prev) => (prev === 'outbound' ? 'all' : 'outbound'))}
              role="button"
              tabIndex={0}
              className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                metricFilter === 'outbound'
                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-amber-50/50 border-amber-200/80 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3 text-amber-600" />
                  <span>Reduced / Sold</span>
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-white/80 px-1.5 py-0.2 rounded-md border border-amber-200/60">
                  {periodStats.outboundCount} events
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-800">
                  -{periodStats.totalOutboundUnits.toLocaleString()}
                </span>
                <span className="text-xs text-amber-900 font-medium">units</span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                {metricFilter === 'outbound' ? '● Filtering outbound only' : 'Click to isolate on chart'}
              </span>
            </div>

            {/* C. Net Period Stock Movement */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-slate-400" />
                <span>Net Stock Movement</span>
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className={`text-xl sm:text-2xl font-bold font-mono ${
                    periodStats.netMovement > 0
                      ? 'text-emerald-700'
                      : periodStats.netMovement < 0
                      ? 'text-amber-800'
                      : 'text-slate-800'
                  }`}
                >
                  {periodStats.netMovement > 0 ? `+${periodStats.netMovement}` : periodStats.netMovement}
                </span>
                <span className="text-xs text-slate-400 font-medium">net delta</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                {periodStats.distinctItemsMoved} unique items affected
              </span>
            </div>

            {/* D. Total Catalog Volume */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-500" />
                <span>Total Live Stock</span>
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                  {currentTotalStock.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">on hand</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                Across {items.length} SKUs in inventory
              </span>
            </div>
          </div>

          {/* Chart Controls Bar: Mode Switcher & Metric Clear */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bar Chart View:</span>
              </span>
              <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setChartMode('volume');
                    setHoveredPoint(null);
                    setHoveredItem(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    chartMode === 'volume'
                      ? 'bg-white text-emerald-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show inbound (+) vs outbound (-) activity movement bars per event"
                >
                  Activity Movement Bars
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChartMode('inventory');
                    setHoveredPoint(null);
                    setHoveredItem(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    chartMode === 'inventory'
                      ? 'bg-white text-emerald-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show current stock level bars across tracked inventory products"
                >
                  Stock Levels by Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChartMode('net_bars');
                    setHoveredPoint(null);
                    setHoveredItem(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    chartMode === 'net_bars'
                      ? 'bg-white text-emerald-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show net inventory movement volume bars"
                >
                  Net Flow Bars
                </button>
              </div>

              {metricFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setMetricFilter('all')}
                  className="inline-flex items-center gap-1 px-2 py-0.8 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                >
                  <span>Show All Events</span>
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium flex-wrap">
              {chartMode === 'inventory' ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                    <span>In Stock (Healthy)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
                    <span>Low Stock (≤ Threshold)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" />
                    <span>Out of Stock (0)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-b-2 border-dashed border-amber-600 inline-block" />
                    <span>Threshold Marker</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                    <span>Stock Added / Inbound (+)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
                    <span>Stock Reduced / Sold (−)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-slate-400 inline-block" />
                    <span>Zero Baseline</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 3. The Interactive SVG Canvas Container */}
          <div
            ref={containerRef}
            id="global-stock-chart-container"
            className="relative w-full rounded-2xl bg-gradient-to-b from-slate-50/50 to-white border border-slate-200/90 p-2 sm:p-3 overflow-hidden select-none"
            onMouseLeave={handleMouseLeave}
          >
            {filteredEvents.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <Clock className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No stock movements recorded in {dateRangeLabel}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Add stock, record sales, or select a wider time period (e.g. "Last 30 Days" or "All Time") to see the visual flow.
                </p>
                <button
                  type="button"
                  onClick={() => setPeriodPreset('all')}
                  className="mt-3 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl cursor-pointer"
                >
                  Switch to All Time
                </button>
              </div>
            ) : (
              <svg
                width={chartWidth}
                height={chartHeight}
                className="overflow-visible cursor-crosshair"
              >
                <defs>
                  {/* Inbound Gradient */}
                  <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Outbound Gradient */}
                  <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.0" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.25" />
                  </linearGradient>

                  {/* Cumulative Curve Gradient */}
                  <linearGradient id="netCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                <g transform={`translate(${margin.left}, ${margin.top})`}>
                  {/* MODE: Inventory Levels by Item Bar Chart */}
                  {chartMode === 'inventory' ? (
                    <>
                      {/* Horizontal Grid Lines */}
                      {yScaleInventory.ticks(4).map((tick, idx) => {
                        const y = yScaleInventory(tick);
                        return (
                          <g key={`inv_grid_${idx}`} className="opacity-40">
                            <line
                              x1={0}
                              y1={y}
                              x2={innerWidth}
                              y2={y}
                              stroke="#cbd5e1"
                              strokeDasharray="2 3"
                            />
                            <text
                              x={-8}
                              y={y + 3}
                              textAnchor="end"
                              className="text-[10px] fill-slate-400 font-mono"
                            >
                              {tick}
                            </text>
                          </g>
                        );
                      })}

                      {/* Zero Baseline */}
                      <line
                        x1={0}
                        y1={innerHeight}
                        x2={innerWidth}
                        y2={innerHeight}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                      />

                      {/* Item Bars */}
                      {topInventoryItems.map((item) => {
                        const x = xScaleInventory(item.id) ?? 0;
                        const barW = Math.max(12, xScaleInventory.bandwidth());
                        const yPos = yScaleInventory(item.quantity || 0);
                        const barH = Math.max(4, innerHeight - yPos);
                        const isZero = (item.quantity || 0) === 0;
                        const isLow = !isZero && (item.quantity || 0) <= (item.lowStockThreshold ?? 5);
                        const barColor = isZero ? '#f43f5e' : isLow ? '#f59e0b' : '#10b981';
                        const isHovered = hoveredItem?.id === item.id;
                        const threshY = yScaleInventory(item.lowStockThreshold ?? 5);

                        return (
                          <g
                            key={`item_bar_group_${item.id}`}
                            className="cursor-pointer group"
                            onClick={() => onViewItemDetails(item)}
                            onMouseEnter={(e) => {
                              setHoveredItem(item);
                              setHoveredPoint(null);
                              const rect = containerRef.current?.getBoundingClientRect();
                              if (rect) {
                                setTooltipPos({
                                  x: e.clientX - rect.left,
                                  y: e.clientY - rect.top,
                                });
                              }
                            }}
                          >
                            {/* Bar Column */}
                            <rect
                              x={x}
                              y={yPos}
                              width={barW}
                              height={barH}
                              rx={3}
                              fill={barColor}
                              className={`transition-all ${
                                isHovered ? 'filter drop-shadow-md brightness-110' : 'opacity-90 hover:opacity-100'
                              }`}
                            />

                            {/* Low Stock Threshold marker line on bar */}
                            {threshY < innerHeight && (
                              <line
                                x1={x - 2}
                                y1={threshY}
                                x2={x + barW + 2}
                                y2={threshY}
                                stroke="#b45309"
                                strokeWidth="2"
                                strokeDasharray="2 2"
                              />
                            )}

                            {/* Top Quantity Value Badge */}
                            <text
                              x={x + barW / 2}
                              y={Math.max(12, yPos - 5)}
                              textAnchor="middle"
                              className="text-[10px] font-mono font-bold fill-slate-700 select-none"
                            >
                              {item.quantity}
                            </text>

                            {/* Item Name Label on X-Axis */}
                            <text
                              x={x + barW / 2}
                              y={innerHeight + 18}
                              textAnchor="middle"
                              className="text-[10px] font-medium fill-slate-600 select-none truncate"
                            >
                              {item.itemName.length > 7 ? item.itemName.slice(0, 6) + '…' : item.itemName}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      {/* Timeline Mode Grid Lines */}
                      {xTicks.map((tick, idx) => {
                        const x = xScale(tick);
                        return (
                          <g key={idx} className="opacity-40">
                            <line
                              x1={x}
                              y1={0}
                              x2={x}
                              y2={innerHeight}
                              stroke="#cbd5e1"
                              strokeDasharray="2 3"
                            />
                            <text
                              x={x}
                              y={innerHeight + 18}
                              textAnchor="middle"
                              className="text-[10px] fill-slate-400 font-mono"
                            >
                              {formatTickDate(tick)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Horizontal Baseline / Zero Line */}
                      <line
                        x1={0}
                        y1={zeroLineY}
                        x2={innerWidth}
                        y2={zeroLineY}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                      />
                      <text
                        x={-8}
                        y={zeroLineY + 3}
                        textAnchor="end"
                        className="text-[10px] fill-slate-400 font-mono font-bold"
                      >
                        0
                      </text>

                      {/* Upper and Lower Boundary Guides */}
                      <line
                        x1={0}
                        y1={0}
                        x2={innerWidth}
                        y2={0}
                        stroke="#e2e8f0"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={-8}
                        y={10}
                        textAnchor="end"
                        className="text-[10px] fill-slate-400 font-mono"
                      >
                        +{Math.round(maxY)}
                      </text>

                      <line
                        x1={0}
                        y1={innerHeight}
                        x2={innerWidth}
                        y2={innerHeight}
                        stroke="#e2e8f0"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={-8}
                        y={innerHeight - 3}
                        textAnchor="end"
                        className="text-[10px] fill-slate-400 font-mono"
                      >
                        -{Math.round(maxY)}
                      </text>

                      {/* Activity Movement Column Bars */}
                      {chartSeries.map((d) => {
                        const x = xScale(d.dateObj);
                        const barWidth = Math.max(8, Math.min(30, innerWidth / (chartSeries.length * 1.35)));
                        const yVal = chartMode === 'net_bars' ? yScaleNetBars(d.delta) : yScaleVolume(d.delta);
                        const isUp = d.delta >= 0;
                        const yPos = isUp ? yVal : zeroLineY;
                        const barHeight = Math.max(4, Math.abs(zeroLineY - yVal));
                        const isSelected = selectedPoint?.id === d.id;
                        const isHovered = hoveredPoint?.id === d.id;

                        return (
                          <g key={`bar_group_${d.id}`}>
                            <rect
                              x={x - barWidth / 2}
                              y={yPos}
                              width={barWidth}
                              height={barHeight}
                              rx={3}
                              className={`transition-all cursor-pointer ${
                                isUp
                                  ? 'fill-emerald-500 hover:fill-emerald-600'
                                  : 'fill-amber-500 hover:fill-amber-600'
                              } ${isSelected ? 'stroke-2 stroke-slate-900 filter drop-shadow-md' : ''}`}
                              onClick={() => setSelectedPoint(d)}
                              onMouseEnter={(e) => {
                                setHoveredPoint(d);
                                setHoveredItem(null);
                                const rect = containerRef.current?.getBoundingClientRect();
                                if (rect) {
                                  setTooltipPos({
                                    x: e.clientX - rect.left,
                                    y: e.clientY - rect.top,
                                  });
                                }
                              }}
                            />

                            {/* Bar value label if bar is wide enough */}
                            {barWidth >= 16 && (
                              <text
                                x={x}
                                y={isUp ? Math.max(10, yPos - 4) : Math.min(innerHeight - 2, yPos + barHeight + 11)}
                                textAnchor="middle"
                                className={`text-[9px] font-mono font-bold select-none ${
                                  isUp ? 'fill-emerald-700' : 'fill-amber-700'
                                }`}
                              >
                                {isUp ? `+${d.delta}` : `${d.delta}`}
                              </text>
                            )}

                            {/* Interactive Target & Marker Node */}
                            <g
                              className="cursor-pointer group"
                              onClick={() => setSelectedPoint(d)}
                              onMouseEnter={(e) => {
                                setHoveredPoint(d);
                                setHoveredItem(null);
                                const rect = containerRef.current?.getBoundingClientRect();
                                if (rect) {
                                  setTooltipPos({
                                    x: e.clientX - rect.left,
                                    y: e.clientY - rect.top,
                                  });
                                }
                              }}
                            >
                              <circle cx={x} cy={yVal} r={12} fill="transparent" />
                              {(isHovered || isSelected) && (
                                <circle
                                  cx={x}
                                  cy={yVal}
                                  r={8}
                                  fill={isUp ? '#10b981' : '#f59e0b'}
                                  fillOpacity="0.3"
                                  className="animate-pulse"
                                />
                              )}
                              <circle
                                cx={x}
                                cy={yVal}
                                r={isSelected ? 5 : isHovered ? 4.5 : 3.5}
                                fill={isUp ? '#10b981' : '#f59e0b'}
                                stroke="#ffffff"
                                strokeWidth={1.5}
                              />
                            </g>
                          </g>
                        );
                      })}
                    </>
                  )}
                </g>
              </svg>
            )}

            {/* Rich Floating Tooltip for Stock Items in Inventory Mode */}
            {hoveredItem && tooltipPos && (
              <div
                className="absolute z-30 pointer-events-none transition-all duration-75 shadow-xl bg-slate-900 text-white rounded-xl p-3 text-xs w-64 border border-slate-700/80 backdrop-blur-md"
                style={{
                  left: Math.min(chartWidth - 280, Math.max(10, tooltipPos.x - 130)),
                  top: Math.max(10, tooltipPos.y - 120),
                }}
              >
                <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-800">
                  <span className="font-bold text-slate-200 truncate">{hoveredItem.itemName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      hoveredItem.quantity === 0
                        ? 'bg-rose-500/20 text-rose-300'
                        : hoveredItem.quantity <= (hoveredItem.lowStockThreshold ?? 5)
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {hoveredItem.quantity === 0
                      ? 'Out of Stock'
                      : hoveredItem.quantity <= (hoveredItem.lowStockThreshold ?? 5)
                      ? 'Low Stock'
                      : 'In Stock'}
                  </span>
                </div>
                <div className="mt-1.5 space-y-1 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Current Stock:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {hoveredItem.quantity} {hoveredItem.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Low Stock Alert:</span>
                    <span className="font-mono text-amber-400">
                      ≤ {hoveredItem.lowStockThreshold ?? 5} {hoveredItem.unit}
                    </span>
                  </div>
                  {hoveredItem.category && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Category:</span>
                      <span className="text-slate-200">{hoveredItem.category}</span>
                    </div>
                  )}
                  {hoveredItem.productionDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Production Date:</span>
                      <span className="text-slate-300 font-mono text-[10px]">
                        {new Date(hoveredItem.productionDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-1.5 pt-1 border-t border-slate-800/80 text-[10px] text-emerald-400 font-semibold text-center">
                  Click bar to inspect product details
                </div>
              </div>
            )}

            {/* Rich Floating Tooltip on Hover */}
            {hoveredPoint && tooltipPos && (
              <div
                className="absolute z-30 pointer-events-none transition-all duration-75 shadow-xl bg-slate-900 text-white rounded-xl p-3 text-xs w-64 border border-slate-700/80 backdrop-blur-md"
                style={{
                  left: Math.min(chartWidth - 280, Math.max(10, tooltipPos.x - 130)),
                  top: Math.max(10, tooltipPos.y - 120),
                }}
              >
                <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-800">
                  <span className="font-bold text-slate-200 truncate">{hoveredPoint.itemName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      hoveredPoint.delta > 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : hoveredPoint.delta < 0
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {hoveredPoint.delta > 0
                      ? `+${hoveredPoint.delta} ${hoveredPoint.unit}`
                      : hoveredPoint.delta < 0
                      ? `${hoveredPoint.delta} ${hoveredPoint.unit}`
                      : 'Updated'}
                  </span>
                </div>

                <div className="mt-1.5 space-y-1 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Action:</span>
                    <span className="font-medium capitalize text-slate-200">
                      {hoveredPoint.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {hoveredPoint.balanceAfter !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Balance After:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {hoveredPoint.balanceAfter} {hoveredPoint.unit}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Operator:</span>
                    <span className="text-slate-200">{hoveredPoint.performedBy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Time:</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {hoveredPoint.dateObj.toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {hoveredPoint.summary && (
                    <p className="text-[10px] text-slate-400 italic line-clamp-1 pt-0.5 border-t border-slate-800">
                      "{hoveredPoint.summary}"
                    </p>
                  )}
                </div>
                <div className="mt-1 pt-1 border-t border-slate-800/80 text-[10px] text-emerald-400 font-semibold text-center">
                  Click node to inspect event & item
                </div>
              </div>
            )}
          </div>

          {/* 4. Clicked Event Inspector Card (when an event is selected from data viz) */}
          {selectedPoint && (
            <div
              id="selected-event-inspector-card"
              className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 shadow-xs space-y-2.5 transition-all"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                      selectedPoint.delta > 0
                        ? 'bg-emerald-600 text-white'
                        : selectedPoint.delta < 0
                        ? 'bg-amber-600 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {selectedPoint.delta > 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : selectedPoint.delta < 0 ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide block">
                      Inspecting Event on Data Viz
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{selectedPoint.itemName}</span>
                      <span className="text-xs text-slate-500 font-normal">({selectedPoint.unit})</span>
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Quick Inspect Item Action */}
                  {(() => {
                    const linkedItem = getLinkedItem(selectedPoint.itemId);
                    if (!linkedItem) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => onViewItemDetails(linkedItem)}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Inspect Full Item Trail</span>
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => setSelectedPoint(null)}
                    className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white border border-slate-200 rounded-lg cursor-pointer"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>

              {/* Event Specific Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="p-2 bg-white/90 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Change / Movement</span>
                  <span
                    className={`text-base font-bold font-mono ${
                      selectedPoint.delta > 0
                        ? 'text-emerald-700'
                        : selectedPoint.delta < 0
                        ? 'text-amber-800'
                        : 'text-slate-800'
                    }`}
                  >
                    {selectedPoint.delta > 0
                      ? `+${selectedPoint.delta} ${selectedPoint.unit}`
                      : selectedPoint.delta < 0
                      ? `${selectedPoint.delta} ${selectedPoint.unit}`
                      : 'Updated'}
                  </span>
                </div>

                <div className="p-2 bg-white/90 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Balance After Event</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {selectedPoint.balanceAfter !== undefined
                      ? `${selectedPoint.balanceAfter} ${selectedPoint.unit}`
                      : '—'}
                  </span>
                </div>

                <div className="p-2 bg-white/90 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Staff / Operator</span>
                  <span className="text-sm font-semibold text-slate-800 truncate block">
                    {selectedPoint.performedBy}
                  </span>
                </div>

                <div className="p-2 bg-white/90 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Timestamp</span>
                  <span className="text-xs font-mono text-slate-700 block truncate">
                    {selectedPoint.dateObj.toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {selectedPoint.summary && (
                <div className="text-xs text-slate-700 bg-white/90 p-2 rounded-xl border border-emerald-200/80">
                  <span className="font-semibold text-slate-900 mr-1.5">Note / Log:</span>
                  <span>{selectedPoint.summary}</span>
                  {selectedPoint.details && (
                    <span className="text-slate-500 ml-1">({selectedPoint.details})</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
