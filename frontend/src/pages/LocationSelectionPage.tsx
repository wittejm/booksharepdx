import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { authService, neighborhoodService } from '../services';
import { geocodeAddress, findNeighborhoodByPoint } from '../utils/geocoding';
import quadrantData from '../data/quadrant-data.json';
import { useToast } from '../components/useToast';
import ToastContainer from '../components/ToastContainer';
import MapPicker from '../components/MapPicker';

type QuadrantName = 'North Portland' | 'Northeast Portland' | 'Southeast Portland' | 'Northwest Portland' | 'Southwest Portland';

const QUADRANT_ORDER: QuadrantName[] = [
  'North Portland',
  'Northeast Portland',
  'Southeast Portland',
  'Northwest Portland',
  'Southwest Portland',
];

export default function LocationSelectionPage() {
  const { currentUser, updateCurrentUser } = useUser();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [showPreciseLocation, setShowPreciseLocation] = useState(false);
  const [preciseLocation, setPreciseLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const { showToast, toasts, dismiss } = useToast();

  const neighborhoods = neighborhoodService.getAll();

  // Organize neighborhoods by quadrant
  const neighborhoodsByQuadrant: Record<QuadrantName, typeof neighborhoods> = {
    'North Portland': [],
    'Northeast Portland': [],
    'Southeast Portland': [],
    'Northwest Portland': [],
    'Southwest Portland': [],
  };

  neighborhoods.forEach(n => {
    for (const quadrantName of QUADRANT_ORDER) {
      if (quadrantData.quadrants[quadrantName].includes(n.name)) {
        neighborhoodsByQuadrant[quadrantName].push(n);
        break;
      }
    }
  });

  // Sort neighborhoods within each quadrant
  Object.values(neighborhoodsByQuadrant).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));

  const handleAddressLookup = async () => {
    if (!address.trim()) return;

    setAddressLoading(true);

    try {
      // Geocode the address
      const result = await geocodeAddress(address);

      if (!result) {
        showToast('Address not found. Please try a different address or select from the dropdown.', 'error');
        setAddressLoading(false);
        return;
      }

      // Find which neighborhood contains this point
      const neighborhoodId = findNeighborhoodByPoint(result, neighborhoods);

      if (!neighborhoodId) {
        showToast('Address is outside Portland neighborhoods. Please select from the dropdown.', 'error');
        setAddressLoading(false);
        return;
      }

      // Success! Select the neighborhood
      const neighborhood = neighborhoods.find(n => n.id === neighborhoodId);
      setSelectedNeighborhood(neighborhoodId);
      showToast(`Found: ${neighborhood?.name}`, 'success');

    } catch (error) {
      console.error('Address lookup error:', error);
      showToast('Address lookup failed. Please try again or select from the dropdown.', 'error');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedNeighborhood) {
      alert('Please select a neighborhood');
      return;
    }

    if (!currentUser) return;

    setLoading(true);

    try {
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

      const updatedUser = await authService.updateCurrentUser({ location });
      if (updatedUser) {
        updateCurrentUser(updatedUser);
      }

      navigate('/browse');
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-2xl">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-600">Now, let's set up your location so neighbors can find your books</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Address Lookup */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Use your address to find your neighborhood
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your Portland address"
                  className="input flex-1"
                  disabled={addressLoading}
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
                  disabled={!address.trim() || addressLoading}
                  className="btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addressLoading ? 'Looking up...' : 'Find'}
                </button>
              </div>
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
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="input"
                required
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
            </div>

            {/* Optional Precise Location Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowPreciseLocation(!showPreciseLocation)}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <span className="text-lg">📍</span>
                <span>{showPreciseLocation ? 'Hide' : 'Share a more specific location (optional)'}</span>
              </button>
            </div>

            {/* Precise Location Section (when expanded) */}
            {showPreciseLocation && selectedNeighborhood && (
              <div className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200">
                <p className="text-sm text-gray-600 italic">
                  This could be an intersection, or a nearby landmark if you prefer
                </p>

                {(() => {
                  const neighborhood = neighborhoods.find((n) => n.id === selectedNeighborhood);
                  if (!neighborhood) {
                    return (
                      <div className="text-center text-gray-500 py-8">
                        Please select a neighborhood first
                      </div>
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

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/browse')}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={loading || !selectedNeighborhood}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
