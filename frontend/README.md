# BookSharePDX Frontend

A React + TypeScript frontend for the BookSharePDX book sharing platform.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Runs the app in development mode at [http://localhost:5173](http://localhost:5173)

### Build

```bash
npm run build
```

Builds the app for production to the `dist` folder.

### Deploy to GitHub Pages

```bash
npm run deploy
```

Builds and deploys to GitHub Pages at [https://wittejm.github.io/booksharepdx](https://wittejm.github.io/booksharepdx)

## Environment Variables

- `VITE_USE_HASH_ROUTER`: Set to `"true"` for GitHub Pages (HashRouter), `"false"` for local/production (BrowserRouter)

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── layout/      # Header, Footer
│   │   ├── exchange/    # Exchange flow modals
│   │   └── ...
│   ├── pages/           # Page components
│   ├── services/        # API service layer
│   ├── contexts/        # React contexts
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component with routing
│   └── main.tsx         # Entry point
├── public/              # Static assets
└── package.json
```

## Features

- **Responsive Design**: Mobile-first Tailwind CSS
- **Complete Book Sharing**: Post books, browse, message, exchange
- **User Profiles**: Stats, saved posts, exchange history
- **Moderation**: Complete moderation dashboard for moderators/admins
- **Exchange Flow**: Two-party confirmation for book exchanges

## Tech Stack

- React 19
- TypeScript
- React Router v7
- Tailwind CSS
- Vite
- D3.js (for map visualizations)
- react-easy-crop (for avatar uploads)

## License

MIT
