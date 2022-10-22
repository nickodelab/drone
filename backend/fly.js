const throttle = require("lodash/throttle");
require("dotenv").config();

// socket-http = front <-> back
const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);

// socket - udp = back <-> drone
const dgram = require("dgram");

const { DRONE_IP, DRONE_PORT, DRONE_STATE_PORT, HTTP_PORT } = process.env;

const drone = dgram.createSocket("udp4");
drone.bind(DRONE_PORT);
drone.on("message", (message) => {
  console.log(`Received message from drone => ${message}`);
  io.sockets.emit("status", message.toString());
});

function handleError(err) {
  if (err) {
    console.log("ERROR");
    console.log(err);
  }
}
drone.send("command", 0, "command".length, DRONE_PORT, DRONE_IP, handleError);

const droneState = dgram.createSocket("udp4");
droneState.bind(DRONE_STATE_PORT);
droneState.on(
  "message",
  throttle((state) => {
    const stateObject = parseState(state.toString());
    console.log(stateObject);
    io.sockets.emit("dronestate", stateObject);
  }, 1000)
);

function parseState(state) {
  return state
    .split(";")
    .map((x) => x.split(":"))
    .reduce((data, [key, value]) => {
      if (!value) return data;
      data[key] = value;
      return data;
    }, {});
}
io.on("connection", (socket) => {
  socket.on("command", (command) => {
    console.log("command Sent from browser");
    console.log(command);
    drone.send(command, 0, command.length, DRONE_PORT, DRONE_IP, handleError);
  });

  socket.emit("status", "CONNECTED");
});

http.listen(HTTP_PORT, () => {
  console.log("Socket io server up and running");
});
