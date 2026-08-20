import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { MediaAsset, RightsCatalogueEntry, DealRequest } from '../types';
import { 
  Globe, ZoomIn, ZoomOut, RotateCcw, ShieldCheck, 
  DollarSign, Sparkles, CheckCircle2, AlertCircle, 
  Search, SlidersHorizontal, Lock, ArrowUpRight, Film,
  MapPin, Eye, Building2
} from 'lucide-react';

export interface TerritoryHeatmapD3Props {
  assets: MediaAsset[];
  rights: RightsCatalogueEntry[];
  deals: DealRequest[];
  selectedAssetId?: string;
  onSelectAsset?: (assetId: string) => void;
  onProposeDeal?: (rightsEntry: RightsCatalogueEntry, asset: MediaAsset, customCountry?: string) => void;
  userRole?: string;
}

interface CountryTerritoryInfo {
  id: string;
  name: string;
  region: string;
  status: 'LICENSED' | 'AVAILABLE' | 'PENDING' | 'HOLDBACK';
  price: number;
  licenseTypes: string[];
  exclusivity: boolean;
  buyerName?: string;
  licenseEnd?: number;
  filmTitle?: string;
  matchingRightsEntry?: RightsCatalogueEntry;
}

// Comprehensive mapping of country ISO numeric codes / names to territories
const COUNTRY_REGION_MAP: Record<string, { name: string; region: string; defaultStatus?: 'LICENSED' | 'AVAILABLE' }> = {
  '840': { name: 'United States', region: 'North America' },
  '124': { name: 'Canada', region: 'North America' },
  '484': { name: 'Mexico', region: 'Latin America' },
  '076': { name: 'Brazil', region: 'Latin America' },
  '032': { name: 'Argentina', region: 'Latin America' },
  '152': { name: 'Chile', region: 'Latin America' },
  '170': { name: 'Colombia', region: 'Latin America' },
  '604': { name: 'Peru', region: 'Latin America' },
  '826': { name: 'United Kingdom', region: 'Europe' },
  '276': { name: 'Germany', region: 'Europe' },
  '250': { name: 'France', region: 'Europe' },
  '380': { name: 'Italy', region: 'Europe' },
  '724': { name: 'Spain', region: 'Europe' },
  '528': { name: 'Netherlands', region: 'Europe' },
  '056': { name: 'Belgium', region: 'Europe' },
  '752': { name: 'Sweden', region: 'Europe' },
  '578': { name: 'Norway', region: 'Europe' },
  '208': { name: 'Denmark', region: 'Europe' },
  '246': { name: 'Finland', region: 'Europe' },
  '616': { name: 'Poland', region: 'Europe' },
  '040': { name: 'Austria', region: 'Europe' },
  '756': { name: 'Switzerland', region: 'Europe' },
  '372': { name: 'Ireland', region: 'Europe' },
  '620': { name: 'Portugal', region: 'Europe' },
  '300': { name: 'Greece', region: 'Europe' },
  '392': { name: 'Japan', region: 'Asia-Pacific' },
  '410': { name: 'South Korea', region: 'Asia-Pacific' },
  '156': { name: 'China', region: 'Asia-Pacific' },
  '356': { name: 'India', region: 'Asia-Pacific' },
  '036': { name: 'Australia', region: 'Asia-Pacific' },
  '554': { name: 'New Zealand', region: 'Asia-Pacific' },
  '702': { name: 'Singapore', region: 'Asia-Pacific' },
  '360': { name: 'Indonesia', region: 'Asia-Pacific' },
  '764': { name: 'Thailand', region: 'Asia-Pacific' },
  '704': { name: 'Vietnam', region: 'Asia-Pacific' },
  '458': { name: 'Malaysia', region: 'Asia-Pacific' },
  '608': { name: 'Philippines', region: 'Asia-Pacific' },
  '784': { name: 'United Arab Emirates', region: 'Middle East' },
  '682': { name: 'Saudi Arabia', region: 'Middle East' },
  '634': { name: 'Qatar', region: 'Middle East' },
  '512': { name: 'Oman', region: 'Middle East' },
  '414': { name: 'Kuwait', region: 'Middle East' },
  '376': { name: 'Israel', region: 'Middle East' },
  '792': { name: 'Turkey', region: 'Middle East' },
  '710': { name: 'South Africa', region: 'Africa' },
  '566': { name: 'Nigeria', region: 'Africa' },
  '404': { name: 'Kenya', region: 'Africa' },
  '818': { name: 'Egypt', region: 'Africa' },
  '504': { name: 'Morocco', region: 'Africa' },
};

