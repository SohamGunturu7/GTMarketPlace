import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

interface CampusMapProps {
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
  marker?: { lat: number; lng: number } | null;
  listings?: { id: string; lat: number; lng: number; title: string }[];
}

const containerStyle = {
  width: '100%',
  height: '80vh',
  borderRadius: '1.2rem',
  boxShadow: '0 4px 24px rgba(0,48,87,0.13)'
};

const center = {
  lat: 33.7756, // Georgia Tech latitude
  lng: -84.3963 // Georgia Tech longitude
};

const meetupSpots = [
  { lat: 33.7756, lng: -84.3963, label: 'Student Center' },
  { lat: 33.7735, lng: -84.3981, label: 'GT Police Station' }
];

export default function CampusMap({ onMapClick, marker, listings }: CampusMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  console.log('CampusMap render - listings:', listings);
  console.log('CampusMap render - isLoaded:', isLoaded);

  if (!isLoaded) return <div>Loading Map...</div>;

  if (listings) {
    console.log('Rendering markers:', listings);
    listings.forEach(listing => {
      console.log('Listing marker data:', {
        id: listing.id,
        title: listing.title,
        lat: listing.lat,
        lng: listing.lng,
        latType: typeof listing.lat,
        lngType: typeof listing.lng
      });
    });
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={16}
      onClick={onMapClick}
    >
      {/* Removed manual test pin */}
      {marker && (
        <Marker position={marker} label="Listing Pin" />
      )}
      {listings && listings.map(listing => {
        const lat = Number(listing.lat);
        const lng = Number(listing.lng);
        
        // Skip invalid coordinates
        if (isNaN(lat) || isNaN(lng)) {
          // Removed console.warn
          return null;
        }

        return (
          <Marker
            key={listing.id}
            position={{ lat, lng }}
            title={listing.title}
            label={{
              text: listing.title,
              color: "#000000",
              fontSize: "14px",
              fontWeight: "bold",
              className: "custom-marker-label"
            }}
            onClick={() => {
              // Removed console.log
            }}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new google.maps.Size(32, 32)
            }}
            animation={google.maps.Animation.DROP}
          />
        );
      })}
    </GoogleMap>
  );
} 