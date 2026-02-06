# FlipFoundry

**Forge Better Flips with AI**

FlipFoundry is a premium AI-powered arbitrage platform that scans marketplaces (starting with eBay) to identify undervalued assets users can flip for profit.

🌐 **Live Demo**: https://oqmzsbr4g6l7q.ok.kimi.link

---

## Features

### AI-Powered Deal Intelligence
- **Smart Valuation Engine**: Analyzes sold comparables, removes outliers, and weights by recency
- **Deal Scoring**: Each listing gets a grade (A+ to F) based on profit potential and ROI
- **Risk Assessment**: Evaluates seller feedback, transaction history, and account age
- **Real-time Analysis**: Scans eBay listings and calculates scores in seconds

### Premium UI/UX
- Dark mode default with glass morphism design
- 4-column responsive grid for desktop
- Subtle hover animations and premium card design
- Real-time search with filters

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Icons | Lucide React |
| Notifications | Sonner |

---

## Project Structure

```
src/
├── components/
│   ├── cards/
│   │   └── DealCard.tsx          # Premium deal card component
│   ├── ui-custom/
│   │   ├── ScoreBadge.tsx        # Deal score display
│   │   ├── RiskBadge.tsx         # Seller risk indicator
│   │   └── SearchBar.tsx         # Search interface
│   ├── Header.tsx                # Navigation header
│   └── ui/                       # shadcn/ui components
├── sections/
│   ├── Hero.tsx                  # Landing/search section
│   └── DealsGrid.tsx             # Results grid
├── services/
│   ├── ebay/
│   │   ├── client.ts             # API client
│   │   ├── config.ts             # Configuration
│   │   └── search.ts             # Search operations
│   ├── scoring/
│   │   └── index.ts              # Scoring engine
│   └── demo-data.ts              # Demo data generator
├── hooks/
│   ├── useSearch.ts              # Search state management
│   └── useDebounce.ts            # Debounce utility
├── types/
│   └── index.ts                  # TypeScript definitions
├── App.tsx                       # Main application
└── App.css                       # Custom styles
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd flipfoundry
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` with your eBay API credentials (optional for demo mode):
```env
VITE_EBAY_APP_ID=your_ebay_app_id
VITE_EBAY_CERT_ID=your_ebay_cert_id
VITE_EBAY_DEV_ID=your_ebay_dev_id
```

5. Start the development server:
```bash
npm run dev
```

6. Build for production:
```bash
npm run build
```

---

## eBay API Configuration

To use live eBay data, you need to register for eBay Developer Program credentials:

1. Go to [eBay Developers Program](https://developer.ebay.com/)
2. Create an account and register your application
3. Get your App ID (Client ID)
4. Add credentials to your `.env` file

### API Endpoints Used
- **Finding API**: Search active listings
- **Browse API**: Get completed/sold items for comparables

---

## Scoring Algorithm

### Deal Score Formula
```
Deal Score = (Profit Score × 0.4) + (ROI Score × 0.35) + (Seller Risk × 0.15) + (Confidence × 0.1)
```

### Grade Scale
| Score | Grade | Label |
|-------|-------|-------|
| 70+ | A+ | Excellent Deal |
| 55-69 | A | Great Deal |
| 40-54 | B+ | Good Deal |
| 25-39 | B | Fair Deal |
| 10-24 | C | Below Average |
| 1-9 | D | Poor Deal |
| 0 | F | Overpriced |

### Seller Risk Levels
| Level | Feedback % | Transactions |
|-------|------------|--------------|
| 🟢 Low | 98%+ | 100+ |
| 🟡 Medium | 95-97% | 50-99 |
| 🔴 High | <95% | <50 |

---

## Future Roadmap

- [ ] Mercari integration
- [ ] Facebook Marketplace support
- [ ] StockX/GOAT for sneakers
- [ ] User accounts and authentication
- [ ] Saved searches and alerts
- [ ] Watchlist with price tracking
- [ ] Subscription tiers
- [ ] Mobile app

---

## Architecture Decisions

### Why These Technologies?
- **Vite**: Fast development and optimized production builds
- **TypeScript**: Type safety and better developer experience
- **Tailwind CSS**: Rapid UI development with consistent design
- **shadcn/ui**: Accessible, customizable components

### Scoring Engine Design
- Modular scoring functions for testability
- Configurable weights for different factors
- Statistical outlier removal for accurate valuations
- Recency weighting for market trends

---

## License

MIT License - see LICENSE file for details

---

## Support

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for serious flippers**