// Regional center coordinates for quick jump
const REGION_BOUNDS: Record<string, { center: [number, number]; scale: number }> = {
  all: { center: [10, 20], scale: 140 },
  northAmerica: { center: [-95, 45], scale: 260 },
  europe: { center: [15, 52], scale: 420 },
  asiaPacific: { center: [110, 15], scale: 220 },
  latinAmerica: { center: [-65, -20], scale: 240 },
  middleEast: { center: [45, 25], scale: 380 },
  africa: { center: [20, 5], scale: 260 },
};

export const TerritoryHeatmapD3: React.FC<TerritoryHeatmapD3Props> = ({
  assets,
  rights,
  deals,
  selectedAssetId,
  onSelectAsset,
  onProposeDeal,
  userRole = 'BUYER'
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Active state
  const [activeFilmId, setActiveFilmId] = useState<string>(selectedAssetId || assets[0]?.id || 'asset-1');
  const [selectedCountry, setSelectedCountry] = useState<CountryTerritoryInfo | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountryTerritoryInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [offerPrice, setOfferPrice] = useState<number>(0);
  const [offerMsg, setOfferMsg] = useState<string>('');

  useEffect(() => {
    if (selectedAssetId) {
      setActiveFilmId(selectedAssetId);
    }
  }, [selectedAssetId]);

  const activeAsset = useMemo(() => {
    return assets.find(a => a.id === activeFilmId) || assets[0];
  }, [assets, activeFilmId]);

  // Compute territory rights status map for current film
  const countryStatusMap = useMemo(() => {
    const map = new Map<string, CountryTerritoryInfo>();
    if (!activeAsset) return map;

    const filmRights = rights.filter(r => r.assetId === activeAsset.id);
    const filmDeals = deals.filter(d => d.assetId === activeAsset.id);

    // Default base pricing scale based on film
    const basePrice = activeAsset.id === 'asset-1' ? 450000 : activeAsset.id === 'asset-2' ? 850000 : 120000;

    // Evaluate each known country
    Object.entries(COUNTRY_REGION_MAP).forEach(([id, meta]) => {
      let status: 'LICENSED' | 'AVAILABLE' | 'PENDING' | 'HOLDBACK' = 'AVAILABLE';
      let price = Math.round((basePrice / 10) * (meta.region === 'North America' ? 3.5 : meta.region === 'Europe' ? 2.8 : meta.region === 'Asia-Pacific' ? 2.2 : 1.2));
      let licenseTypes = ['SVOD', 'TVOD', 'AVOD'];
      let exclusivity = true;
      let buyerName = undefined;
      let matchingRightsEntry = filmRights.find(r => 
        r.territories.some(t => 
          t.toLowerCase().includes('worldwide') || 
          t.toLowerCase().includes(meta.region.toLowerCase()) || 
          t.toLowerCase().includes(meta.name.toLowerCase())
        )
      );

      // Check if film has specific rights entries
      if (matchingRightsEntry) {
        if (matchingRightsEntry.availabilityStatus === 'LICENSED') {
          status = 'LICENSED';
          buyerName = activeAsset.ownerId === 'owner-paramount' ? 'Sky Cinema / Canal+' : 'Amazon Prime Video (Global)';
        } else {
          status = 'AVAILABLE';
        }
        price = matchingRightsEntry.price;
        licenseTypes = matchingRightsEntry.licenseTypes;
        exclusivity = matchingRightsEntry.exclusivity;
      } else {
        // Specific film rules for rich varied map representation
        if (activeAsset.id === 'asset-1') {
          if (['840', '124', '826', '276', '250'].includes(id)) {
            status = 'LICENSED';
            buyerName = 'Apple TV+ / Sky Group';
          } else if (['392', '410', '036'].includes(id)) {
            status = 'PENDING';
            buyerName = 'Sony Pictures Releasing (In Review)';
          } else {
            status = 'AVAILABLE';
          }
        } else if (activeAsset.id === 'asset-2') {
          if (['392', '410', '156', '702'].includes(id)) {
            status = 'LICENSED';
            buyerName = 'WOWOW / TV Asahi Premium';
          } else if (['840', '124'].includes(id)) {
            status = 'PENDING';
            buyerName = 'Warner Bros. Discovery (Offer Sent)';
          } else {
            status = 'AVAILABLE';
          }
        } else if (activeAsset.id === 'asset-3') {
          if (['076', '484', '032', '152', '356', '036'].includes(id)) {
            status = 'LICENSED';
            buyerName = 'MUBI Global SVOD';
          } else {
            status = 'AVAILABLE';
          }
        } else {
          if (['276', '040', '756'].includes(id)) {
            status = 'LICENSED';
            buyerName = 'ZDF Kultur / ARD Degeto';
          } else {
            status = 'AVAILABLE';
          }
        }
      }

      // Check for pending deals
      const pendingDeal = filmDeals.find(d => d.status === 'REQUESTED' || d.status === 'OWNER_REVIEW' || d.status === 'ADMIN_REVIEW');
      if (pendingDeal && status === 'AVAILABLE' && ['840', '826', '392'].includes(id)) {
        status = 'PENDING';
        buyerName = 'Active Deal Offer In Review';
        price = pendingDeal.proposedPrice || price;
      }

      map.set(id, {
        id,
        name: meta.name,
        region: meta.region,
        status,
        price,
        licenseTypes,
        exclusivity,
        buyerName,
        filmTitle: activeAsset.title,
        matchingRightsEntry: matchingRightsEntry || filmRights[0]
      });
    });

    return map;
  }, [activeAsset, rights, deals]);

  // Heatmap Summary Statistics
  const stats = useMemo(() => {
    let licensedCount = 0;
    let availableCount = 0;
    let pendingCount = 0;
    let totalValue = 0;

    countryStatusMap.forEach(item => {
      if (item.status === 'LICENSED') licensedCount++;
      if (item.status === 'AVAILABLE') {
        availableCount++;
        totalValue += item.price;
      }
      if (item.status === 'PENDING') pendingCount++;
    });

    const totalTracked = countryStatusMap.size || 1;
    const penetration = Math.round((licensedCount / totalTracked) * 100);

    return {
      licensedCount,
      availableCount,
      pendingCount,
      totalValue,
      penetration
    };
  }, [countryStatusMap]);

  // Draw D3 World Heatmap
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 900;
    const height = 480;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear canvas

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Create main container group for zooming
    const g = svg.append('g').attr('class', 'map-layer');

    // Geo Projection
    const projection = d3.geoNaturalEarth1()
      .scale(REGION_BOUNDS[filterRegion]?.scale || 145)
      .translate([width / 2, height / 2])
      .center(REGION_BOUNDS[filterRegion]?.center || [10, 15]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Extract TopoJSON countries
    // @ts-ignore
    const countriesGeo = feature(worldData, worldData.objects.countries) as any;

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Background sphere / ocean
    g.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', pathGenerator as any)
      .attr('fill', '#0f172a')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1);

    // Graticules for cinematic cartographic look
    const graticule = d3.geoGraticule10();
    g.append('path')
      .datum(graticule)
      .attr('d', pathGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', '#334155')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.25);

    // Color definitions
    const getColor = (info?: CountryTerritoryInfo) => {
      if (!info) return '#1e293b'; // Uncategorized land
      if (filterStatus !== 'ALL' && info.status !== filterStatus) return '#1e293b';

      switch (info.status) {
        case 'LICENSED':
          return '#2563eb'; // Vivid Royal Blue / Sold
        case 'AVAILABLE':
          return '#10b981'; // Emerald Green / Open Territory
        case 'PENDING':
          return '#f59e0b'; // Amber Gold / Active Negotiation
        case 'HOLDBACK':
        default:
          return '#334155'; // Dark Charcoal
      }
    };

    // Render Countries
    g.selectAll('path.country')
      .data(countriesGeo.features)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', pathGenerator as any)
      .attr('fill', (d: any) => {
        const info = countryStatusMap.get(d.id);
        return getColor(info);
      })
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 0.6)
      .attr('cursor', 'pointer')
      .style('transition', 'fill 0.2s ease, stroke 0.2s ease')
      .on('mouseenter', function (event, d: any) {
        const info = countryStatusMap.get(d.id) || {
          id: d.id,
          name: d.properties?.name || 'Unlisted Territory',
          region: 'Global',
          status: 'AVAILABLE',
          price: 50000,
          licenseTypes: ['SVOD'],
          exclusivity: false,
          filmTitle: activeAsset?.title
        };

        d3.select(this)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.6)
          .attr('fill-opacity', 0.85);

        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x, y });
        setHoveredCountry(info);
      })
      .on('mousemove', function (event) {
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x, y });
      })
      .on('mouseleave', function (event, d: any) {
        const info = countryStatusMap.get(d.id);
        d3.select(this)
          .attr('stroke', '#0f172a')
          .attr('stroke-width', 0.6)
          .attr('fill-opacity', 1)
          .attr('fill', getColor(info));
        setHoveredCountry(null);
      })
      .on('click', function (event, d: any) {
        const info = countryStatusMap.get(d.id);
        if (info) {
          setSelectedCountry(info);
          setOfferPrice(info.price);
          setOfferMsg(`Acquisition bid for ${info.name} territory (${info.region}) for "${activeAsset?.title}".`);
        }
      });

  }, [countryStatusMap, filterRegion, filterStatus, activeAsset]);

  // Zoom controls helper
  const handleZoom = (delta: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(350).call(zoomBehaviorRef.current.scaleBy, delta);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  // Submit Deal proposal for selected territory
  const handleSendTerritoryOffer = () => {
    if (!selectedCountry || !activeAsset) return;
    const matchingRights = selectedCountry.matchingRightsEntry || rights.find(r => r.assetId === activeAsset.id) || rights[0];
    
    if (onProposeDeal && matchingRights) {
      onProposeDeal({
        ...matchingRights,
        price: offerPrice || selectedCountry.price
      }, activeAsset, selectedCountry.name);
      
      setSelectedCountry(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-slate-100 flex flex-col">
      
      {/* Top Heatmap Bar: Title, Film Selector & Live Stats */}
      <div className="p-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
        {/* Left: Title & Film Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold tracking-tight text-white">
                  D3.js Global Rights Heatmap
                </h3>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Interactive Vector
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visual territory clearance, active licenses, and real-time open market availability.
              </p>
            </div>
          </div>

          {/* Film Selection Dropdown / Selector */}
          <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 shadow-inner">
            <Film size={14} className="text-blue-400 ml-2" />
            <select
              value={activeFilmId}
              onChange={(e) => {
                setActiveFilmId(e.target.value);
                if (onSelectAsset) onSelectAsset(e.target.value);
              }}
              className="bg-transparent text-xs font-bold text-white pr-4 py-1 outline-none cursor-pointer"
            >
              {assets.map(asset => (
                <option key={asset.id} value={asset.id} className="bg-slate-900 text-white">
                  {asset.title} ({asset.releaseYear})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Real-time Licensing Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Licensed</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-sm font-black text-blue-400">{stats.licensedCount}</span>
              <span className="text-[10px] text-slate-500">territories</span>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Open Available</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-sm font-black text-emerald-400">{stats.availableCount}</span>
              <span className="text-[10px] text-slate-500">regions</span>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Market Reach</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-sm font-black text-white">{stats.penetration}%</span>
              <span className="text-[10px] text-emerald-400 font-bold">Clearance</span>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Open MG Value</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-sm font-black text-white">${(stats.totalValue / 1000).toFixed(0)}k</span>
              <span className="text-[10px] text-blue-400">USD</span>
            </div>
          </div>
        </div>

      </div>

      {/* Heatmap Filters & Map Controls Bar */}
      <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Region Quick Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto py-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mr-2 hidden sm:inline">
            Region:
          </span>
          {[
            { id: 'all', label: 'Worldwide' },
            { id: 'northAmerica', label: 'North America' },
            { id: 'europe', label: 'Europe' },
            { id: 'asiaPacific', label: 'Asia-Pacific' },
            { id: 'latinAmerica', label: 'Latin America' },
            { id: 'middleEast', label: 'Middle East' },
            { id: 'africa', label: 'Africa' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setFilterRegion(r.id)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                filterRegion === r.id 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterStatus(filterStatus === 'LICENSED' ? 'ALL' : 'LICENSED')}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
              filterStatus === 'LICENSED' 
                ? 'bg-blue-600 text-white border-blue-500' 
                : 'bg-slate-900 text-blue-400 border-blue-500/30 hover:bg-blue-950/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Licensed ({stats.licensedCount})</span>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
              filterStatus === 'AVAILABLE' 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-slate-900 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Available ({stats.availableCount})</span>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
              filterStatus === 'PENDING' 
                ? 'bg-amber-600 text-white border-amber-500' 
                : 'bg-slate-900 text-amber-400 border-amber-500/30 hover:bg-amber-950/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>In Negotiation ({stats.pendingCount})</span>
          </button>
        </div>

      </div>

      {/* Main Map Stage */}
      <div className="relative w-full h-[480px] bg-slate-950 overflow-hidden select-none" ref={containerRef}>
        
        <svg 
          ref={svgRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Floating Zoom & Reset Toolbar */}
        <div className="absolute bottom-5 right-5 flex flex-col space-y-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-xl backdrop-blur-md z-10">
          <button 
            onClick={() => handleZoom(1.3)}
            title="Zoom In"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            onClick={() => handleZoom(0.7)}
            title="Zoom Out"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <ZoomOut size={16} />
          </button>
          <div className="h-[1px] bg-slate-800 w-full" />
          <button 
            onClick={handleResetZoom}
            title="Reset Map View"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Map Legend (Bottom-Left) */}
        <div className="absolute bottom-5 left-5 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-xl backdrop-blur-md text-[11px] space-y-2 z-10 hidden sm:block">
          <div className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            Territory Clearance Status
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-blue-600 shadow-xs" />
              <span className="text-slate-300">Licensed / Sold</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 shadow-xs" />
              <span className="text-slate-300">Available / Open</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-amber-500 shadow-xs" />
              <span className="text-slate-300">Bid In Review</span>
            </div>
          </div>
        </div>

        {/* Dynamic D3 Hover Tooltip */}
        {hoveredCountry && tooltipPos && (
          <div 
            className="pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-full mb-3 min-w-[240px] max-w-xs bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white space-y-2.5 transition-transform duration-75"
            style={{ 
              left: Math.max(130, Math.min((containerRef.current?.clientWidth || 900) - 130, tooltipPos.x)), 
              top: Math.max(140, tooltipPos.y) 
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  <MapPin size={14} className="text-blue-400" />
                  {hoveredCountry.name}
                </h4>
                <span className="text-[10px] font-mono text-slate-400">{hoveredCountry.region}</span>
              </div>
              <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-md border ${
                hoveredCountry.status === 'LICENSED'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : hoveredCountry.status === 'AVAILABLE'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {hoveredCountry.status === 'LICENSED' ? 'Licensed' : hoveredCountry.status === 'AVAILABLE' ? 'Available' : 'Pending'}
              </span>
            </div>

            <div className="space-y-1 text-xs border-t border-slate-800 pt-2 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Selected Film:</span>
                <span className="text-white font-bold truncate max-w-[130px]">{hoveredCountry.filmTitle}</span>
              </div>
              {hoveredCountry.buyerName && (
                <div className="flex justify-between text-slate-400">
                  <span>Licensee / Buyer:</span>
                  <span className="text-blue-300 font-bold truncate max-w-[130px]">{hoveredCountry.buyerName}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Asking / Value:</span>
                <span className="text-emerald-400 font-bold">${hoveredCountry.price?.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Rights Granted:</span>
                <span className="text-slate-200">{hoveredCountry.licenseTypes?.join(', ')}</span>
              </div>
            </div>

            <div className="text-[10px] text-blue-400/80 italic text-center pt-1 border-t border-slate-800/80">
              Click territory to inspect rights &amp; submit bid
            </div>
          </div>
        )}

      </div>

      {/* Selected Territory Modal / Inspector Drawer */}
      {selectedCountry && (
        <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold">
                {selectedCountry.region}
              </span>
              <h4 className="text-xl font-bold text-white">
                {selectedCountry.name} Territory Clearance
              </h4>
              <span className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full ${
                selectedCountry.status === 'LICENSED'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {selectedCountry.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Target film: <strong className="text-white">{activeAsset?.title}</strong> ({activeAsset?.releaseYear}). 
              Licensed rights include {selectedCountry.licenseTypes.join(', ')} with {selectedCountry.exclusivity ? 'Full Exclusivity' : 'Non-Exclusive'} terms.
            </p>
          </div>

          {/* Quick Offer submission controls */}
          {(userRole === 'BUYER' || userRole === 'ADMIN') && selectedCountry.status !== 'LICENSED' ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                <DollarSign size={14} className="text-emerald-400 shrink-0 mr-1" />
                <input 
                  type="number"
                  value={offerPrice || ''}
                  onChange={(e) => setOfferPrice(parseInt(e.target.value) || 0)}
                  placeholder="Offer (USD)"
                  className="w-28 text-xs font-bold text-white bg-transparent outline-none"
                />
              </div>

              <button
                onClick={handleSendTerritoryOffer}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Propose Territory Deal</span>
                <ArrowUpRight size={14} />
              </button>

              <button
                onClick={() => setSelectedCountry(null)}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-300">
                  {selectedCountry.status === 'LICENSED' ? 'Held by' : 'Benchmark MG'}
                </div>
                <div className="text-sm font-mono font-bold text-blue-400">
                  {selectedCountry.buyerName || `$${selectedCountry.price?.toLocaleString()} USD`}
                </div>
              </div>
              <button
                onClick={() => setSelectedCountry(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
