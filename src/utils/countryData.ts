/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CountryInfo {
  id: string; // Numeric ID as string (e.g. "840")
  numericId: number;
  name: string;
  code: string; // Alpha-2 (e.g. "US")
  alpha3: string; // Alpha-3 (e.g. "USA")
  region: 'North America' | 'Europe' | 'Asia-Pacific' | 'Latin America' | 'Middle East & Africa' | 'Other';
  tier: 1 | 2 | 3; // Distribution market tier
  estimatedMarketSizeUSD: number; // For valuation weighting
}

// Major country mapping for D3 TopoJSON world atlas numeric IDs
export const COUNTRY_DICTIONARY: Record<string, CountryInfo> = {
  // North America
  '840': { id: '840', numericId: 840, name: 'United States', code: 'US', alpha3: 'USA', region: 'North America', tier: 1, estimatedMarketSizeUSD: 11200000 },
  '124': { id: '124', numericId: 124, name: 'Canada', code: 'CA', alpha3: 'CAN', region: 'North America', tier: 1, estimatedMarketSizeUSD: 1200000 },
  '484': { id: '484', numericId: 484, name: 'Mexico', code: 'MX', alpha3: 'MEX', region: 'Latin America', tier: 2, estimatedMarketSizeUSD: 850000 },

  // Western & Central Europe
  '826': { id: '826', numericId: 826, name: 'United Kingdom', code: 'GB', alpha3: 'GBR', region: 'Europe', tier: 1, estimatedMarketSizeUSD: 4500000 },
  '276': { id: '276', numericId: 276, name: 'Germany', code: 'DE', alpha3: 'DEU', region: 'Europe', tier: 1, estimatedMarketSizeUSD: 3900000 },
  '250': { id: '250', numericId: 250, name: 'France', code: 'FR', alpha3: 'FRA', region: 'Europe', tier: 1, estimatedMarketSizeUSD: 3600000 },
  '380': { id: '380', numericId: 380, name: 'Italy', code: 'IT', alpha3: 'ITA', region: 'Europe', tier: 1, estimatedMarketSizeUSD: 2100000 },
  '724': { id: '724', numericId: 724, name: 'Spain', code: 'ES', alpha3: 'ESP', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 1800000 },
  '528': { id: '528', numericId: 528, name: 'Netherlands', code: 'NL', alpha3: 'NLD', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 950000 },
  '056': { id: '056', numericId: 56, name: 'Belgium', code: 'BE', alpha3: 'BEL', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 650000 },
  '756': { id: '756', numericId: 756, name: 'Switzerland', code: 'CH', alpha3: 'CHE', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 800000 },
  '040': { id: '040', numericId: 40, name: 'Austria', code: 'AT', alpha3: 'AUT', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 550000 },
  '752': { id: '752', numericId: 752, name: 'Sweden', code: 'SE', alpha3: 'SWE', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 600000 },
  '578': { id: '578', numericId: 578, name: 'Norway', code: 'NO', alpha3: 'NOR', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 520000 },
  '208': { id: '208', numericId: 208, name: 'Denmark', code: 'DK', alpha3: 'DNK', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 480000 },
  '246': { id: '246', numericId: 246, name: 'Finland', code: 'FI', alpha3: 'FIN', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 400000 },
  '620': { id: '620', numericId: 620, name: 'Portugal', code: 'PT', alpha3: 'PRT', region: 'Europe', tier: 3, estimatedMarketSizeUSD: 320000 },
  '372': { id: '372', numericId: 372, name: 'Ireland', code: 'IE', alpha3: 'IRL', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 420000 },
  '616': { id: '616', numericId: 616, name: 'Poland', code: 'PL', alpha3: 'POL', region: 'Europe', tier: 2, estimatedMarketSizeUSD: 720000 },
  '203': { id: '203', numericId: 203, name: 'Czech Republic', code: 'CZ', alpha3: 'CZE', region: 'Europe', tier: 3, estimatedMarketSizeUSD: 310000 },
  '300': { id: '300', numericId: 300, name: 'Greece', code: 'GR', alpha3: 'GRC', region: 'Europe', tier: 3, estimatedMarketSizeUSD: 240000 },
  '642': { id: '642', numericId: 642, name: 'Romania', code: 'RO', alpha3: 'ROU', region: 'Europe', tier: 3, estimatedMarketSizeUSD: 210000 },
  '348': { id: '348', numericId: 348, name: 'Hungary', code: 'HU', alpha3: 'HUN', region: 'Europe', tier: 3, estimatedMarketSizeUSD: 200000 },
  '804': { id: '804', numericId: 804, name: 'Ukraine', code: 'UA', alpha3: 'UKR', region: 'Europe', tier: 3, estimatedMarketSizeUSD: 180000 },

  // Asia-Pacific (APAC)
  '392': { id: '392', numericId: 392, name: 'Japan', code: 'JP', alpha3: 'JPN', region: 'Asia-Pacific', tier: 1, estimatedMarketSizeUSD: 5200000 },
  '410': { id: '410', numericId: 410, name: 'South Korea', code: 'KR', alpha3: 'KOR', region: 'Asia-Pacific', tier: 1, estimatedMarketSizeUSD: 2800000 },
  '036': { id: '036', numericId: 36, name: 'Australia', code: 'AU', alpha3: 'AUS', region: 'Asia-Pacific', tier: 1, estimatedMarketSizeUSD: 2200000 },
  '554': { id: '554', numericId: 554, name: 'New Zealand', code: 'NZ', alpha3: 'NZL', region: 'Asia-Pacific', tier: 2, estimatedMarketSizeUSD: 450000 },
  '356': { id: '356', numericId: 356, name: 'India', code: 'IN', alpha3: 'IND', region: 'Asia-Pacific', tier: 1, estimatedMarketSizeUSD: 3100000 },
  '156': { id: '156', numericId: 156, name: 'China', code: 'CN', alpha3: 'CHN', region: 'Asia-Pacific', tier: 1, estimatedMarketSizeUSD: 9800000 },
  '702': { id: '702', numericId: 702, name: 'Singapore', code: 'SG', alpha3: 'SGP', region: 'Asia-Pacific', tier: 2, estimatedMarketSizeUSD: 410000 },
  '360': { id: '360', numericId: 360, name: 'Indonesia', code: 'ID', alpha3: 'IDN', region: 'Asia-Pacific', tier: 2, estimatedMarketSizeUSD: 680000 },
  '458': { id: '458', numericId: 458, name: 'Malaysia', code: 'MY', alpha3: 'MYS', region: 'Asia-Pacific', tier: 3, estimatedMarketSizeUSD: 340000 },
  '764': { id: '764', numericId: 764, name: 'Thailand', code: 'TH', alpha3: 'THA', region: 'Asia-Pacific', tier: 3, estimatedMarketSizeUSD: 390000 },
  '608': { id: '608', numericId: 608, name: 'Philippines', code: 'PH', alpha3: 'PHL', region: 'Asia-Pacific', tier: 3, estimatedMarketSizeUSD: 310000 },
  '704': { id: '704', numericId: 704, name: 'Vietnam', code: 'VN', alpha3: 'VNM', region: 'Asia-Pacific', tier: 3, estimatedMarketSizeUSD: 280000 },
  '158': { id: '158', numericId: 158, name: 'Taiwan', code: 'TW', alpha3: 'TWN', region: 'Asia-Pacific', tier: 2, estimatedMarketSizeUSD: 620000 },

  // Latin America (LATAM)
  '076': { id: '076', numericId: 76, name: 'Brazil', code: 'BR', alpha3: 'BRA', region: 'Latin America', tier: 1, estimatedMarketSizeUSD: 1600000 },
  '032': { id: '032', numericId: 32, name: 'Argentina', code: 'AR', alpha3: 'ARG', region: 'Latin America', tier: 2, estimatedMarketSizeUSD: 520000 },
  '170': { id: '170', numericId: 170, name: 'Colombia', code: 'CO', alpha3: 'COL', region: 'Latin America', tier: 2, estimatedMarketSizeUSD: 410000 },
  '152': { id: '152', numericId: 152, name: 'Chile', code: 'CL', alpha3: 'CHL', region: 'Latin America', tier: 2, estimatedMarketSizeUSD: 380000 },
  '604': { id: '604', numericId: 604, name: 'Peru', code: 'PE', alpha3: 'PER', region: 'Latin America', tier: 3, estimatedMarketSizeUSD: 240000 },

  // Middle East & Africa (MENA / SSA)
  '784': { id: '784', numericId: 784, name: 'United Arab Emirates', code: 'AE', alpha3: 'ARE', region: 'Middle East & Africa', tier: 2, estimatedMarketSizeUSD: 750000 },
  '682': { id: '682', numericId: 682, name: 'Saudi Arabia', code: 'SA', alpha3: 'SAU', region: 'Middle East & Africa', tier: 1, estimatedMarketSizeUSD: 1100000 },
  '710': { id: '710', numericId: 710, name: 'South Africa', code: 'ZA', alpha3: 'ZAF', region: 'Middle East & Africa', tier: 2, estimatedMarketSizeUSD: 420000 },
  '818': { id: '818', numericId: 818, name: 'Egypt', code: 'EG', alpha3: 'EGY', region: 'Middle East & Africa', tier: 3, estimatedMarketSizeUSD: 360000 },
  '792': { id: '792', numericId: 792, name: 'Turkey', code: 'TR', alpha3: 'TUR', region: 'Middle East & Africa', tier: 2, estimatedMarketSizeUSD: 680000 },
  '376': { id: '376', numericId: 376, name: 'Israel', code: 'IL', alpha3: 'ISR', region: 'Middle East & Africa', tier: 2, estimatedMarketSizeUSD: 490000 },
  '566': { id: '566', numericId: 566, name: 'Nigeria', code: 'NG', alpha3: 'NGA', region: 'Middle East & Africa', tier: 3, estimatedMarketSizeUSD: 320000 },
};

