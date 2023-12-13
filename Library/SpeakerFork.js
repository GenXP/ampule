"use strict";
import Speaker from "speaker";
import { createReadStream } from "fs";
import { Reader } from "wav"


if (process.argv[2]) {
    process.stdin.on('close', () => {
        process.exit();
    });
    process.on("message", function (message) {
        console.log("message from main : " + message);
        process.send("message pingback from child " + message)
    })
    var filename = process.argv[2];
    process.send(filename);
    var file = createReadStream(filename);
    var reader = new Reader();
    reader.on('format', function (format) {
        reader.pipe(new Speaker(format));
    });
    file.pipe(reader);
}
