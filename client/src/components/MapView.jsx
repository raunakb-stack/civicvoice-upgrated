import { useEffect, useRef } from 'react';

const STATUS_COLORS = {
  Pending:      '#eab308',
  'In Progress':'#3b82f6',
  Resolved:     '#22c55e',
  Overdue:      '#ef4444',
  Escalated:    '#a855f7',
};

// Sample Amravati ward boundaries (simplified GeoJSON polygons)
// In production, replace with actual municipality GeoJSON data
const AMRAVATI_WARDS = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { ward: 'Ward 1 – Rajapeth',       color: '#6366f1' },
      geometry: { type: 'Polygon', coordinates: [[[77.755, 20.930],[77.775, 20.930],[77.775, 20.945],[77.755, 20.945],[77.755, 20.930]]] } },
    { type: 'Feature', properties: { ward: 'Ward 2 – Jaistambh Chowk', color: '#ec4899' },
      geometry: { type: 'Polygon', coordinates: [[[77.775, 20.930],[77.795, 20.930],[77.795, 20.945],[77.775, 20.945],[77.775, 20.930]]] } },
    { type: 'Feature', properties: { ward: 'Ward 3 – Badnera',         color: '#14b8a6' },
      geometry: { type: 'Polygon', coordinates: [[[77.755, 20.915],[77.775, 20.915],[77.775, 20.930],[77.755, 20.930],[77.755, 20.915]]] } },
    { type: 'Feature', properties: { ward: 'Ward 4 – Shivajinagar',    color: '#f97316' },
      geometry: { type: 'Polygon', coordinates: [[[77.775, 20.915],[77.795, 20.915],[77.795, 20.930],[77.775, 20.930],[77.775, 20.915]]] } },
    { type: 'Feature', properties: { ward: 'Ward 5 – Camp Area',        color: '#8b5cf6' },
      geometry: { type: 'Polygon', coordinates: [[[77.755, 20.945],[77.775, 20.945],[77.775, 20.960],[77.755, 20.960],[77.755, 20.945]]] } },
    { type: 'Feature', properties: { ward: 'Ward 6 – Satav Colony',     color: '#10b981' },
      geometry: { type: 'Polygon', coordinates: [[[77.775, 20.945],[77.795, 20.945],[77.795, 20.960],[77.775, 20.960],[77.775, 20.945]]] } },
  ],
};

export default function MapView({ complaints = [], center = [20.9374, 77.7796], zoom = 13, showWards = true }) {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markersRef  = useRef([]);
  const wardLayerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet').then((L) => {
      if (mapInstance.current) return;
      mapInstance.current = L.map(mapRef.current).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstance.current);
    });
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  // Ward boundaries layer
  useEffect(() => {
    if (!mapInstance.current) return;
    import('leaflet').then((L) => {
      if (wardLayerRef.current) { wardLayerRef.current.remove(); wardLayerRef.current = null; }
      if (!showWards) return;

      wardLayerRef.current = L.geoJSON(AMRAVATI_WARDS, {
        style: (feature) => ({
          color:       feature.properties.color,
          weight:      2,
          opacity:     0.7,
          fillColor:   feature.properties.color,
          fillOpacity: 0.08,
          dashArray:   '5, 5',
        }),
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties.ward, {
            permanent:  false,
            direction:  'center',
            className:  'ward-label',
          });
          layer.on('mouseover', function () {
            this.setStyle({ fillOpacity: 0.2, weight: 3 });
          });
          layer.on('mouseout', function () {
            this.setStyle({ fillOpacity: 0.08, weight: 2 });
          });
        },
      }).addTo(mapInstance.current);
    });
  }, [showWards]);

  // Complaint markers
  useEffect(() => {
    if (!mapInstance.current) return;
    import('leaflet').then((L) => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      complaints.forEach((c) => {
        if (!c.location?.lat || !c.location?.lng) return;
        const color = STATUS_COLORS[c.status] || '#e8820c';
        const icon = L.divIcon({
          html: `<div style="
            width:28px;height:28px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);background:${color};
            border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
          </div>`,
          iconSize: [28, 28], iconAnchor: [14, 28], className: '',
        });

        const marker = L.marker([c.location.lat, c.location.lng], { icon })
          .addTo(mapInstance.current)
          .bindPopup(`
            <div style="font-family:DM Sans,sans-serif;padding:12px;min-width:200px">
              <div style="font-size:11px;color:#888;margin-bottom:4px">${c.department}</div>
              <div style="font-weight:700;font-size:14px;margin-bottom:6px">${c.title}</div>
              <span style="background:${color}20;color:${color};border:1px solid ${color}40;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;">${c.status}</span>
              ${c.emergency ? '<div style="color:#ef4444;font-size:11px;font-weight:700;margin-top:6px">🚨 EMERGENCY</div>' : ''}
              <div style="margin-top:8px">
                <a href="/complaints/${c._id}" style="color:#e8820c;font-size:12px;font-weight:600;">View Details →</a>
              </div>
            </div>
          `);
        markersRef.current.push(marker);
      });
    });
  }, [complaints]);

  return (
    <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden' }} />
  );
}
