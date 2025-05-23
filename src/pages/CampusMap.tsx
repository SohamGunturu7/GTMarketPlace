import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

interface CampusMapProps {
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
  marker?: { lat: number; lng: number } | null;
  listings?: { id: string; lat: number; lng: number; title: string }[];
  showMap: boolean;
}

const center = {
  lat: 33.7756, // Georgia Tech latitude
  lng: -84.3963 // Georgia Tech longitude
};

const containerStyle = {
  width: '100%',
  height: '80vh',
  borderRadius: '1.2rem',
  boxShadow: '0 4px 24px rgba(0,48,87,0.13)'
};

export default function CampusMap({ onMapClick, marker, listings, showMap }: CampusMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  if (!isLoaded || !showMap) return <div>Loading Map...</div>;

  return (
    <div style={containerStyle}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '1.2rem' }}
        center={center}
        zoom={16}
        onClick={onMapClick}
      >
        {/* Main marker if provided */}
        {marker && (
          <Marker position={marker} />
        )}
        {/* Listing markers */}
        {listings && listings.map(listing => (
          <Marker
            key={listing.id}
            position={{ lat: Number(listing.lat), lng: Number(listing.lng) }}
            label={{ text: listing.title, color: '#000', fontWeight: 'bold', fontSize: '14px' }}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
