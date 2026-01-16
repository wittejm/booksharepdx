import { useState } from 'react';
import { neighborhoodService } from '../services';
import { geocodeAddress, findNeighborhoodByPoint } from '../utils/geocoding';
import quadrantData from '../data/quadrant-data.json';
import MapPicker from './MapPicker';

type QuadrantName = 'North Portland' | 'Northeast Portland' | 'Southeast Portland' | 'Northwest Portland' | 'Southwest Portland';

const QUADRANT_ORDER: QuadrantName[] = [
  'North Portland',
  'Northeast Portland',
  'Southeast Portland',
  'Northwest Portland',
  'Southwest Portland',
];

interface LocationPickerProps {
  initialNeighborhoodId?: string;
  initialPreciseLocation?: { lat: number; lng: number } | null;
  onSave: (location: {
    type: 'neighborhood' | 'pin';
    neighborhoodId: string;
    lat?: number;
    lng?: number;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  showToast: (message: string, type: 'success' | 'error') => void;
  cancelLabel?: string;
  saveLabel?: string;
}

export default function LocationPicker({
  initialNeighborhoodId = '',
  initialPreciseLocation = null,
  onSave,
  onCancel,
  loading = false,
  showToast,
  cancelLabel = 'Cancel',
  saveLabel = 'Save Location',
}: LocationPickerProps) {
  const [address, setAddress] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(initialNeighborhoodId);
  const [preciseLocation, setPreciseLocation] = useState<{ lat: number; lng: number } | null>(
    initialPreciseLocation
  );
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [neighborhoodError, setNeighborhoodError] = useState('');

  const neighborhoods = neighborhoodService.getAll();

  // Organize neighborhoods by quadrant
  const neighborhoodsByQuadrant: Record<QuadrantName, typeof neighborhoods> = {
    'North Portland': [],
    'Northeast Portland': [],
    'Southeast Portland': [],
    'Northwest Portland': [],
    'Southwest Portland': [],
  };

  neighborhoods.forEach((n) => {
    for (const quadrantName of QUADRANT_ORDER) {
      if (quadrantData.quadrants[quadrantName].includes(n.name)) {
        neighborhoodsByQuadrant[quadrantName].push(n);
        break;
      }
    }
  });

  // Sort neighborhoods within each quadrant
  Object.values(neighborhoodsByQuadrant).forEach((arr) =>
    arr.sort((a, b) => a.name.localeCompare(b.name))
  );

  const handleAddressLookup = async () => {
    if (!address.trim()) return;

    setAddressLoading(true);
    setAddressError('');

    try {
      const result = await geocodeAddress(address);

      if (!result) {
        setAddressError('Address not found. Try a different address or select from the dropdown.');
        setAddressLoading(false);
        return;
      }

      const neighborhoodId = findNeighborhoodByPoint(result, neighborhoods);

      if (!neighborhoodId) {
        setAddressError('Address is outside Portland. Please select from the dropdown.');
        setAddressLoading(false);
        return;
      }

      const neighborhood = neighborhoods.find((n) => n.id === neighborhoodId);
      setSelectedNeighborhood(neighborhoodId);
      setNeighborhoodError('');
      showToast(`Found: ${neighborhood?.name}`, 'success');
    } catch (error) {
      console.error('Address lookup error:', error);
      setAddressError('Address lookup failed. Try again or select from the dropdown.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedNeighborhood) {
      setNeighborhoodError('Please select a neighborhood');
      return;
    }
    setNeighborhoodError('');

    const location = preciseLocation
      ? {
          type: 'pin' as const,
          lat: preciseLocation.lat,
          lng: preciseLocation.lng,
          neighborhoodId: selectedNeighborhood,
        }
      : {
          type: 'neighborhood' as const,
          neighborhoodId: selectedNeighborhood,
        };

    await onSave(location);
  };

  return (
    <div className="space-y-4">
      {/* Address Lookup */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
          Use your address to find your neighborhood (we won't save the address)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (addressError) setAddressError('');
            }}
            placeholder="Enter your Portland address"
            className={`input flex-1 ${addressError ? 'border-red-500 focus:ring-red-500' : ''}`}
            disabled={addressLoading || loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddressLookup();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddressLookup}
            disabled={!address.trim() || addressLoading || loading}
            className="btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addressLoading ? 'Looking up...' : 'Find'}
          </button>
        </div>
        {addressError && <p className="text-red-500 text-sm mt-1">{addressError}</p>}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or select from list</span>
        </div>
      </div>

      {/* Neighborhood Dropdown with Districts */}
      <div>
        <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-2">
          Your Neighborhood
        </label>
        <select
          id="neighborhood"
          value={selectedNeighborhood}
          onChange={(e) => {
            setSelectedNeighborhood(e.target.value);
            if (neighborhoodError) setNeighborhoodError('');
          }}
          className={`input ${neighborhoodError ? 'border-red-500 focus:ring-red-500' : ''}`}
          disabled={loading}
        >
          <option value="">Select your neighborhood</option>
          {QUADRANT_ORDER.map((quadrantName) => (
            <optgroup key={quadrantName} label={quadrantName}>
              {neighborhoodsByQuadrant[quadrantName].map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {neighborhoodError && <p className="text-red-500 text-sm mt-1">{neighborhoodError}</p>}
      </div>

      

      {selectedNeighborhood && (
        <div className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200">
          <p className="text-sm text-gray-600 italic">
            <p>This could be an intersection, or a nearby landmark if you prefer</p>
            <p>Click and drag to move the window. Click to drop a pin</p>
          </p>

          {(() => {
            const neighborhood = neighborhoods.find((n) => n.id === selectedNeighborhood);
            if (!neighborhood) {
              return (
                <div className="text-center text-gray-500 py-8">Please select a neighborhood first</div>
              );
            }

            return (
              <>
                <MapPicker
                  center={neighborhood.centroid}
                  selectedPosition={preciseLocation}
                  onPositionSelect={setPreciseLocation}
                />

                {preciseLocation && (
                  <div className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                    <span className="text-sm text-gray-700">
                      Pin dropped at {preciseLocation.lat.toFixed(4)}, {preciseLocation.lng.toFixed(4)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreciseLocation(null)}
                      className="text-sm text-red-600 hover:text-red-700"
                      disabled={loading}
                    >
                      Remove Pin
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>
          {cancelLabel}
        </button>
        <button
          onClick={handleSave}
          className="btn-primary flex-1"
          disabled={!selectedNeighborhood || loading}
        >
          {loading ? 'Saving...' : saveLabel}
        </button>
      </div>
    </div>
  );
}
