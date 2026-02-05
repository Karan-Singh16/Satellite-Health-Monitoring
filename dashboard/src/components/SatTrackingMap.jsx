import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'; 
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

function RecenterMap({ pos }) {
  const map = useMap();
  useEffect(() => {
    // ONLY update if we have real coordinates (not 0,0)
    if (pos && pos[0] !== 0 && pos[1] !== 0) {
      map.setView(pos, map.getZoom());
    }
  }, [pos, map]);
  return null;
}

export default function SatTrackingMap() {
  const [pos, setPos] = useState([0, 0]);
  const [orbitPath, setOrbitPath] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updatePos = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/satellite/');
        const data = await res.json();
        
        if (data.positions && data.positions.length > 0) {
          const latest = data.positions[0];
          const newPos = [latest.satlatitude, latest.satlongitude];
          
          setPos(newPos);

          const path = data.positions.map(p => [p.satlatitude, p.satlongitude]);
          setOrbitPath(path);
          
          setLoading(false);
        }
      } catch (e) { 
        console.error("Tracking lost:", e); 
      }
    };

    updatePos();
    const interval = setInterval(updatePos, 60000); 
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading-state">INITIALIZING DOWNLINK...</div>;

  return (
    <MapContainer 
      center={pos} 
      zoom={3} 
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      
      {/* Only render these once we have orbitPath data */}
      {orbitPath.length > 0 && (
        <>
          <Polyline 
            positions={orbitPath} 
            pathOptions={{ color: '#58a6ff', weight: 2, dashArray: '5, 10', opacity: 0.6 }} 
          />
          <Marker position={pos}>
            <Popup>STAR-PULSE-01</Popup>
          </Marker>
          <RecenterMap pos={pos} />
        </>
      )}
    </MapContainer>
  );
}