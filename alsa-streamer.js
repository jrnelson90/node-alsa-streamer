const cardInfo = require('node-alsa-cardinfo');
const Arecord = require('./lib/arecord');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const cp = require("child_process");
const readline = require('readline-sync');
const convert = require('xml-js');
const internalIp = require('internal-ip');

let config;

try {
  // If config.json file doesn't exits, run setup routine
  if (!fs.existsSync("./config.json")) {
    let hwInfo = Object.create(null);
    config = Object.create(null);

    console.info("No previous configuration detected, initiating setup");

    // Get an array of ALSA capture cards
    let soundCards = cp.execSync("arecord -L | grep :CARD")
        .toString('utf8').trim().split("\n");
    hwInfo["soundCards"] = soundCards;

    // Select Audio Card for Input
    console.info("Select an audio card to use as your input source (usually one starting with \'hw:\'):");
    soundCards.forEach((card, index) => console.info("\t" + index.toString() + " : " + card));

    let soundCardIndex = readline.question("Enter an option (0 - " + (soundCards.length -1) + "): ");
    config["soundCard"] = soundCards[soundCardIndex];

    // Find Capture Parameters for Selected Sound Card
    hwInfo["capture"] = cardInfo.get(config.soundCard, cardInfo.CAPTURE);

    // Select Sample Rate for Input
    console.info("Select sample rate for audio capture:");
    hwInfo.capture.sampleRates.forEach((rate, index) => console.info("\t" + index.toString() + " : " + rate));

    let sampleRateIndex = readline.question("Enter an option (0 - " + (hwInfo.capture.sampleRates.length -1) + "): ");
    config["sampleRate"] = hwInfo.capture.sampleRates[sampleRateIndex];

    // Sample Format for Input
    console.info("Select sample format for audio capture:");
    hwInfo.capture.sampleFormats.forEach((format, index) => console.info("\t" + index.toString() + " : " + format));

    let sampleFormatIndex = readline.question("Enter an option (0 - " + (hwInfo.capture.sampleFormats.length -1) + "): ");
    config["sampleArecordFmt"] = hwInfo.capture.sampleFormats[sampleFormatIndex];
    config["sampleFfmpegFmt"] = config.sampleArecordFmt.toString().split("_")[0].toLowerCase();

    // Channels for Input
    console.info("Select number of channels for audio capture:");
    config["channels"] = readline.question("Enter an option (1 - " + hwInfo.capture.channels[0] + "): ").toString();

    // Check for default icecast2 config file location
    if(fs.existsSync("/etc/icecast2/icecast.xml")) {
      const xml = cp.execSync("sudo cat /etc/icecast2/icecast.xml").toString('utf8');
      const icecastSettings = JSON.parse(convert.xml2json(xml,{compact: true, spaces: 2, textKey: "text"}));
      config["icecastPort"] = icecastSettings.icecast["listen-socket"].port.text;

      // If an existing mount point exists, copy its settings for mount address and password
      if(icecastSettings.icecast.mount) {
        config["icecastMnt"] = icecastSettings.icecast.mount["mount-name"].text;
        config["icecastPswd"] = icecastSettings.icecast.mount.password.text;
      } else {
        config["icecastMnt"] = '/vinyl';
        config["icecastPswd"] = icecastSettings.icecast.authentication["source-password"].text;
      }
    } else {
      // TODO : User Input for these values

      // Defaults
      config["icecastMnt"] = '/vinyl';
      config["icecastPswd"] = 'hackme';
      config["icecastPort"] = '9240';
    }

    // Write remaining config values to JSON
    config["pipeAudioCodec"] = 'wav';
    config["streamAudioCodec"] = 'flac';
    config["streamContainer"] = 'ogg';

    // Write configs JSON to file
    fs.writeFileSync("./hwInfo.json", JSON.stringify(hwInfo, null, 2));
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
  } else {
    config = require("./config.json");
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}

// If an option is not given, the default value will be used.
const arecordOptions = {
  device: config.soundCard,           // Recording device to use.
  channels: config.channels,          // Channel count.
  format: config.sampleArecordFmt,    // Encoding type. (only for `arecord`)
  rate: config.sampleRate,            // Sample rate.
  type: config.pipeAudioCodec,        // Format type.
};

// Create an new Arecord instance to capture input audio.
let audioIn = new Arecord(arecordOptions, console);

// Encode uncompressed audio and send it to icecast server via FFMPEG
ffmpeg(audioIn.start().stream())
    .inputFormat(config.pipeAudioCodec)
    .outputOptions([
      "-acodec " + config.streamAudioCodec,
      "-compression_level 0",
      "-frame_size 4096",
      "-sample_fmt " + config.sampleFfmpegFmt,
      "-ac " + config.channels,
      "-ar " + config.sampleRate,
      "-f " + config.streamContainer,
      "-content_type audio/" + config.streamContainer,
    ])
    .output(`icecast://source:${config.icecastPswd}@localhost:${config.icecastPort}${config.icecastMnt}`)
    .run();

// Capture ^C to exit properly
process.on("SIGINT", () => {
  console.log("");
  audioIn.stop();
  process.exit(0);
});

// Output current streaming address for other devices on the local network
console.log(`Streaming live FLAC audio to icecast radio at ` +
    `http://${internalIp.v4.sync()}:${config.icecastPort}${config.icecastMnt}`);
