"use strict";
import { ResultReason, SpeechSynthesizer, SpeechConfig, AudioConfig } from "microsoft-cognitiveservices-speech-sdk";
import { Configuration } from "./Configuration.js";
import Speaker from "speaker";
import { Readable } from "stream";
import { Worker } from "node:worker_threads";
import { fork } from "child_process";
import { Log } from "./Log.js";

const config = new Configuration();

export class VoiceManager {
  player = null;
  workers = []
  forks = []
  speakers = []

  constructor() {
    this.player = new Speaker({ channels: config.Get("channels"), sampleRate: config.Get("sampleRate"), bitDepth: config.Get("bitDepth") });
    this.workers = [];
    this.forks = [];
    this.speakers = [];
  }

  cancelPending() {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    for (const fork of this.forks) {
      fork.kill();
    }
    this.forks = [];
    for (const speaker of this.speakers) {
      // NOTE: Does not work, speaker is still playing
      speaker.end();
    }
    this.speakers = [];
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
    console.log(speechKey);
    console.log(speechRegion);
    console.log(voicetype);

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
          Log.Log("VoiceManager", "(Viseme), Audio offset: " + e.audioOffset / 10000 + "ms. Viseme ID: " + e.visemeId);
        }
        visemes.push({ offset: e.audioOffset, id: e.visemeId });
      };

      synthesizer.speakSsmlAsync(ssml,
        async function (result) {
          if (result.reason === ResultReason.SynthesizingAudioCompleted) {

            if (visemes[visemes.length - 1].id !== 0) {
              Log.Log("VoiceManager", `Adding missing viseme 0 at ${result.duration}ms`);
              visemes.push({ offset: result.duration, id: 0 });
            }

            // NOTE: This is moved to before invoking child processes to account for any latency involved in launching new processes.
            resolve(visemes);

            if (config.Get("AudioPlaybackStrategy") === "inline") {
              console.warn("Inline audio playback is not recommended for production use, audio playback does not cancel when new audio is requested");
              let speaker = new Speaker({ channels: config.Get("channels"), sampleRate: config.Get("sampleRate"), bitDepth: config.Get("bitDepth") });
              Readable.from(result.audioData).pipe(speaker);
              weakSelf.speakers.push(speaker);
            } else if (config.Get("AudioPlaybackStrategy") === "worker") {
              // Triggers a new worker for each audio file playback
              let workerThread = new Worker(config.ResolveFilepath("Library/SpeakerWorker.js", import.meta.url), { workerData: result.audioData })
              workerThread.on("error", (err) => { console.error(err) });
              workerThread.on("exit", (code) => { if (code !== 0) { console.error(`Worker stopped with exit code ${code}`); } });
              workerThread.on("message", (msg) => {
                Log.Log("VoiceManager", msg);
                process.exit(0);
              });
              weakSelf.workers.push(workerThread);
            } else if (config.Get("AudioPlaybackStrategy") === "fork") {
              // The default is to use a completely separate process, forked from the main process, that is cancelled when the audio is done playing or new audio is requested
              var forkedProcess = fork("Library/SpeakerFork.js", [audioFile], { cwd: process.cwd() });
              forkedProcess.send("started");
              forkedProcess.on("message", function (message) {
                Log.Log("VoiceManager", `Message from child.js: ${message}`);
              });
              forkedProcess.on('exit', function (code, signal) {
                Log.Log("VoiceManager", `child process exited with code ${code} and signal ${signal}`);
              });
              weakSelf.forks.push(forkedProcess);
            }
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
