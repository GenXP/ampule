"use strict";
import { ResultReason, SpeechSynthesizer, SpeechConfig, AudioConfig } from "microsoft-cognitiveservices-speech-sdk";
import { PassThrough } from "stream";
import { Configuration } from "./Configuration.js";
import Speaker from "speaker";

const config = new Configuration();

export class VoiceManager {
  player = null;

  constructor(player) {
    this.player = player;
  }

  async Speak(text) {
    var audioFile = "tmp-audio.wav";
    var speechKey = config.Get("key");
    var speechRegion = config.Get("region");
    var voicetype = config.Get("voice");
    const speechConfig = SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisVoiceName = voicetype;
    const audioConfig = AudioConfig.fromAudioFileOutput(audioFile);
    let synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
    let weakSelf = this;

    return new Promise(function (resolve, reject) {

      const ssml = `<speak version='1.0' xml:lang='en-US' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts'> \r\n \
            <voice name='${speechConfig.speechSynthesisVoiceName}'> \r\n \
                <mstts:viseme type='redlips_front'/> \r\n \
                ${text} \r\n \
            </voice> \r\n \
        </speak>`;
      let visemes = [];

      synthesizer.visemeReceived = (s, e) => {
        if (config.Log > 1) {
          console.log("(Viseme), Audio offset: " + e.audioOffset / 10000 + "ms. Viseme ID: " + e.visemeId);
          visemes.push({ offset: e.audioOffset, id: e.visemeId });
        }
      };

      synthesizer.speakSsmlAsync(ssml,
        async function (result) {
          if (result.reason === ResultReason.SynthesizingAudioCompleted) {
            let player = new Speaker({ channels: config.Get("channels"), sampleRate: config.Get("sampleRate"), bitDepth: config.Get("bitDepth") });
            const bufferStream = new PassThrough();
            bufferStream.end(Buffer.from(result.audioData));
            bufferStream.pipe(player);
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
