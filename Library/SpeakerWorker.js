import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

import Speaker from "speaker";
import { Readable } from 'stream';

import { Configuration } from "./Configuration.js";
const config = new Configuration();

if (workerData) {
  Readable.from(Buffer.from(workerData)).pipe(new Speaker({ channels: config.Get("channels"), sampleRate: config.Get("sampleRate"), bitDepth: config.Get("bitDepth") }));
}

