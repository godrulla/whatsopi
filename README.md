# WhatsOpi

AI-powered digital platform for the Dominican Republic's informal economy, enabling colmados and small businesses to manage operations through WhatsApp and voice interfaces.

## Features

- WhatsApp Business API integration for order management
- Voice interface with Dominican Spanish NLP
- Offline-first PWA with service workers
- Multi-language support (Spanish, Dominican dialect, English)
- Payment integration for Dominican payment systems
- Real-time inventory tracking
- Mobile-optimized for low-bandwidth connections
- Docker-based production deployment
- Kubernetes infrastructure support

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **State:** Zustand, TanStack React Query
- **Offline:** Dexie (IndexedDB), Workbox service workers
- **i18n:** i18next with browser language detection
- **Testing:** Vitest, Testing Library, Playwright
- **Infrastructure:** Docker Compose, Kubernetes/Helm
- **Monitoring:** Prometheus, Grafana

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for backend services)

### Install

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
| `VITE_WS_URL` | WebSocket URL |
| `WHATSAPP_TOKEN` | WhatsApp Business API token |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret |
| `ENCRYPTION_KEY` | Data encryption key |

### Run

```bash
# Development
npm run dev

# Production build
npm run build:prod

# Run tests
npm test

# Run specific test suites
npm run test:voice
npm run test:whatsapp
npm run test:offline
```

### Docker

```bash
cd docker
docker compose up -d
```

## Project Structure

```
whatsopi/
├── src/                  # React frontend source
│   ├── components/       # UI components
│   ├── pages/            # Route pages
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities, i18n, API clients
│   └── stores/           # Zustand state stores
├── tests/                # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── security/         # Security compliance tests
│   ├── voice/            # Voice interface tests
│   └── performance/      # Performance tests
├── docker/               # Docker Compose configs
├── infrastructure/       # Kubernetes manifests
├── monitoring/           # Prometheus/Grafana configs
├── docs/                 # Documentation
└── dist/                 # Production build output
```

## Contributing

PRs welcome.

## License

MIT

## Credits

Built by Armando Diaz Silverio
