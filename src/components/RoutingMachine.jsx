import { useEffect } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { useMap } from "react-leaflet";

export default function RoutingMachine({ start, end, waypoints, onRouteFound }) {
  const map = useMap();

  useEffect(() => {
    let pts = [];
    if (waypoints && waypoints.length >= 2) {
      pts = waypoints;
    } else if (start && end) {
      pts = [start, end];
    } else {
      return;
    }

    if (!map) return;

    const routingControl = L.Routing.control({
      waypoints: pts.map(wp => L.latLng(wp[0], wp[1])),
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
  }, [map, start, end, waypoints]);

  return null;
}
