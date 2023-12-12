"use strict";
import { ResultReason, SpeechSynthesizer, SpeechConfig, AudioConfig } from "microsoft-cognitiveservices-speech-sdk";
import { Configuration } from "./Configuration.js";
import AudioSource from "audiosource";
import { StreamAudioContext as AudioContext } from "web-audio-engine";

import Speaker from "speaker";
import { randomUUID } from "crypto";

import { pipeline } from "stream/promises";
import { Readable, Transform } from "stream";

import { Worker, isMainThread, workerData } from "node:worker_threads";

const config = new Configuration();

export class VoiceManager {
  player = null;
  workers = []

  constructor(player) {
    this.player = new Speaker({ channels: config.Get("channels"), sampleRate: config.Get("sampleRate"), bitDepth: config.Get("bitDepth") });
    this.speakers = [];
  }

  cancelPending() {
    for (const speakerStub of this.workers) {
      speakerStub.postMessage("Something")
    }
    // this.speakers = this.speakers.filter(speakerStub => Math.abs(speakerStub.CancelledOn - new Date().getTime()) > 1000);
  }

  async Speak(message) {
    var audioFile = "tmp-audio.wav";
    var speechKey = message.key || config.Get("key");
    var speechRegion = message.region || config.Get("region");
    var voicetype = message.voice || config.Get("voice");
    const speechConfig = SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisVoiceName = voicetype;
    const audioConfig = AudioConfig.fromAudioFileOutput(audioFile);
    let synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
    let weakSelf = this;

    return new Promise(function (resolve, reject) {

      const ssml = `<speak version='1.0' xml:lang='en-US' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts'> \r\n \
            <voice name='${speechConfig.speechSynthesisVoiceName}'> \r\n \
                <mstts:viseme type='redlips_front'/> \r\n \
                ${message.text} \r\n \
            </voice> \r\n \
        </speak>`;
      let visemes = [];

      synthesizer.visemeReceived = (s, e) => {
        if (config.Log > 1) {
          // console.log("(Viseme), Audio offset: " + e.audioOffset / 10000 + "ms. Viseme ID: " + e.visemeId);
          visemes.push({ offset: e.audioOffset, id: e.visemeId });
        }
      };

      synthesizer.speakSsmlAsync(ssml,
        async function (result) {
          if (result.reason === ResultReason.SynthesizingAudioCompleted) {

            //if (weakSelf.speakers.length > 1) {
            //  weakSelf.speakers.forEach((speakerStub, i) => {
            //    weakSelf.speakers[i].audio_handle = null;
            //    weakSelf.speakers[i].speaker = null;
            //  })
            //}

            // let speaker = new Speaker({ channels: config.Get("channels"), sampleRate: config.Get("sampleRate"), bitDepth: config.Get("bitDepth") });

            try {
              let worker = new Worker("/Users/tingh/source/repos/genxp/ampule/Library/player.js", { workerData: result.audioData })
              worker.on("error", (err) => { console.error(err) });
              worker.on("exit", (code) => { if (code !== 0) { console.error(`Worker stopped with exit code ${code}`); } });
              worker.on("message", (msg) => {
                console.log(msg);
                process.exit(0);
              });
              weakSelf.workers.push(worker);
            } catch (e) {
              console.error(e)
            }

            //let playerStub = {
            //  id: randomUUID(),
            //  IsCancelled: false,
            //  CancelledOn: null,
            //  speaker
            //};
            //weakSelf.speakers.push(playerStub)

            //let segmentedAudioData = [];
            //let segmentSize = 32000;
            //let chunks = 0;
            //let chunk = 0;
            //// Make sure we get all the chunks
            //while (chunks < result.audioData.byteLength) {
            //  if (playerStub.IsCancelled) {
            //    return;
            //  }
            //  segmentedAudioData[chunk] = ( new Uint8Array(result.audioData.slice(chunks, chunks + segmentSize)) );
            //  chunks += segmentSize;
            //  chunk++;
            //}
            //segmentedAudioData[chunk] = ( new Uint8Array(result.audioData.slice(chunks, result.audioData.byteLength)) );

            //if (playerStub.IsCancelled) {
            //  return;
            //}
            //// Readable.from(segmentedAudioData).pipe(speaker)
            //await pipeline(segmentedAudioData, new Transform({
            //  transform(chunk, encoding, callback) {
            //    if (playerStub.IsCancelled) {
            //      return;
            //    }
            //    this.push(chunk);
            //    callback();
            //  }
            //}), speaker);

            resolve(visemes);
          } else {
            if (config.Log > 1) {
              console.error(`Speech synthesis canceled\n\tREASON: ${result.errorDetails}\nDid you set the speech resource key and region values?`);
            }
            reject(new Error(result.reason));
          }
          synthesizer.close();
          synthesizer = null;
        },
        function (err) {
          console.trace("err - " + err);
          synthesizer.close();
          synthesizer = null;
          reject(err);
        });
    });
  }
}
