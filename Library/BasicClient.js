"use strict";
import { Configuration } from "./Configuration.js";
import { VoiceManager } from "./VoiceManager.js";
import websocket from "websocket";

const config = new Configuration();

export class BasicClient extends websocket.client {
  connection = null;
  voiceConfiguration = null;
  voiceManager = null;

  constructor(voiceConfiguration) {
    super();
    this.on("connect", this.OnConnect.bind(this));
    this.on("connectFailed", this.OnConnectionFailed.bind(this));

    this.voiceConfiguration = voiceConfiguration;
  }

  async OnConnect(connection) {
    if (connection == this.connection && this?.connection?.connected) {
      return
    }

    if (!this.voiceConfiguration) {
      return
    }

    if (config.Log > 1) {
      console.log("WebSocket client connected");
    }

    this.connection = connection;
    this.connection.on("error", this.OnError.bind(this));
    this.connection.on("close", this.OnClose.bind(this));
    this.connection.on("message", this.onMessage.bind(this));

    this.voiceManager = new VoiceManager(this.voiceConfiguration.speechConfig,
                                         this.voiceConfiguration.audioConfig,
                                          this.voiceConfiguration.player);
  }

  OnConnectionFailed(error) {
    if (config.Log > 0) {
      console.log(`Connect Error: ${error.toString()}`);
      console.error(error);
    }
  }

  OnError(error) {
    console.log(`Error received from websocket: ${error.toString()}`);
    console.error(error);
  }

  OnClose() {
    if (config.Log > 1) {
      console.log("WebSocket Connection Closed");
    }
  }

  async onMessage(message) {
    let objectMessage = message.utf8Data ? JSON.parse(message.utf8Data) : message.utf8Data;
    // Reduce all values of objectMessage that are strings into a single array
    let longestTextItem = Object.keys(objectMessage).reduce((acc, key) => {
      if (typeof objectMessage[key] === "string") {
        acc.push(objectMessage[key]);
      }
      return acc;
    }, [])
      .reduce((acc, key, i, self) => {
        // Get the longest of all the strings
        if (key.length > acc.length) {
          acc = key;
        }
        return acc;
      }, "");

    let responseDetails = { visemes: [] };

    if (objectMessage.hasOwnProperty("text")) {
      if (config.Log > 2) {
        console.log(`Received: ${objectMessage.text}`);
      }
      try {
        responseDetails.visemes = await this.voiceManager.Speak(objectMessage.text);
        this.sendVisemes(responseDetails);
      } catch (err) {
        console.error(err);
      }
      return
    }

    if (longestTextItem?.length > 0) {
      if (config.Log > 1) {
        console.log(`Received: ${longestTextItem}`);
      }
      try {
        responseDetails.visemes = await this.voiceManager.Speak(longestTextItem);
        this.sendVisemes(responseDetails);
      } catch (err) {
        console.error(err);
      }
      return
    }
  }

  sendVisemes(visemes) {
    if (config.Log > 1) {
      console.log(`Sending Visemes: ${visemes}`);
    }
    this.connection.sendUTF(JSON.stringify({ visemes }));
  }
}
