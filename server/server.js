const express = require("express");
const http = require("http");
const axios = require("axios");
const socketIo = require("socket.io");
const readline = require("readline");
const cors = require("cors");
const { Client } = require("@googlemaps/google-maps-services-js");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

app.use(cors());
app.use(express.json());

const port = 8000;
const client = new Client({});
const GOOGLE_MAPS_API_KEY = 'AIzaSyBBpLfENt9ayKz1lZxN2GGimK2nL05HNSc';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let currentDestination = null;
let tasks = [];

const askForDestination = () => {
  rl.question("Enter a new destination (latitude,longitude): ", (answer) => {
    currentDestination = answer;
    console.log(`New destination set: ${currentDestination}`);
    io.emit("newOrder", currentDestination);
    askForDestination();
  });
};
const fetchDriverLocations = async () => {
  try {
    const response = await axios.get(
      "http://185.203.217.168/api/get_devices?lang=en&user_api_hash=$2y$10$F4RpJGDpBDWO2ie448fQAu2Zo0twdwyBdMmnbeSqFbEkjGYocP.Y6",
      {
        timeout: 5000, // Set a timeout of 5 seconds
      }
    );

    if (response.data && Array.isArray(response.data)) {
      const devices = response.data.reduce((acc, group) => {
        return acc.concat(
          group.items.map((item) => ({
            id: item.id,
            name: item.name,
            lat: item.lat,
            lng: item.lng,
          }))
        );
      }, []);

      return devices;
    } else {
      console.error("Invalid response structure:", response.data);
      return [];
    }
  } catch (error) {
    // Enhanced error handling
    if (error.code === "ECONNRESET") {
      console.error(
        "Connection reset by peer. Please check the server status or your network connection."
      );
    } else if (error.code === "ECONNABORTED") {
      console.error(
        "Request timeout. Please check the server response time or try again later."
      );
    } else {
      console.error("Error fetching driver locations:", error.message);
    }
    return [];
  }
};

// Example usage
fetchDriverLocations().then((devices) => {
  console.log(devices);
});

// Example usage
fetchDriverLocations().then((devices) => {
  console.log(devices);
});

const fetchClosestDrivers = async (driverLocations, shopLocations) => {
  try {
    const responses = await Promise.all(
      driverLocations.map((driver) =>
        client.distancematrix({
          params: {
            origins: [{ lat: driver.lat, lng: driver.lng }],
            destinations: shopLocations,
            key: GOOGLE_MAPS_API_KEY,
          },
          timeout: 10000, // Set a timeout of 10 seconds
        })
      )
    );

    const closestDrivers = responses
      .map((response, index) => {
        const element = response.data.rows[0].elements[0];
        if (element.status === "OK") {
          return {
            driver: driverLocations[index],
            distanceValue: element.distance.value,
            durationValue: element.duration.value,
          };
        }
        return null;
      })
      .filter(Boolean);

    return closestDrivers;
  } catch (error) {
    console.error("Error fetching closest drivers:", error.message);
    return [];
  }
};

app.get("/closest-driver", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: "Invalid shop address coordinates" });
  }

  try {
    const driverLocations = await fetchDriverLocations();
    const shopLocations = [
      {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    ];
    const closestDrivers = await fetchClosestDrivers(driverLocations, shopLocations);

    if (closestDrivers.length > 0) {
      const closestDriver = closestDrivers.reduce((prev, curr) =>
        prev.distanceValue < curr.distanceValue ? prev : curr
      );
      res.json(closestDriver);
    } else {
      res.status(404).json({ error: "No drivers found" });
    }
  } catch (error) {
    console.error("Error fetching closest driver:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/directions", async (req, res) => {
  try {
    if (!currentDestination) {
      return res.status(400).send("Destination not set");
    }

    const { origin } = req.query;

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${currentDestination}&key=AIzaSyBBpLfENt9ayKz1lZxN2GGimK2nL05HNSc`;

    console.log(`Requesting URL: ${url}`);

    const response = await axios.get(url);

    if (response.data.routes.length) {
      const route = response.data.routes[0].overview_polyline.points;
      res.json({ route });
    } else {
      console.log("No routes found");
      res.status(404).send("No routes found");
    }
  } catch (error) {
    console.error("Error fetching directions:", error);
    res.status(500).send("Error fetching directions");
  }
});

app.post("/form", (req, res) => {
  const { task } = req.body;
  tasks.push(task);
  io.emit("newTask", task);
  res.status(200).send("Task added successfully");
});

const pollTasks = async () => {
  try {
    const response = await axios.get(
      "http://185.203.217.168/api/get_tasks?user_api_hash=$2y$10$F4RpJGDpBDWO2ie448fQAu2Zo0twdwyBdMmnbeSqFbEkjGYocP.Y6"
    );
    const newTasks = response.data.items.data;

    if (JSON.stringify(newTasks) !== JSON.stringify(tasks)) {
      tasks = newTasks;
      io.emit("newOrder", tasks);
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
  }
};

setInterval(pollTasks, 30000);

io.on("connection", (socket) => {
  console.log("New client connected");

  const sendDriverLocations = async () => {
    const driverLocations = await fetchDriverLocations();
    socket.emit("driverLocations", driverLocations);
  };

  sendDriverLocations();
  const interval = setInterval(sendDriverLocations, 1000);

  socket.on("showRoute", async ({ pickupLat, pickupLng }) => {
    const origin = `${pickupLat},${pickupLng}`;
    io.emit("fetchRoute", origin);

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${currentDestination}&key=AIzaSyBBpLfENt9ayKz1lZxN2GGimK2nL05HNSc`
      );
      if (response.data.routes.length) {
        const route = response.data.routes[0].overview_polyline.points;
        io.emit("routeFetched", { route });
      } else {
        console.log("No routes found");
        io.emit("routeError", "No routes found");
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
      io.emit("routeError", "Error fetching directions");
    }
  });

  socket.emit("currentTasks", tasks);

  socket.on("disconnect", () => {
    clearInterval(interval);
    console.log("Client disconnected");
  });
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  askForDestination();
});
