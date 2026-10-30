# Reusable Commercial POS Product

A modular, enterprise-grade Point of Sale (POS) software product designed for independent commercial client deployments with multi-branch support across diverse retail sectors (Supermarkets, Vegetable & Fruit Stores, Clothing & Textiles, Jewellery, General Retail, Wholesale, and Restaurants).

---

## Project Structure

```
Reusable POS/
├── frontend/               # React 19 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/            # Enterprise Axios HTTP client & centralized endpoints
│   │   ├── components/     # Reusable atomic UI library (buttons, tables, modals, etc.)
│   │   ├── config/         # Sector feature flags & active client profiles
│   │   ├── context/        # ConfigContext, OfflineContext, NotificationContext
│   │   ├── hooks/          # Custom utility hooks
│   │   ├── modules/        # Dashboard widgets (KPIs, P&L, Recharts, Recent Sales)
│   │   ├── pages/          # 11 core module pages
│   │   ├── routes/         # React Router DOM v7 navigation
│   │   ├── services/       # Presentation data contracts
│   │   ├── styles/         # #D45060 design tokens & CSS variables
│   │   ├── types/          # Static TypeScript interfaces
│   │   └── utils/          # Formatting (₹, dates, numbers) & class merger
│   ├── public/             # Static public assets
│   ├── package.json        # Frontend scripts and dependencies
│   ├── tsconfig.json       # TypeScript configuration
│   └── vite.config.ts      # Vite bundler & Tailwind v4 plugin configuration
│
├── backend/                # Reserved for Future Laravel + PHP + MySQL backend
│   └── README.md
│
└── package.json            # Root workspace scripts to run frontend convenience commands
```

---

## Getting Started

### 1. Running the Frontend
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies (if needed)
npm install

# Start the Vite development server
npm run dev

# Build for production
npm run build
```

Or from the root directory:
```bash
npm run dev:frontend
npm run build:frontend
```

Frontend application runs at: **http://localhost:5173**
