'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CubeIcon, MapPinIcon, PlusIcon } from '@heroicons/react/24/outline';
import MobileEquipmentForm from '@/components/MobileEquipmentForm';

interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  club: {
    id: string;
    name: string;
  };
}

interface Zone {
  id: string;
  name: string;
  description: string | null;
  publicId: string | null;
  equipmentCount: number;
}

export default function PublicVenuePage() {
  const params = useParams();
  const router = useRouter();
  const publicId = params.publicId as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEquipment, setShowAddEquipment] = useState(false);

  useEffect(() => {
    loadData();
  }, [publicId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/venue/${publicId}`);
      
      if (!response.ok) {
        throw new Error('Venue not found');
      }

      const data = await response.json();
      setVenue(data.venue);
      setZones(data.zones);
    } catch (error) {
      console.error('Failed to load venue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleZoneClick = (zone: Zone) => {
    if (zone.publicId) {
      router.push(`/zone/${zone.publicId}`);
    }
  };

  const handleAddEquipmentSuccess = () => {
    setShowAddEquipment(false);
    // Optionally reload data to show updated counts
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Venue Not Found</h2>
          <p className="text-gray-600">This venue could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <MapPinIcon className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
              <p className="text-sm text-gray-600 mt-1">{venue.club.name}</p>
              {venue.address && (
                <p className="text-sm text-gray-500 mt-1">
                  {venue.address}
                  {venue.city && `, ${venue.city}`}
                  {venue.state && `, ${venue.state}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Equipment Zones</h2>
            <p className="text-gray-600">
              Select a zone to view equipment details and report issues
            </p>
          </div>
          <button
            onClick={() => setShowAddEquipment(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Add Equipment</span>
          </button>
        </div>

        {zones.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No zones found</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are currently no equipment zones configured for this venue.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => handleZoneClick(zone)}
                disabled={!zone.publicId}
                className={`bg-white rounded-lg shadow-sm p-6 text-left transition-all ${
                  zone.publicId
                    ? 'hover:shadow-md hover:border-indigo-500 border-2 border-transparent cursor-pointer'
                    : 'opacity-50 cursor-not-allowed border-2 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                    {zone.description && (
                      <p className="text-sm text-gray-500 mt-1">{zone.description}</p>
                    )}
                  </div>
                  <CubeIcon className="h-6 w-6 text-indigo-600 flex-shrink-0 ml-2" />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Equipment Items:</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {zone.equipmentCount}
                  </span>
                </div>

                {zone.publicId && (
                  <div className="mt-4">
                    <span className="inline-flex items-center text-sm font-medium text-indigo-600">
                      View Equipment →
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Powered by {venue.club.name}</p>
        </div>
      </div>

      {/* Add Equipment Form Modal */}
      {showAddEquipment && venue && (
        <MobileEquipmentForm
          clubId={venue.club.id}
          venueId={venue.id}
          venueName={venue.name}
          onSubmit={handleAddEquipmentSuccess}
          onCancel={() => setShowAddEquipment(false)}
        />
      )}
    </div>
  );
}
