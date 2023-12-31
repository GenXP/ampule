"use strict";
import { Configuration } from "./Configuration.js";
import { Log } from "./Log.js";
import { VoiceManager } from "./VoiceManager.js";
import websocket from "websocket";

const config = new Configuration();

export class BasicClient extends websocket.client {
  connection = null;
  voiceConfiguration = null;
  voiceManager = null;

  constructor() {
    super();
    this.on("connect", this.OnConnect.bind(this));
    this.on("connectFailed", this.OnConnectionFailed.bind(this));
  }

  async OnConnect(connection) {
    if (connection == this.connection && this?.connection?.connected) {
      return;
    }

    if (config.Log > 1) {
      Log.Log("BasicClient", "WebSocket client connected");
    }

    this.connection = connection;
    this.connection.on("error", this.OnError.bind(this));
    this.connection.on("close", this.OnClose.bind(this));
    this.connection.on("message", this.onMessage.bind(this));

    this.voiceManager = new VoiceManager();
  }

  OnConnectionFailed(error) {
    if (config.Log > 0) {
      Log.Error("BasicClient", `Connect Error: ${error.toString()}`);
      Log.Error("BasicClient", error);
    }
    process.exit();
  }

  OnError(error) {
    if (config.Log > 0) {
      Log.Error("BasicClient", `Error received from websocket: ${error.toString()}`);
      Log.Error("BasicClient", `Error received from websocket: ${error.toString()}`);
      console.error(error);
    }
    process.exit(0);
  }

  OnClose() {
    if (config.Log > 1) {
      Log.Log("BasicClient", "WebSocket Connection Closed");
    }
    process.exit(0);
  }

  async onMessage(message) {
    let objectMessage = message.utf8Data
      ? JSON.parse(message.utf8Data)
      : message.utf8Data;
    let responseDetails = { visemes: [] };

    this.voiceManager.cancelPending();

    if (objectMessage.hasOwnProperty("text") || objectMessage.hasOwnProperty("ssml")) {
      if (config.Log > 2) {
        if(objectMessage.hasOwnProperty("text")){
          Log.Log("BasicClient", `Text Received: ${objectMessage.text}`);
        }
        if(objectMessage.hasOwnProperty("ssml")){
          Log.Log("BasicClient", `SSML Received: ${objectMessage.ssml}`);
        }
      }
      try {
        /**
         *   Message {
         *   "text": "string",
         *   "locale": "string",
         *   "region": "string",
         *   "voice": "string",
         *   "key": "string"
         *  }
         **/
        responseDetails.visemes = await this.voiceManager.Speak(objectMessage);
        this.sendVisemes(responseDetails);
      } catch (err) {
        console.error(err);
      }
      return;
    }
  }

  sendVisemes(visemes) {
    if (config.Log > 1) {
      Log.Log("BasicClient", `Sending Visemes: ${visemes}`);
    }
    this.connection.sendUTF(JSON.stringify({ visemes }));
  }
}
