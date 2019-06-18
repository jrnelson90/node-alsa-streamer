const cardInfo = require('node-alsa-cardinfo');
const Arecord = require('node-arecord');
const ffmpeg = require('fluent-ffmpeg');

const cardName = "hw:CARD=audioinjectorpi,DEV=0";
const playInfo = cardInfo.get(cardName, cardInfo.PLAYBACK);
const recInfo = cardInfo.get(cardName, cardInfo.CAPTURE);

// console.log("Audio Injector Playback Info:");
// console.log(playInfo);
// console.log("Audio Injector Capture Info:");
// console.log(recInfo);

// Options is an optional parameter for the constructor call.
// If an option is not given the default value, as seen below, will be used.
const options = {
  program: `arecord`, // Which program to use, either `arecord`, `rec`, or `sox`.
  device: cardName,       // Recording device to use.
  channels: 2,        // Channel count.
  format: recInfo.sampleFormats[2],   // Encoding type. (only for `arecord`)
  rate: recInfo.sampleRates[3],        // Sample rate.
  type: `wav`,        // Format type.
};

// Optional parameter intended for debugging.
// The object has to implement a log and warn function.
const logger = console;

// Create an instance.
let audioIn = new Arecord(options, logger);

ffmpeg(audioIn.start().stream())
  .inputFormat("wav")
  .outputOptions([
    "-acodec flac",
    "-compression_level 0",
    "-frame_size 4096",
    "-sample_fmt s32",
    "-ac 2",
    "-ar 48000",
    "-f ogg",
    "-content_type audio/ogg",
  ])
  .output("icecast://source:dietpi@localhost:9240/vinyl" )
  .run();

process.on("SIGINT", () => {
  audioIn.stop();
  process.exit(0);
});

console.log("Streaming live FLAC audio to icecast radio");
