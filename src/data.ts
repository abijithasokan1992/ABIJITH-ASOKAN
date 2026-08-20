import { MediaAsset, RightsCatalogueEntry, DealRequest, PrivateScreener, Contract } from './types';

export const INITIAL_ASSETS: MediaAsset[] = [
  {
    id: 'asset-1',
    ownerId: 'owner-paramount',
    title: 'Echoes of Eternity',
    description: 'When a deep space exploration team discovers a silent planetary monolith, they unlock a localized time loophole that forces them to relive their mission\'s final hours.',
    genre: ['Sci-Fi', 'Thriller', 'Mystery'],
    language: ['English', 'German'],
    duration: 114,
    releaseYear: 2025,
    thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    status: 'APPROVED',
    metadata: {
      resolution: '4K UHD',
      audioChannel: 'Dolby Atmos 5.1',
      aspectRatio: '2.39:1',
      imdbRating: '7.8'
    },
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'asset-2',
    ownerId: 'owner-paramount',
    title: 'Neon Shadows: Tokyo Driftwood',
    description: 'An underground street-racer is blackmailed by visual artists in a dystopian Tokyo to run sensory-theft memory files across cyber-governed borders.',
    genre: ['Action', 'Sci-Fi', 'Crime'],
    language: ['English', 'Japanese'],
    duration: 98,
    releaseYear: 2026,
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    status: 'LIVE',
    metadata: {
      resolution: '4K UHD',
      audioChannel: 'Stereo 2.0',
      aspectRatio: '16:9',
      imdbRating: '8.1'
    },
    createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'asset-3',
    ownerId: 'owner-a24',
    title: 'Whisper of the Desert',
    description: 'An immersive cinematic study of the nomadic tribes of the Sahara desert, charting their water migration routes through breathtaking time-lapse photography.',
    genre: ['Documentary', 'Adventure'],
    language: ['Arabic', 'French', 'English'],
    duration: 86,
    releaseYear: 2024,
    thumbnailUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600&auto=format&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    status: 'LIVE',
    metadata: {
      resolution: '1080p Full HD',
      audioChannel: 'Surround 5.1',
      aspectRatio: '1.85:1',
      imdbRating: '8.4'
    },
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'asset-4',
    ownerId: 'owner-a24',
    title: 'The Silent Chord',
    description: 'A brilliant deaf pianist in Vienna uncovers encrypted audio waves hidden within Beethoven\'s classic manuscripts, raising corporate intelligence interests.',
    genre: ['Drama', 'Music', 'Intrigue'],
    language: ['German', 'English'],
    duration: 122,
    releaseYear: 2025,
    thumbnailUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=600&auto=format&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    status: 'SUBMITTED',
    metadata: {
      resolution: '1080p Full HD',
      audioChannel: 'Stereo',
      aspectRatio: '16:9',
      imdbRating: 'Pending'
    },
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  }
];

export const INITIAL_RIGHTS: RightsCatalogueEntry[] = [
  {
    id: 'rights-1',
    assetId: 'asset-1',
    ownerId: 'owner-paramount',
    territories: ['North America (US/CA)', 'Europe (UK/DE/FR)'],
    licenseTypes: ['SVOD', 'TVOD', 'AVOD'],
    exclusivity: true,
    availabilityStatus: 'AVAILABLE',
    licenseStart: Date.now() + 10 * 24 * 60 * 60 * 1000, // Starts in 10 days
    licenseEnd: Date.now() + 365 * 10 * 24 * 60 * 60 * 1000, // 10 years
    price: 450000
  },
  {
    id: 'rights-2',
    assetId: 'asset-2',
    ownerId: 'owner-paramount',
    territories: ['Worldwide'],
    licenseTypes: ['SVOD', 'PAY_TV'],
    exclusivity: false,
    availabilityStatus: 'AVAILABLE',
    licenseStart: Date.now() + 1 * 24 * 60 * 60 * 1000,
    licenseEnd: Date.now() + 365 * 3 * 24 * 60 * 60 * 1000,
    price: 850000
  },
  {
    id: 'rights-3',
    assetId: 'asset-3',
    ownerId: 'owner-a24',
    territories: ['Latin America', 'Asia-Pacific (APAC)'],
    licenseTypes: ['AVOD', 'FREE_TV', 'THEATRICAL'],
    exclusivity: false,
    availabilityStatus: 'LICENSED',
    licenseStart: Date.now() - 30 * 24 * 60 * 60 * 1000,
    licenseEnd: Date.now() + 365 * 2 * 24 * 60 * 60 * 1000,
    price: 120000
  }
];

export const INITIAL_DEALS: DealRequest[] = [
  {
    id: 'deal-1',
    buyerId: 'buyer-netflix',
    assetId: 'asset-1',
    ownerId: 'owner-paramount',
    rightsId: 'rights-1',
    status: 'REQUESTED',
    proposedPrice: 420000,
    message: 'Netflix is interested in securing exclusive SVOD and AVOD rights for North America and EU. Looking forward to legal reviews.',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'deal-2',
    buyerId: 'buyer-netflix',
    assetId: 'asset-3',
    ownerId: 'owner-a24',
    rightsId: 'rights-3',
    status: 'APPROVED',
    proposedPrice: 120000,
    message: 'Standard pricing agreed. Screener QC is complete with zero artifacts.',
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
  }
];

export const INITIAL_SCREENERS: PrivateScreener[] = [
  {
    id: 'screener-1',
    assetId: 'asset-1',
    buyerId: 'buyer-netflix',
    ownerId: 'owner-paramount',
    screenerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    expiryDate: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
    watermarkText: 'CONFIDENTIAL // NETFLIX BUYING GROUP // FOR REVIEW ONLY',
    viewCount: 3,
    lastViewedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  }
];

export const INITIAL_CONTRACTS: Contract[] = [
  {
    id: 'contract-1',
    dealId: 'deal-2',
    assetId: 'asset-3',
    buyerId: 'buyer-netflix',
    ownerId: 'owner-a24',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    status: 'SIGNED',
    createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
  }
];