/**
 * Normalizes numeric TopoJSON country ID (e.g. 840 or "840" or "036") to standard 3-digit string or padded
 */
export function getCountryInfo(rawId: string | number): CountryInfo | null {
  const num = typeof rawId === 'string' ? parseInt(rawId, 10) : rawId;
  if (isNaN(num)) return null;

  // Direct match
  const strId = String(num);
  const padded3 = String(num).padStart(3, '0');

  return COUNTRY_DICTIONARY[strId] || COUNTRY_DICTIONARY[padded3] || null;
}

/**
 * Checks if a territory string matches a given country
 */
export function doesTerritoryMatchCountry(territoryStr: string, country: CountryInfo): boolean {
  const norm = territoryStr.toLowerCase();
  const cName = country.name.toLowerCase();
  const cCode = country.code.toLowerCase();
  const cAlpha3 = country.alpha3.toLowerCase();
  const cRegion = country.region.toLowerCase();

  // Worldwide covers all
  if (norm.includes('worldwide') || norm.includes('global') || norm.includes('all territories')) {
    return true;
  }

  // Exact names or codes
  if (norm.includes(cName) || norm.includes(cCode) || norm.includes(cAlpha3)) {
    return true;
  }

  // North America
  if ((norm.includes('north america') || norm.includes('us/ca') || norm.includes('usa/can') || norm.includes('domestic')) && 
      (country.region === 'North America' || country.code === 'US' || country.code === 'CA')) {
    return true;
  }

  // Europe
  if ((norm.includes('europe') || norm.includes('emea') || norm.includes('uk/de/fr') || norm.includes('eu')) && 
      country.region === 'Europe') {
    return true;
  }

  // Latin America
  if ((norm.includes('latin america') || norm.includes('latam') || norm.includes('south america')) && 
      country.region === 'Latin America') {
    return true;
  }

  // Asia-Pacific
  if ((norm.includes('asia') || norm.includes('apac') || norm.includes('asia-pacific') || norm.includes('pan-asia')) && 
      country.region === 'Asia-Pacific') {
    return true;
  }

  // Middle East & Africa
  if ((norm.includes('middle east') || norm.includes('mena') || norm.includes('africa')) && 
      country.region === 'Middle East & Africa') {
    return true;
  }

  return false;
}
