import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HyderabadArea } from '../types';
import { MapPin, Navigation, Compass, CheckCircle2, ShieldCheck } from 'lucide-react';

interface LocationPickerMapProps {
  selectedArea: HyderabadArea;
  onAreaChange: (area: HyderabadArea) => void;
  onLocationSelect?: (lat: number, lng: number, addressSuggestion?: string) => void;
}

// Coordinates for Hyderabad core healthcare hubs
const HYDERABAD_COORDINATES: Record<HyderabadArea, [number, number]> = {
  'Gachibowli': [17.4401, 78.3489],
  'Madhapur': [17.4483, 78.3915],
  'Banjara Hills': [17.4156, 78.4350],
  'Jubilee Hills': [17.4319, 78.4073],
  'Hitec City': [17.4435, 78.3772],
  'Kondapur': [17.4699, 78.3578],
  'Kukatpally': [17.4938, 78.3999],
  'Secunderabad': [17.4399, 78.4983],
  'LB Nagar': [17.3457, 78.5522],
  'Dilsukhnagar': [17.3688, 78.5247]
};

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  selectedArea,
  onAreaChange,
  onLocationSelect
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [coords, setCoords] = useState<[number, number]>(HYDERABAD_COORDINATES[selectedArea] || [17.4483, 78.3915]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('Pin your exact home/doorstep location');

  // Find nearest defined Hyderabad area to coordinates
  const getNearestArea = (lat: number, lng: number): HyderabadArea => {
    let nearest: HyderabadArea = selectedArea;
    let minDistance = Infinity;

    Object.entries(HYDERABAD_COORDINATES).forEach(([area, [aLat, aLng]]) => {
      const d = Math.hypot(lat - aLat, lng - aLng);
      if (d < minDistance) {
        minDistance = d;
        nearest = area as HyderabadArea;
      }
    });

    return nearest;
  };

  // Custom Medical Pin SVG Icon
  const createMedicalPinIcon = () => {
    return L.divIcon({
      className: 'custom-medical-pin',
      html: `
        <div style="position: relative; width: 42px; height: 42px; transform: translate(-50%, -100%);">
          <div style="
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 14px;
            height: 6px;
            background: rgba(15, 39, 68, 0.35);
            border-radius: 50%;
            filter: blur(1.5px);
          "></div>
          <div style="
            width: 38px;
            height: 38px;
            background: #E63946;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(230, 57, 70, 0.45);
            border: 2.5px solid #FFFFFF;
          ">
            <div style="
              transform: rotate(45deg);
              color: white;
              font-weight: 900;
              font-size: 16px;
              line-height: 1;
            ">+</div>
          </div>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 42]
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialPos = HYDERABAD_COORDINATES[selectedArea] || [17.4483, 78.3915];

      const map = L.map(mapContainerRef.current, {
        center: initialPos,
        zoom: 14,
        scrollWheelZoom: false, // Prevents interfering with modal scrolling
        zoomControl: true
      });

      // Direct OpenStreetMap standard tiles (100% free, no API key watermark)
      const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      });
      osmLayer.addTo(map);

      // Dispatch coverage circle (1.5km radius from pin)
      const circle = L.circle(initialPos, {
        color: '#E63946',
        fillColor: '#E63946',
        fillOpacity: 0.1,
        weight: 1.5,
        dashArray: '4, 4',
        radius: 1200
      }).addTo(map);
      circleRef.current = circle;

      // Draggable Marker
      const marker = L.marker(initialPos, {
        draggable: true,
        icon: createMedicalPinIcon()
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCoords([pos.lat, pos.lng]);
        circle.setLatLng(pos);
        const nearest = getNearestArea(pos.lat, pos.lng);
        onAreaChange(nearest);
        setLocationStatus(`Pinned near ${nearest} (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`);
        if (onLocationSelect) {
          onLocationSelect(pos.lat, pos.lng, `${nearest}, Hyderabad`);
        }
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        setCoords([lat, lng]);
        const nearest = getNearestArea(lat, lng);
        onAreaChange(nearest);
        setLocationStatus(`Pinned near ${nearest} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        if (onLocationSelect) {
          onLocationSelect(lat, lng, `${nearest}, Hyderabad`);
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate map size to ensure all tiles render crisp within modal transitions
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 450);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map when selectedArea changes from parent dropdown/pills
  useEffect(() => {
    const targetCoords = HYDERABAD_COORDINATES[selectedArea];
    if (targetCoords && mapInstanceRef.current && markerRef.current && circleRef.current) {
      mapInstanceRef.current.flyTo(targetCoords, 14, { duration: 1.2 });
      markerRef.current.setLatLng(targetCoords);
      circleRef.current.setLatLng(targetCoords);
      setCoords(targetCoords);
      setLocationStatus(`Selected Zone: ${selectedArea} (Active Coverage)`);
    }
  }, [selectedArea]);

  // Use HTML5 Geolocation API
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Locating your GPS coordinates in Hyderabad...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setIsLocating(false);

        // Center on user position
        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.5 });
          markerRef.current.setLatLng([latitude, longitude]);
          circleRef.current.setLatLng([latitude, longitude]);
          setCoords([latitude, longitude]);

          const nearest = getNearestArea(latitude, longitude);
          onAreaChange(nearest);
          setLocationStatus(`📍 GPS Locked: Near ${nearest}`);
          if (onLocationSelect) {
            onLocationSelect(latitude, longitude, `GPS Location, ${nearest}`);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation failed:', err.message);
        setLocationStatus('Could not detect GPS. Please tap your area on the map.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const quickAreas: HyderabadArea[] = [
    'Madhapur',
    'Gachibowli',
    'Banjara Hills',
    'Jubilee Hills',
    'Hitec City',
    'Kondapur',
    'Kukatpally'
  ];

  return (
    <div className="location-map-wrapper">
      <div className="location-map-header">
        <div className="location-status-text">
          <MapPin size={15} style={{ color: 'var(--accent-red-500)', flexShrink: 0 }} />
          <span>{locationStatus}</span>
        </div>

        <button
          type="button"
          className="locate-me-btn"
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Detect Current GPS Location"
        >
          <Navigation size={13} className={isLocating ? 'spin-icon' : ''} />
          <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
        </button>
      </div>

      {/* Quick Area Filter Pills */}
      <div className="map-area-pills">
        {quickAreas.map((zone) => (
          <button
            key={zone}
            type="button"
            className={`map-area-chip ${selectedArea === zone ? 'active' : ''}`}
            onClick={() => onAreaChange(zone)}
          >
            {zone}
          </button>
        ))}
      </div>

      {/* Interactive Map Canvas Container */}
      <div
        ref={mapContainerRef} data-lenis-prevent="true"
        className="leaflet-map-frame"
        style={{
          height: '210px',
          width: '100%',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1.5px solid var(--neutral-200)',
          position: 'relative',
          zIndex: 1
        }}
      />

      {/* Map Footer Information */}
      <div className="map-footer-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success-green)' }}>
          <CheckCircle2 size={13} />
          <span>Doorstep Dispatch Ready</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--neutral-600)' }}>
          <ShieldCheck size={13} style={{ color: 'var(--clinical-blue-600)' }} />
          <span>Nurse arrival: <strong>35 - 45 mins</strong></span>
        </div>
      </div>
    </div>
  );
};
