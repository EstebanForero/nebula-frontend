# Nebula Frontend

A real-time chat application built with React, TypeScript, and TanStack Router.

## Features

- Real-time messaging with WebSocket connections
- Room-based chat system with public and private rooms
- User authentication (login/register)
- Push notifications support
- Responsive design with Tailwind CSS
- Environment variable configuration for different deployments

## Technology Stack

- **Frontend Framework**: React 19 with TypeScript
- **Router**: TanStack Router with file-based routing
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **HTTP Client**: Custom fetch wrapper with error handling
- **WebSocket**: Native WebSocket API
- **State Management**: React hooks and context
- **Testing**: Vitest with React Testing Library

## Prerequisites

- Node.js 18+
- Bun (recommended) or npm

## Development

### Installation

```bash
bun install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3838
VITE_NOTIFICATION_BASE_URL=http://localhost:3010
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### Running the Development Server

```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

```bash
bun run build
```

### Running Tests

```bash
bun run test
```

## Docker Deployment

The application supports runtime environment variable injection for flexible deployment.

### Build the Docker Image

```bash
docker build -t nebula-frontend .
```

### Run with Default Environment

```bash
docker run -p 80:80 nebula-frontend
```

### Run with Custom Environment Variables

```bash
docker run -p 80:80 \
  -e VITE_API_BASE_URL=https://api.example.com \
  -e VITE_NOTIFICATION_BASE_URL=https://notifications.example.com \
  -e VITE_VAPID_PUBLIC_KEY=your-production-vapid-key \
  nebula-frontend
```

### Docker Hub Image

Pre-built images are available:
```bash
docker pull esteban1930/nebula-frontend:latest
```

## API Integration

The frontend connects to two backend services:

### Main API Endpoints

- Authentication: `/auth/login`, `/auth/register`
- Rooms: `/rooms`, `/rooms/public`, `/rooms/{id}/members`
- Messages: `/rooms/{id}/messages`
- WebSocket: `/ws/rooms/{id}`

### Notification Service

- Push Notifications: `{notificationBaseUrl}/webpush/subscribe`

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── RoomsShell.tsx  # Main layout with sidebar
│   └── SessionProvider.tsx  # Authentication context
├── lib/                # Utilities and API clients
│   ├── api.ts         # HTTP client and API functions
│   └── notifications.ts  # Push notification handling
├── routes/             # File-based routing
│   ├── __root.tsx     # Root layout
│   ├── index.tsx      # Home page
│   ├── login.tsx      # Login page
│   ├── register.tsx   # Registration page
│   └── rooms/         # Room-related routes
└── public/             # Static assets
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Main backend API URL | `http://localhost:3838` |
| `VITE_NOTIFICATION_BASE_URL` | Notification service URL | `http://localhost:3010` |
| `VITE_VAPID_PUBLIC_KEY` | Web Push public key | empty string |

### Docker Environment Variables

All environment variables can be set at container runtime without rebuilding the image.

## Contributing

1. Install dependencies
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

See LICENSE file for details.