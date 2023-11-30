"use strict";
import Speaker from "speaker";
import { Configuration } from "./Library/Configuration.js";
import { BasicClient } from "./Library/BasicClient.js";
import { BasicServer } from "./Library/BasicServer.js";
import http from "http";

const config = new Configuration();

// NOTE: This might not want to get done just the one time; not sure.
// We definitely don't want to be constantly spawning new instances of these things, though.
const player = new Speaker({ channels: config.Get("channels"), sampleRate: config.Get("sampleRate"), bitDepth: config.Get("bitDepth") });

function deployServer() {
  const server = http.createServer(function (request, response) {
    console.log(new Date() + " Received request for " + request.url);
    response.writeHead(404);
    response.end();
  })
  server.listen(config.Get("wsPort"), function () {
    console.log(new Date() + " Server is listening on port " + config.Get("wsPort"));
  });
  let _ = new BasicServer(server);
}

function deployClient () {
  let client = new BasicClient({ player });
  client.connect(`ws://${config.Get("wsHost")}:${config.Get("wsPort")}/`, "echo-protocol");
}

// If there is a process argument of "-s" or "--server" then deploy the server
if (process.argv.indexOf("-s") > -1 || process.argv.indexOf("--server") > -1) {
  deployServer();
}

// If there is a process argument of "-c" or "--client" then deploy the client
if (process.argv.indexOf("-c") > -1 || process.argv.indexOf("--client") > -1) {
  deployClient();
}