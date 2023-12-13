"use strict";
import { Configuration } from "./Library/Configuration.js";
import { BasicClient } from "./Library/BasicClient.js";
import { BasicServer } from "./Library/BasicServer.js";
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
      console.log(new Date() + " Received request for " + request.url);
    }
    response.writeHead(404);
    response.end();
  })
  server.listen(config.Get("wsPort"), function () {
    if (config.Log > 1) {
      console.log(new Date() + " Server is listening on port " + config.Get("wsPort"));
    }
  });
  let _ = new BasicServer(server);
}

async function deployClient () {
  let client = new BasicClient();
  // 
  // Wait for the server to be up and running before connecting the client
  if (config.Log > 1) {
    console.log(`Waiting for socket server localhost:${config.Get("wsPort")} to be up and running...`);
  }
  await waitUntilUsed(config.Get("wsPort"), 50, ONE_MINUTE);
  client.connect(`ws://${config.Get("wsHost")}:${config.Get("wsPort")}/`, "echo-protocol");
}

// If there is a process argument of "-s" or "--server" then deploy the server
if (process.argv.indexOf("-s") > -1 || process.argv.indexOf("--server") > -1) {
  if (config.Log > 1) {
    console.log(`Deploying client...`);
  }
  deployServer();
}

// If there is a process argument of "-c" or "--client" then deploy the client
if (process.argv.indexOf("-c") > -1 || process.argv.indexOf("--client") > -1) {
  if (config.Log > 1) {
    console.log(`Deploying client...`);
  }
  deployClient();
}