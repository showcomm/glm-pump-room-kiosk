# GLM Pump Room Kiosk

An immersive bilingual touchscreen experience for the Kingston Dry Dock pump room at the Marine Museum of the Great Lakes.

## Overview

This kiosk allows museum visitors to explore the historic 1892 pump room machinery from their elevated walkway vantage point. The screen displays a photographic view matching the visitor's actual sightline, with interactive hotspots revealing stories, images, and animations about Victorian-era engineering.

## Features

1. **Explore the Equipment** - Interactive overhead view with touchable equipment hotspots
2. **See It in Action** - Animated visualization of the complete pumping system
3. **Building Cutaway** - Cross-section illustration showing spatial relationships
4. **Test Your Knowledge** - Quiz mode using the pump room view
5. **Archival Photo Gallery** - Historical photographs with flip-card descriptions

## Technical Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Target Device**: iPad Pro 12.9" (2732×2048, 4:3 aspect ratio)
- **Architecture**: Progressive Web App with offline-first design

## Project Structure

```
src/
├── components/           # React components
│   ├── features/        # Feature-specific components (5 main features)
│   ├── shared/          # Shared UI components
│   └── layout/          # Layout components
├── data/                # Data models and types
├── hooks/               # Custom React hooks
├── services/            # API and Supabase services
├── stores/              # State management
├── styles/              # Global styles and Tailwind config
└── i18n/                # Internationalization (EN/FR)
```

## Display Specifications

- **Aspect Ratio**: 4:3 (iPad Pro 12.9")
- **Resolution**: 2732 × 2048 pixels
- **Orientation**: Landscape
- **Touch**: Multi-touch capacitive

## Getting Started

```bash
# Clone the repository
git clone https://github.com/showcomm/glm-pump-room-kiosk.git
cd glm-pump-room-kiosk

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Historical Context

The Kingston Dry Dock pump room, completed in 1892, represented a remarkable Victorian-era engineering achievement. Designed by consulting engineers Logan and Rankin of Toronto and built by John Inglis Co., the facility featured:

- **Twin centrifugal pumps** with 4'8" diameter discs
- **Vertical high-pressure steam engines** (18" cylinder, 18" stroke)
- **Operating speed**: 175 RPM
- **Capacity**: 14,000 gallons per minute per pump
- **Total dock volume**: 2,100,000 gallons emptied in 75 minutes

Chief Engineer W. Geoghan presided over the pump house from its first operation in 1890 until 1950—a remarkable 60-year tenure.

## Documentation

- [Database Schema](docs/DATABASE_SCHEMA.md) - Supabase table definitions
- [Equipment Reference](docs/EQUIPMENT_REFERENCE.md) - Historical and technical details

## Related Resources

- 1896 Perley Engineering Report ("The Dry Dock at Kingston")
- Donald Page's "Original Shipyard Use of Present Buildings"
- Marine Museum of the Great Lakes archives

## License

Proprietary - Show Communications / Marine Museum of the Great Lakes
