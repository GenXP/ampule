"use strict";
import { Configuration } from "./Library/Configuration.js";
import { BasicClient } from "./Library/BasicClient.js";
import { BasicServer } from "./Library/BasicServer.js";
import { Log } from "./Library/Log.js";

import http from "http";
import TCPPackage from "tcp-port-used";

const {waitUntilUsed} = TCPPackage;

const config = new Configuration();

const ONE_MINUTE = 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

function deployServer() {
  const server = http.createServer(function (request, response) {
    if (config.Log > 1) {
      Log.Log("Main", new Date() + " Received request for " + request.url);
    }
    response.writeHead(404);
    response.end();
  })
  server.listen(config.Get("wsPort"), function () {
    if (config.Log > 1) {
      Log.Log(new Date() + " Server is listening on port " + config.Get("wsPort"));
    }
  });
  let _ = new BasicServer(server);
}

async function deployClient () {
  let client = new BasicClient();
  const pollRate = 50;
  const currentTimeout = FIVE_MINUTES;
  // 
  // Wait for the server to be up and running before connecting the client
  if (config.Log > 1) {
    Log.Log("Main", `Waiting for socket server`);
    Log.Log("Main", `== Connection Pending: localhost:${config.Get("wsPort")}`)
    Log.Log("Main", `== Polling: ${pollRate}ms`)
    Log.Log("Main", `== Timeout: ${currentTimeout / 60000} minutes`)
  }
  await waitUntilUsed(config.Get("wsPort"), pollRate, currentTimeout);
  client.connect(`ws://${config.Get("wsHost")}:${config.Get("wsPort")}/`, "echo-protocol");
}

// If there is a process argument of "-s" or "--server" then deploy the server
if (process.argv.indexOf("-s") > -1 || process.argv.indexOf("--server") > -1) {
  if (config.Log > 1) {
    Log.Log("Main", `Deploying server...`);
  }
  deployServer();
}

// If there is a process argument of "-c" or "--client" then deploy the client
if (process.argv.indexOf("-c") > -1 || process.argv.indexOf("--client") > -1) {
  deployClient();
}