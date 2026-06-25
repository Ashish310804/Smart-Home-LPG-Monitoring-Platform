# Saathi - LPG Cylinder Pressure Monitoring System

A web-based application for monitoring LPG cylinder pressure, tracking usage, and providing leak alerts.

## Features

- Real-time pressure monitoring
- Manual pressure data entry
- Usage tracking and forecasting
- Leak detection alerts
- Historical data visualization
- Dark mode support
- Responsive design

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser and go to `http://localhost:3000`

## MongoDB Setup

Create a `.env` file in the `Project17` folder with the following values:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/
MONGODB_DB=saathi
MONGODB_COLLECTION=readings
PORT=3000
```

If `MONGODB_URI` is not set, the app will fall back to the existing `readings.json` storage file.

## API Endpoints

- `GET /api/readings` - Get all pressure readings
- `POST /api/readings` - Add a new pressure reading
- `DELETE /api/readings/:index` - Delete a reading by index

## Data Storage

Readings are stored in `readings.json` file on the server.

## Manual Data Entry

Users can manually enter pressure readings through the web interface, which are then stored and used for calculations.

## Future Enhancements

- Real-time device integration
- Push notifications
- Chatbot integration
- Advanced analytics