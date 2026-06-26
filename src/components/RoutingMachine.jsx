import { useEffect } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { useMap } from "react-leaflet";

export default function RoutingMachine({ start, end, onRouteFound }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !start || !end) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start[0], start[1]),
        L.latLng(end[0], end[1])
      ],
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
      show: false,
      lineOptions: {
        styles: [{ color: "var(--primary)", weight: 5, opacity: 0.8 }]
      },
      createMarker: function() { return null; }
    }).addTo(map);

    routingControl.on('routesfound', function(e) {
      if (onRouteFound) {
        onRouteFound(e.routes[0]);
      }
    });

    return () => map.removeControl(routingControl);
  }, [map, start, end]);

  return null;
}
