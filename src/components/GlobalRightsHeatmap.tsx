/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { 
  Globe, ZoomIn, ZoomOut, RotateCcw, Filter, Film, 
  DollarSign, CheckCircle2, AlertTriangle, Lock, Unlock, 
  ChevronRight, Info, Sparkles, Layers, Send, Eye, ShieldCheck, MapPin
} from 'lucide-react';
import { MediaAsset, RightsCatalogueEntry, UserRole } from '../types';
import { getCountryInfo, doesTerritoryMatchCountry, CountryInfo } from '../utils/countryData';

interface GlobalRightsHeatmapProps {
  assets: MediaAsset[];
  rights: RightsCatalogueEntry[];
  userRole?: UserRole;
  onProposeDeal?: (rightsEntry: RightsCatalogueEntry, asset: MediaAsset, suggestedCountry?: string) => void;
  onGenerateScreener?: (asset: MediaAsset) => void;
  onSelectFilm?: (assetId: string) => void;
}

type HeatmapMetricMode = 'status' | 'valuation' | 'exclusivity';

export const GlobalRightsHeatmap: React.FC<GlobalRightsHeatmapProps> = ({
  assets,
  rights,
  userRole = 'BUYER',
  onProposeDeal,
  onGenerateScreener,
  onSelectFilm
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Filter States
  const [selectedAssetId, setSelectedAssetId] = useState<string>('all');
  const [selectedLicenseType, setSelectedLicenseType] = useState<string>('all');
  const [metricMode, setMetricMode] = useState<HeatmapMetricMode>('status');
  const [focusedRegion, setFocusedRegion] = useState<string>('all');

  // Interactive Hover & Selection
  const [hoveredCountry, setHoveredCountry] = useState<{
    country: CountryInfo;
    status: 'AVAILABLE' | 'LICENSED' | 'ON_HOLD' | 'UNASSIGNED';
    matchingRights: RightsCatalogueEntry[];
    matchingAssets: MediaAsset[];
    x: number;
    y: number;
  } | null>(null);

  const [selectedCountryInfo, setSelectedCountryInfo] = useState<{
    country: CountryInfo;
    status: 'AVAILABLE' | 'LICENSED' | 'ON_HOLD' | 'UNASSIGNED';
    matchingRights: RightsCatalogueEntry[];
    matchingAssets: MediaAsset[];
  } | null>(null);

  // TopoJSON parsed GeoJSON features
  const geoFeatures = useMemo(() => {
    try {
      const countriesGeo: any = feature(worldData as any, (worldData as any).objects.countries);
      return countriesGeo.features || [];
    } catch (e) {
      console.error('Failed to parse TopoJSON:', e);
      return [];
    }
  }, []);

  // Compute licensing status and valuation for every country based on active filters
  const countryStatusMap = useMemo(() => {
    const map = new Map<string, {
      country: CountryInfo;
      status: 'AVAILABLE' | 'LICENSED' | 'ON_HOLD' | 'UNASSIGNED';
      matchingRights: RightsCatalogueEntry[];
      matchingAssets: MediaAsset[];
      totalValuation: number;
      isExclusive: boolean;
    }>();

    // Filter relevant rights entries
    const activeRights = rights.filter(r => {
      if (selectedAssetId !== 'all' && r.assetId !== selectedAssetId) return false;
      if (selectedLicenseType !== 'all' && !r.licenseTypes.includes(selectedLicenseType as any)) return false;
      return true;
    });

    geoFeatures.forEach((feat: any) => {
      const country = getCountryInfo(feat.id);
      if (!country) return;

      const matchingRightsForCountry: RightsCatalogueEntry[] = [];
      const matchingAssetsForCountry: MediaAsset[] = [];
      let status: 'AVAILABLE' | 'LICENSED' | 'ON_HOLD' | 'UNASSIGNED' = 'UNASSIGNED';
      let totalValuation = 0;
      let isExclusive = false;

      activeRights.forEach(r => {
        const isMatched = r.territories.some(t => doesTerritoryMatchCountry(t, country));
        if (isMatched) {
          matchingRightsForCountry.push(r);
          const asset = assets.find(a => a.id === r.assetId);
          if (asset && !matchingAssetsForCountry.some(a => a.id === asset.id)) {
            matchingAssetsForCountry.push(asset);
          }
          if (r.price) totalValuation += r.price;
          if (r.exclusivity) isExclusive = true;
        }
      });

      if (matchingRightsForCountry.length > 0) {
        // Priority: If ANY matching right is AVAILABLE -> AVAILABLE, else LICENSED / ON_HOLD
        const hasAvailable = matchingRightsForCountry.some(r => r.availabilityStatus === 'AVAILABLE');
        const hasHold = matchingRightsForCountry.some(r => r.availabilityStatus === 'ON_HOLD');
        const hasLicensed = matchingRightsForCountry.some(r => r.availabilityStatus === 'LICENSED');

        if (hasAvailable) {
          status = 'AVAILABLE';
        } else if (hasLicensed) {
          status = 'LICENSED';
        } else if (hasHold) {
          status = 'ON_HOLD';
        }
      }

      map.set(String(feat.id), {
        country,
        status,
        matchingRights: matchingRightsForCountry,
        matchingAssets: matchingAssetsForCountry,
        totalValuation,
        isExclusive
      });
    });

    return map;
  }, [geoFeatures, rights, assets, selectedAssetId, selectedLicenseType]);

  // Aggregate Stats
  const stats = useMemo(() => {
    let availableCount = 0;
    let licensedCount = 0;
    let totalValuation = 0;
    let totalAssigned = 0;

    countryStatusMap.forEach((item) => {
      if (item.status === 'AVAILABLE') availableCount++;
      if (item.status === 'LICENSED') licensedCount++;
      if (item.status !== 'UNASSIGNED') totalAssigned++;
      totalValuation += item.totalValuation;
    });

    const totalKeyMarkets = countryStatusMap.size || 1;
    const marketPenetration = Math.round((totalAssigned / totalKeyMarkets) * 100);

    return {
      availableCount,
      licensedCount,
      totalValuation,
      marketPenetration
    };
  }, [countryStatusMap]);

  // Color generator based on mode & status
  const getCountryFill = (data: {
    status: 'AVAILABLE' | 'LICENSED' | 'ON_HOLD' | 'UNASSIGNED';
    totalValuation: number;
    isExclusive: boolean;
  } | undefined) => {
    if (!data || data.status === 'UNASSIGNED') {
      return '#334155'; // Dark slate slate-700
    }

    if (metricMode === 'valuation') {
      if (data.totalValuation === 0) return '#1e293b';
      // Scale from cyan to bright blue to emerald
      const val = data.totalValuation;
      if (val > 500000) return '#10b981'; // Emerald
      if (val > 250000) return '#06b6d4'; // Cyan
      if (val > 100000) return '#3b82f6'; // Blue
      return '#6366f1'; // Indigo
    }

    if (metricMode === 'exclusivity') {
      if (data.isExclusive) return '#ec4899'; // Pink/Rose
      if (data.status === 'AVAILABLE') return '#10b981';
      return '#64748b';
    }

    // Default: 'status'
    switch (data.status) {
      case 'AVAILABLE':
        return '#10b981'; // Emerald 500
      case 'LICENSED':
        return '#8b5cf6'; // Violet 500
      case 'ON_HOLD':
        return '#f59e0b'; // Amber 500
      default:
        return '#334155';
    }
  };

  // D3 Render & Projection Setup
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || geoFeatures.length === 0) return;

    const width = 960;
    const height = 480;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Natural Earth projection fits world nicely
    const projection = d3.geoNaturalEarth1()
      .scale(155)
      .translate([width / 2, height / 2 + 10]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Zoom setup
    const g = svg.append('g').attr('class', 'map-root');

    // Sphere backdrop / Ocean
    g.append('path')
      .datum({ type: 'Sphere' })
      .attr('class', 'sphere')
      .attr('d', pathGenerator as any)
      .attr('fill', '#090d16')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1);

    // Graticules (lat/long grid lines)
    const graticule = d3.geoGraticule();
    g.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', pathGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.6);

    // Country paths
    const countryPaths = g.selectAll<SVGPathElement, any>('path.country')
      .data(geoFeatures)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', pathGenerator as any)
      .attr('id', (d: any) => `country-${d.id}`)
      .attr('fill', (d: any) => {
        const item = countryStatusMap.get(String(d.id));
        return getCountryFill(item);
      })
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 0.6)
      .attr('cursor', 'pointer')
      .style('transition', 'fill 0.25s ease, stroke 0.25s ease')
      .on('mouseenter', function (event: MouseEvent, d: any) {
        d3.select(this)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.6)
          .raise();

        const item = countryStatusMap.get(String(d.id));
        const country = item?.country || getCountryInfo(d.id);
        
        if (country) {
          const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
          setHoveredCountry({
            country,
            status: item?.status || 'UNASSIGNED',
            matchingRights: item?.matchingRights || [],
            matchingAssets: item?.matchingAssets || [],
            x: mouseX,
            y: mouseY
          });
        }
      })
      .on('mousemove', function (event: MouseEvent) {
        if (containerRef.current) {
          const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
          setHoveredCountry(prev => prev ? { ...prev, x: mouseX, y: mouseY } : null);
        }
      })
      .on('mouseleave', function (event: MouseEvent, d: any) {
        const item = countryStatusMap.get(String(d.id));
        const isSelected = selectedCountryInfo?.country.id === String(d.id);
        d3.select(this)
          .attr('stroke', isSelected ? '#38bdf8' : '#1e293b')
          .attr('stroke-width', isSelected ? 2 : 0.6)
          .attr('fill', getCountryFill(item));
        setHoveredCountry(null);
      })
      .on('click', function (event: MouseEvent, d: any) {
        const item = countryStatusMap.get(String(d.id));
        const country = item?.country || getCountryInfo(d.id);
        if (country) {
          setSelectedCountryInfo({
            country,
            status: item?.status || 'UNASSIGNED',
            matchingRights: item?.matchingRights || [],
            matchingAssets: item?.matchingAssets || []
          });
        }
      });

    // Setup zoom handler
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [width, height]])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

  }, [geoFeatures, countryStatusMap, metricMode]);

  // Zoom control helpers
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.4);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    setFocusedRegion('all');
  };

  const handleFocusRegion = (region: string) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    setFocusedRegion(region);

    let scale = 1;
    let translate: [number, number] = [0, 0];

    switch (region) {
      case 'North America':
        scale = 2.2;
        translate = [-280, -30];
        break;
      case 'Europe':
        scale = 2.8;
        translate = [-760, -70];
        break;
      case 'Asia-Pacific':
        scale = 2.2;
        translate = [-1100, -180];
        break;
      case 'Latin America':
        scale = 2.0;
        translate = [-360, -320];
        break;
      case 'Middle East & Africa':
        scale = 2.0;
        translate = [-750, -200];
        break;
      default:
        handleResetZoom();
        return;
    }

    d3.select(svgRef.current)
      .transition()
      .duration(600)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                <Globe size={18} />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>D3 Interactive Territorial Rights Heatmap</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  LIVE VISUALIZER
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Explore global licensing coverage, holdbacks, and territorial availability across international film markets. Filter by title, license type, or valuation density.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Mkts</p>
              <p className="text-lg font-black text-emerald-400 mt-0.5">{stats.availableCount}</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Licensed Mkts</p>
              <p className="text-lg font-black text-purple-400 mt-0.5">{stats.licensedCount}</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Global Reach</p>
              <p className="text-lg font-black text-blue-400 mt-0.5">{stats.marketPenetration}%</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rights Pool</p>
              <p className="text-lg font-black text-amber-400 mt-0.5">${(stats.totalValuation / 1000).toFixed(0)}k</p>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Film Selector */}
            <div className="flex items-center space-x-2">
              <Film size={14} className="text-blue-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-300">Film:</span>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[220px] truncate"
              >
                <option value="all">🎬 All Catalogue Titles (Aggregate)</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.releaseYear})
                  </option>
                ))}
              </select>
            </div>

            {/* License Window Type */}
            <div className="flex items-center space-x-2">
              <Filter size={14} className="text-purple-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-300">Right:</span>
              <select
                value={selectedLicenseType}
                onChange={(e) => setSelectedLicenseType(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Windows</option>
                <option value="SVOD">SVOD (Subscription)</option>
                <option value="TVOD">TVOD (Transactional)</option>
                <option value="AVOD">AVOD (Ad-Supported)</option>
                <option value="THEATRICAL">Theatrical Cinema</option>
                <option value="PAY_TV">Pay TV</option>
                <option value="FREE_TV">Free Linear TV</option>
              </select>
            </div>

            {/* Metric Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Layers size={14} className="text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-300">Layer:</span>
              <div className="inline-flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
                <button
                  onClick={() => setMetricMode('status')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    metricMode === 'status' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Status
                </button>
                <button
                  onClick={() => setMetricMode('valuation')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    metricMode === 'valuation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Valuation ($)
                </button>
                <button
                  onClick={() => setMetricMode('exclusivity')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    metricMode === 'exclusivity' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Exclusivity
                </button>
              </div>
            </div>
          </div>

          {/* Quick Region Focal Buttons */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Focus:</span>
            {['all', 'North America', 'Europe', 'Asia-Pacific', 'Latin America'].map((reg) => (
              <button
                key={reg}
                onClick={() => handleFocusRegion(reg)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                  focusedRegion === reg
                    ? 'bg-slate-700 text-white border-slate-500 shadow-xs'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {reg === 'all' ? 'World' : reg === 'North America' ? 'NA' : reg === 'Asia-Pacific' ? 'APAC' : reg === 'Latin America' ? 'LATAM' : reg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SVG Map Card */}
        <div 
          ref={containerRef}
          className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-3xl p-4 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[500px]"
        >
          {/* Top overlay controls */}
          <div className="flex items-center justify-between z-10 px-2 pt-2">
            {/* Active Legend */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 text-xs">
              {metricMode === 'status' && (
                <>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                    <span className="text-slate-300 font-semibold text-[11px]">Available for Licensing</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                    <span className="text-slate-300 font-semibold text-[11px]">Exclusively Licensed</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                    <span className="text-slate-300 font-semibold text-[11px]">Hold / Offer Pending</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-700" />
                    <span className="text-slate-400 text-[11px]">Unassigned Territory</span>
                  </div>
                </>
              )}

              {metricMode === 'valuation' && (
                <>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-300 text-[11px]">&gt;$500k MG</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-cyan-500" />
                    <span className="text-slate-300 text-[11px]">$250k - $500k</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-slate-300 text-[11px]">$100k - $250k</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-slate-300 text-[11px]">&lt;$100k</span>
                  </div>
                </>
              )}

              {metricMode === 'exclusivity' && (
                <>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-pink-500" />
                    <span className="text-slate-300 font-semibold text-[11px]">Strict Exclusivity Bound</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-300 font-semibold text-[11px]">Non-Exclusive Window</span>
                  </div>
                </>
              )}
            </div>

            {/* D3 Zoom Controls */}
            <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ZoomIn size={15} />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ZoomOut size={15} />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset View"
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          {/* D3 SVG Element */}
          <div className="w-full my-auto flex items-center justify-center">
            <svg
              ref={svgRef}
              viewBox="0 0 960 480"
              className="w-full h-auto max-h-[460px] select-none"
            />
          </div>

          {/* Dynamic Floating Tooltip */}
          {hoveredCountry && (
            <div
              className="absolute pointer-events-none z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 text-white rounded-2xl p-4 shadow-2xl min-w-[260px] max-w-sm transition-all duration-75"
              style={{
                left: Math.min(Math.max(hoveredCountry.x - 120, 15), 640),
                top: Math.max(hoveredCountry.y - 150, 15)
              }}
            >
              {/* Header: Territory Name & Status */}
              <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin size={13} className="text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-white leading-tight">
                      {hoveredCountry.country.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({hoveredCountry.country.code})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    {hoveredCountry.country.region} · Tier {hoveredCountry.country.tier} Market
                  </span>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase tracking-wider shrink-0 border ${
                  hoveredCountry.status === 'AVAILABLE'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs shadow-emerald-500/20'
                    : hoveredCountry.status === 'LICENSED'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs shadow-purple-500/20'
                    : hoveredCountry.status === 'ON_HOLD'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {hoveredCountry.status === 'AVAILABLE' ? '✓ Available' : hoveredCountry.status === 'LICENSED' ? '🔒 Licensed' : hoveredCountry.status === 'ON_HOLD' ? '⏳ On Hold' : 'Unassigned'}
                </span>
              </div>

              {/* Film Title and Specific Licensing Metadata */}
              <div className="space-y-1.5 text-[11px] text-slate-300">
                {/* Specific Film Title */}
                <div className="flex items-start space-x-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                  <Film size={13} className="text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-mono uppercase text-slate-400 font-bold block">Film Title:</span>
                    <span className="text-xs font-bold text-white truncate block">
                      {selectedAssetId !== 'all' && selectedAsset
                        ? `${selectedAsset.title} (${selectedAsset.releaseYear})`
                        : hoveredCountry.matchingAssets.length > 0
                        ? hoveredCountry.matchingAssets.map(a => a.title).join(', ')
                        : 'All Catalog Titles (Global Pool)'}
                    </span>
                  </div>
                </div>

                {/* Rights details */}
                {hoveredCountry.matchingRights.length > 0 ? (
                  <div className="space-y-1 pt-1 font-mono text-[10px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Available Windows:</span>
                      <span className="text-slate-200 font-semibold truncate max-w-[140px]">
                        {Array.from(new Set(hoveredCountry.matchingRights.flatMap(r => r.licenseTypes))).join(' / ')}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Est. Valuation / MG:</span>
                      <span className="text-emerald-400 font-bold">
                        ${hoveredCountry.matchingRights.reduce((sum, r) => sum + (r.price || 0), 0).toLocaleString()} USD
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Exclusivity:</span>
                      <span className={hoveredCountry.matchingRights.some(r => r.exclusivity) ? 'text-purple-300 font-semibold' : 'text-slate-300'}>
                        {hoveredCountry.matchingRights.some(r => r.exclusivity) ? 'Exclusive Package' : 'Non-Exclusive'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[10px] pt-1">
                    No active package listed. Open for direct studio inquiry.
                  </p>
                )}
              </div>

              {/* Call to action */}
              <div className="text-[9px] font-semibold text-blue-400 mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span>Click territory to inspect &amp; propose deal</span>
                <ChevronRight size={11} className="text-blue-400" />
              </div>
            </div>
          )}

          {/* Bottom Bar Info */}
          <div className="px-2 pb-1 text-[11px] text-slate-500 flex items-center justify-between z-10">
            <span className="flex items-center space-x-1.5">
              <Sparkles size={12} className="text-blue-400" />
              <span>Scroll to zoom · Click and drag to pan · Click territory for instant acquisition drawer</span>
            </span>
            <span>Projection: D3 Natural Earth 1</span>
          </div>
        </div>

        {/* Territory & Deal Details Side Panel */}
        <div className="lg:col-span-4 space-y-4">
          {selectedCountryInfo ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                    <h4 className="text-lg font-black text-slate-900">{selectedCountryInfo.country.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedCountryInfo.country.region} · Tier {selectedCountryInfo.country.tier} Film Market
                  </p>
                </div>

                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                  selectedCountryInfo.status === 'AVAILABLE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : selectedCountryInfo.status === 'LICENSED'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : selectedCountryInfo.status === 'ON_HOLD'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedCountryInfo.status}
                </span>
              </div>

              {/* Market Economics */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Territory Code</span>
                  <span className="font-bold text-slate-800">{selectedCountryInfo.country.code} / {selectedCountryInfo.country.alpha3}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Est. Market Size</span>
                  <span className="font-bold text-slate-800">${(selectedCountryInfo.country.estimatedMarketSizeUSD / 1000000).toFixed(1)}M/yr</span>
                </div>
              </div>

              {/* Matching Titles & Rights */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Associated Titles &amp; Rights ({selectedCountryInfo.matchingRights.length})
                </h5>

                {selectedCountryInfo.matchingRights.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-500 text-center space-y-2">
                    <p>No explicit right listed for this territory under current filter.</p>
                    {userRole === 'BUYER' && (
                      <p className="text-[11px] text-blue-600 font-semibold">
                        You can submit an unlisted licensing inquiry to studio legal.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedCountryInfo.matchingRights.map((entry) => {
                      const asset = assets.find(a => a.id === entry.assetId);
                      if (!asset) return null;

                      return (
                        <div
                          key={entry.id}
                          className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-xs text-slate-900">{asset.title}</div>
                            <span className="text-xs font-bold text-emerald-600">${entry.price?.toLocaleString()}</span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {entry.licenseTypes.map(t => (
                              <span key={t} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-700">
                                {t}
                              </span>
                            ))}
                            {entry.exclusivity && (
                              <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <Lock size={9} /> Exclusive
                              </span>
                            )}
                          </div>

                          {/* Action for Buyers */}
                          {entry.availabilityStatus === 'AVAILABLE' && onProposeDeal && (
                            <button
                              onClick={() => onProposeDeal(entry, asset, selectedCountryInfo.country.name)}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                            >
                              <Send size={12} />
                              <span>Submit Offer for {selectedCountryInfo.country.code}</span>
                            </button>
                          )}

                          {onGenerateScreener && (
                            <button
                              onClick={() => onGenerateScreener(asset)}
                              className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                            >
                              <Eye size={12} />
                              <span>Generate Watermarked Screener</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Close / Dismiss */}
              <button
                onClick={() => setSelectedCountryInfo(null)}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-center"
              >
                Close Country Panel
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <MapPin size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Territory Inspection Guide</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Click on any territory on the global D3 map to inspect available license packages, minimum guarantees, studio ownership, and submit immediate bids.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Fast Insights:</p>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li><strong className="text-emerald-700">Green regions</strong> denote immediate availability for deal submission.</li>
                  <li><strong className="text-purple-700">Purple regions</strong> have executed distribution contracts.</li>
                  <li>Use the <strong>Film dropdown</strong> to inspect specific single-title territorial rights.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
