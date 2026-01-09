import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Create explicit custom icon to fix marker display in React-Leaflet with Vite
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerProps {
  center: { lat: number; lng: number };
  selectedPosition: { lat: number; lng: number } | null;
  onPositionSelect: (position: { lat: number; lng: number }) => void;
}

function MapClickHandler({ onPositionSelect }: { onPositionSelect: (position: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click: (e) => {
      onPositionSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });
  return null;
}

export default function MapPicker({ center, selectedPosition, onPositionSelect }: MapPickerProps) {
  const [key, setKey] = useState(0);

  // Force re-render when center changes to re-center the map
  useEffect(() => {
    setKey((prev) => prev + 1);
  }, [center.lat, center.lng]);

  return (
    <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-200">
      <MapContainer
        key={key}
        center={[center.lat, center.lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onPositionSelect={onPositionSelect} />
        {selectedPosition && (
          <Marker position={[selectedPosition.lat, selectedPosition.lng]} icon={customIcon} />
        )}
      </MapContainer>
    </div>
  );
}
