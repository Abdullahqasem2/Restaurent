import React, { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import icon from '../../../shop.png';

const socket = io('http://localhost:8000');


const shopLocations = [
  { id: 8, name: "BBQ-Pizza", lat: 31.894595, lng: 35.213185 }
];
const GoogleMapsLoader = () => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [driverLocations, setDriverLocations] = useState([]);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const loadGoogleMaps = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        setIsScriptLoaded(true);
        resolve();
        return;
      }

      const existingScript = document.getElementById('googleMaps');
      if (existingScript) {
        existingScript.onload = () => {
          setIsScriptLoaded(true);
          resolve();
        };
        return;
      }

      const script = document.createElement('script');
      script.id = 'googleMaps';
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBBpLfENt9ayKz1lZxN2GGimK2nL05HNSc&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsScriptLoaded(true);
        resolve();
      };
      script.onerror = () => reject(new Error('The Google Maps JavaScript API could not load.'));

      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => console.log('Google Maps loaded'))
      .catch((error) => console.error('Error loading Google Maps:', error));

    return () => {
      const script = document.getElementById('googleMaps');
      if (script) {
        script.remove();
      }
    };
  }, [loadGoogleMaps]);


  useEffect(() => {
    if (isScriptLoaded && !mapRef.current) {
      mapRef.current = new window.google.maps.Map(document.getElementById('map'), {
        center: { lat: 31.898043, lng: 35.204269 },
        zoom: 12.5,
      });

      const shopIcon = {
        url: icon,
        size: new window.google.maps.Size(28, 28),
        anchor: new window.google.maps.Point(16, 16),
      };

      shopLocations.forEach((shop) => {
        if (!markersRef.current[shop.id]) {
          markersRef.current[shop.id] = new window.google.maps.Marker({
            position: { lat: shop.lat, lng: shop.lng },
            map: mapRef.current,
            title: `${shop.name}`,
            icon: shopIcon,
          });
        }
      });
    }
  }, [isScriptLoaded, shopLocations]);
  
  useEffect(() => {
    if (isScriptLoaded) {
      driverLocations.forEach((driver) => {
        const carIcon = {
          path: 'M20.92 5.01c-.35-.61-1.04-1-1.75-1H4.83c-.71 0-1.4.39-1.75 1L1 9v12c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h16v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1V9l-2.08-3.99zM6.5 17c-.83 0-1.5-.67-1.5-1.5S5.67 14 6.5 14s1.5.67 1.5 1.5S7.33 17 6.5 17zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
          fillColor: '#FF0000',
          fillOpacity: 1,
          scale: 1,
          anchor: new window.google.maps.Point(15, 15),
        };

        if (!markersRef.current[driver.id]) {
          markersRef.current[driver.id] = new window.google.maps.Marker({
            position: { lat: driver.lat, lng: driver.lng },
            map: mapRef.current,
            title: `Driver ${driver.name}`,
            icon: carIcon,
          });
        } else {
          markersRef.current[driver.id].setPosition(new window.google.maps.LatLng(driver.lat, driver.lng));
        }
      });
    }
  }, [isScriptLoaded, driverLocations]);

  useEffect(() => {
    socket.on('driverLocations', (locations) => {
      setDriverLocations(locations);
    });

    socket.on('newTask', (task) => {
      if (task.assignedDriver) {
        setDriverLocations((prevLocations) =>
          prevLocations.map((driver) =>
            driver.id === task.assignedDriver.id
              ? { ...driver, task }
              : driver
          )
        );
      }
    });
    return () => {
      socket.off('driverLocations');
      socket.off('newTask');
    };
  }, []);

  return <div id="map" style={{ height: '77vh', width: '100%' }}></div>;
};

export default GoogleMapsLoader;
