"use strict";
import { Configuration } from "./Configuration.js";
import websocket from "websocket";

const config = new Configuration();
const formats = [JSON.stringify({ "text": "##" }), JSON.stringify({ "message": "##" })]
const MESSAGE_DELAY = 3000;

let sendIndex = 0;
/**
 * Waits for a connection and then randomly sends text strings to the client with messages of a variety of formats
 * (all json stringified); the client should respond with a list of visemes {visemes: [{offset: 0, id: 0}]
 *
 **/
export class BasicServer extends websocket.server {
  constructor(httpServer) {
    super({ httpServer, autoAcceptConnections: false });
    this.on("request", this.onRequest);
  }
  allowedOrigin(origin) {
    return true;
  }
  async onRequest(request) {
    if (!this.allowedOrigin(request.origin)) {
      request.reject();
      if (config.Log > 0) {
        console.log(`SERVER:`, new Date() + " Connection from origin " + request.origin + " rejected.");
      }
      return;
    }
    // This isn't how good networking actually works.
    // I don't care.
    this.connection = request.accept("echo-protocol", request.origin);
    if (config.Log > 0) {
      console.log(`SERVER:`, new Date() + " Connection accepted.");
    }
    this.connection.on("message", this.onMessage.bind(this));
    this.connection.on("close", this.onClose.bind(this));

    let weakSelf = this;
    setTimeout(() => {
      weakSelf.sendRandomMessage(weakSelf.connection);
    }, Math.random() * 1000);
  }

  async sendRandomMessage(connection) {
    if (connection.closeReasonCode > 0) {
      return
    }
    let text = `${sendIndex} `
    while (text.length < 96) {
      text += config.Word + " ";
    }

    let messageSendStart = new Date();
    let format = formats[Math.floor(Math.random() * formats.length)];
    let data = JSON.parse(format.replace("##", text));
    connection.sendUTF(JSON.stringify({ text: text }));
    sendIndex++;
    console.log(`SERVER: Sent message in ${new Date() - messageSendStart} ms`)

    let weakSelf = this;
    let delay = (Math.random() * MESSAGE_DELAY * 0.75) + (MESSAGE_DELAY * 0.25);
    console.log(`SERVER: Sending next message in ${delay} ms`)
    let start = new Date();
    setTimeout(() => {
      weakSelf.sendRandomMessage(this.connection);
      console.log(`SERVER: Sent message in ${new Date() - start} ms`)
    }, delay);
  }

  onMessage(message) {
    if (message.type === "utf8") {
      // console.log(`SERVER:\n\tReceived Message: ${message.utf8Data}`);
      try {
        // console.log(`SERVER:`, JSON.parse(message.utf8Data));

      } catch (error) { }
    } else if (message.type === "binary") {
      console.log(`SERVER: Received Binary Message of ${message.binaryData.length} bytes`);
    }
  }

  onClose(reasonCode, description) {
    if (config.Log > 0) {
      console.log(`SERVER: `, new Date() + ` Peer ${this.remoteAddress} disconnected.`);
      if (config.Log > 1) {
        console.log(`SERVER:\tReason: ${reasonCode}\n\tDescription: ${description}`);
      }
    }
  }
}
