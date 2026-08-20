import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  TrendingUp, Calendar, ShieldAlert, FileCheck2, 
  Eye, Activity, Sparkles, Filter, Info
} from 'lucide-react';
import { AuditLog, AuditAction } from '../types';

export interface AuditFrequencyChartProps {
  logs: AuditLog[];
  className?: string;
}

type MetricFilter = 'ALL' | 'DEALS' | 'SCREENERS' | 'SECURITY';
type TimeRangeDays = 7 | 14 | 30;

interface DailyDataPoint {
  date: Date;
  dateKey: string;
  displayDate: string;
  total: number;
  deals: number;
  screeners: number;
  security: number;
  operations: number;
  logs: AuditLog[];
}

export const AuditFrequencyChart: React.FC<AuditFrequencyChartProps> = ({
  logs,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 260 });
  const [timeRange, setTimeRange] = useState<TimeRangeDays>(30);
  const [activeMetric, setActiveMetric] = useState<MetricFilter>('ALL');
  const [hoveredPoint, setHoveredPoint] = useState<DailyDataPoint | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // ResizeObserver for responsive SVG dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        setDimensions({
          width: Math.max(320, width),
          height: 250
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Process logs into daily bins for the selected time range (last N days)
  const chartData = useMemo<DailyDataPoint[]>(() => {
    const now = new Date();
    const days: DailyDataPoint[] = [];

    // Create daily bins starting from (now - timeRange + 1 days) up to today
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      days.push({
        date: d,
        dateKey,
        displayDate,
        total: 0,
        deals: 0,
        screeners: 0,
        security: 0,
        operations: 0,
        logs: []
      });
    }

    const dayMap = new Map<string, DailyDataPoint>();
    days.forEach(day => dayMap.set(day.dateKey, day));

    // Populate counts from audit logs
    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);
      const key = logDate.toISOString().split('T')[0];
      const entry = dayMap.get(key);

      if (entry) {
        entry.total += 1;
        entry.logs.push(log);

        if (log.action === 'RLS_VIOLATION') {
          entry.security += 1;
        } else if (
          log.action === 'deal_signed' || 
          log.action === 'deal_proposed' || 
          log.action.includes('deal') || 
          log.action.includes('contract')
        ) {
          entry.deals += 1;
        } else if (
          log.action === 'screener_viewed' || 
          log.action === 'screener_created' || 
          log.action.includes('screener')
        ) {
          entry.screeners += 1;
        } else {
          entry.operations += 1;
        }
      }
    });

    return days;
  }, [logs, timeRange]);

  // Overall metric stats for the chart header
  const stats = useMemo(() => {
    const totalEvents = chartData.reduce((acc, d) => acc + d.total, 0);
    const fallbackPoint: DailyDataPoint = {
      date: new Date(),
      dateKey: '',
      displayDate: 'N/A',
      total: 0,
      deals: 0,
      screeners: 0,
      security: 0,
      operations: 0,
      logs: []
    };
    const peakDay = chartData.reduce((max, d) => d.total > max.total ? d : max, chartData[0] || fallbackPoint);
    const dailyAvg = (totalEvents / timeRange).toFixed(1);
    const totalSecurity = chartData.reduce((acc, d) => acc + d.security, 0);
    const totalDeals = chartData.reduce((acc, d) => acc + d.deals, 0);
    const totalScreeners = chartData.reduce((acc, d) => acc + d.screeners, 0);

    return { totalEvents, peakDay, dailyAvg, totalSecurity, totalDeals, totalScreeners };
  }, [chartData, timeRange]);

  // Get active value selector function based on activeMetric
  const getValue = (d: DailyDataPoint): number => {
    switch (activeMetric) {
      case 'SECURITY': return d.security;
      case 'DEALS': return d.deals;
      case 'SCREENERS': return d.screeners;
      case 'ALL':
      default: return d.total;
    }
  };

  const getMetricColor = (): { stroke: string; fillGradient: string; dot: string } => {
    switch (activeMetric) {
      case 'SECURITY':
        return { stroke: '#e11d48', fillGradient: 'securityGradient', dot: '#be123c' };
      case 'DEALS':
        return { stroke: '#059669', fillGradient: 'dealsGradient', dot: '#047857' };
      case 'SCREENERS':
        return { stroke: '#7c3aed', fillGradient: 'screenersGradient', dot: '#6d28d9' };
      case 'ALL':
      default:
        return { stroke: '#2563eb', fillGradient: 'totalGradient', dot: '#1d4ed8' };
    }
  };

  // Render D3 chart
  useEffect(() => {
    if (!svgRef.current || chartData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 24, bottom: 32, left: 38 };
    const innerWidth = Math.max(10, width - margin.left - margin.right);
    const innerHeight = Math.max(10, height - margin.top - margin.bottom);

    // Defs for gradients and drop-shadow
    const defs = svg.append('defs');

    // Gradient definitions
    const createLinearGradient = (id: string, startColor: string, stopColor: string) => {
      const grad = defs.append('linearGradient')
        .attr('id', id)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', startColor).attr('stop-opacity', 0.28);
      grad.append('stop').attr('offset', '80%').attr('stop-color', stopColor).attr('stop-opacity', 0.04);
      grad.append('stop').attr('offset', '100%').attr('stop-color', stopColor).attr('stop-opacity', 0.0);
    };

    createLinearGradient('totalGradient', '#3b82f6', '#1d4ed8');
    createLinearGradient('dealsGradient', '#10b981', '#047857');
    createLinearGradient('screenersGradient', '#8b5cf6', '#6d28d9');
    createLinearGradient('securityGradient', '#f43f5e', '#be123c');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(chartData, d => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const maxVal = d3.max(chartData, d => getValue(d)) || 5;
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(4, maxVal * 1.15)])
      .nice()
      .range([innerHeight, 0]);

    // Horizontal grid lines
    const yTicks = yScale.ticks(4);
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#f1f5f9')
      .attr('stroke-dasharray', '3 3')
      .attr('stroke-width', 1);

    // Y Axis labels
    g.append('g')
      .selectAll('text')
      .data(yTicks)
      .enter()
      .append('text')
      .attr('x', -8)
      .attr('y', d => yScale(d) + 3)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('fill', '#94a3b8')
      .text(d => d);

    // X Axis ticks and labels
    const tickCount = timeRange === 7 ? 7 : (timeRange === 14 ? 7 : Math.min(8, Math.floor(innerWidth / 65)));
    const xTicks = xScale.ticks(tickCount);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .selectAll('text')
      .data(xTicks)
      .enter()
      .append('text')
      .attr('x', d => xScale(d))
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', '#64748b')
      .text(d => d3.timeFormat(timeRange === 7 ? '%a %d' : '%b %d')(d));

    // Area Generator
    const { stroke, fillGradient, dot } = getMetricColor();
    const areaGenerator = d3.area<DailyDataPoint>()
      .x(d => xScale(d.date))
      .y0(innerHeight)
      .y1(d => yScale(getValue(d)))
      .curve(d3.curveMonotoneX);

    // Line Generator
    const lineGenerator = d3.line<DailyDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(getValue(d)))
      .curve(d3.curveMonotoneX);

    // Draw Filled Area
    g.append('path')
      .datum(chartData)
      .attr('d', areaGenerator)
      .attr('fill', `url(#${fillGradient})`);

    // Draw Main Line
    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', stroke)
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGenerator);

    // Data points / circles
    g.selectAll('.data-circle')
      .data(chartData.filter(d => getValue(d) > 0))
      .enter()
      .append('circle')
      .attr('class', 'data-circle')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(getValue(d)))
      .attr('r', timeRange === 7 ? 4.5 : 3.5)
      .attr('fill', '#ffffff')
      .attr('stroke', dot)
      .attr('stroke-width', 2);

    // Bisector for interactive mouse tracking
    const bisectDate = d3.bisector<DailyDataPoint, Date>(d => d.date).center;

    // Transparent overlay for capturing pointer events
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('mousemove', (event: MouseEvent) => {
        const [pointerX] = d3.pointer(event);
        const x0 = xScale.invert(pointerX);
        const index = bisectDate(chartData, x0);
        const selected = chartData[index];

        if (selected) {
          setHoveredPoint(selected);
          const cx = xScale(selected.date) + margin.left;
          const cy = yScale(getValue(selected)) + margin.top;
          setHoverPosition({ x: cx, y: cy });
        }
      })
      .on('mouseleave', () => {
        setHoveredPoint(null);
        setHoverPosition(null);
      });

  }, [chartData, dimensions, activeMetric, timeRange]);

  return (
    <div id="audit-frequency-chart-container" className={`bg-white border border-slate-200 rounded-2xl shadow-2xs p-4 sm:p-5 space-y-4 ${className}`}>
      {/* Chart Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
            <Activity size={17} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Audit Event Frequency</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                Last {timeRange} Days
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Temporal distribution of security alerts, deal negotiations, screener streams, and actor events
            </p>
          </div>
        </div>

        {/* Time Range Selector & Metric Mode Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveMetric('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeMetric === 'ALL' 
                  ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setActiveMetric('SECURITY')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeMetric === 'SECURITY' 
                  ? 'bg-white text-rose-700 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveMetric('DEALS')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeMetric === 'DEALS' 
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Deals
            </button>
            <button
              onClick={() => setActiveMetric('SCREENERS')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeMetric === 'SCREENERS' 
                  ? 'bg-white text-violet-700 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Screeners
            </button>
          </div>

          {/* Time Range Tabs */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-xl text-xs font-semibold">
            {( [7, 14, 30] as TimeRangeDays[] ).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer font-mono text-[11px] ${
                  timeRange === range 
                    ? 'bg-slate-900 text-white shadow-2xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total in Period</div>
          <div className="text-lg font-black text-slate-900 tracking-tight">{stats.totalEvents}</div>
        </div>
        <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Daily Average</div>
          <div className="text-lg font-black text-blue-600 tracking-tight">{stats.dailyAvg} <span className="text-[10px] font-normal text-slate-400">/ day</span></div>
        </div>
        <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Peak Volume</div>
          <div className="text-lg font-black text-slate-900 tracking-tight">
            {stats.peakDay.total} <span className="text-[10px] font-normal text-slate-400 font-mono">({stats.peakDay.displayDate})</span>
          </div>
        </div>
        <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Blocked Breaches</div>
          <div className={`text-lg font-black tracking-tight ${stats.totalSecurity > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {stats.totalSecurity}
          </div>
        </div>
      </div>

      {/* D3 SVG Chart Stage with Hover Tooltip */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full overflow-visible"
        />

        {/* Hover Crosshair Point and Tooltip */}
        {hoveredPoint && hoverPosition && (
          <>
            {/* Vertical crosshair line indicator */}
            <div 
              className="absolute top-5 bottom-8 w-[1px] bg-slate-300 pointer-events-none transition-all"
              style={{ left: `${hoverPosition.x}px` }}
            />

            {/* Glowing target circle indicator */}
            <div 
              className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 border-white pointer-events-none shadow-md"
              style={{ 
                left: `${hoverPosition.x}px`, 
                top: `${hoverPosition.y}px`,
                backgroundColor: getMetricColor().dot
              }}
            />

            {/* Floating Details Tooltip */}
            <div 
              className="absolute z-20 pointer-events-none bg-slate-950/95 text-white text-xs p-3 rounded-xl shadow-xl backdrop-blur-sm border border-slate-800 space-y-1.5 min-w-[190px] transition-transform duration-75"
              style={{
                left: `${Math.min(dimensions.width - 200, Math.max(10, hoverPosition.x - 95))}px`,
                top: `${Math.max(10, hoverPosition.y - 120)}px`
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                <span className="font-bold text-slate-200">{hoveredPoint.displayDate}</span>
                <span className="font-mono text-[10px] text-slate-400">{hoveredPoint.dateKey}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Total Events:</span>
                <span className="font-bold text-white font-mono">{hoveredPoint.total}</span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[10px] text-slate-300 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400">Deals:</span>
                  <span>{hoveredPoint.deals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-violet-400">Screeners:</span>
                  <span>{hoveredPoint.screeners}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rose-400">Security:</span>
                  <span>{hoveredPoint.security}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ops:</span>
                  <span>{hoveredPoint.operations}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
