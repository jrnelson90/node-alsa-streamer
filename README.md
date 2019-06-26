# node-alsa-streamer
Basic ALSA to FLAC streamer for Icecast, written in Node.js

Although originally developed to stream an analog source, like a turntable or cassette player, 
via an ADC audio hat on a Raspberry Pi over a local home or office network, this can be used 
for any mono or stereo analog source on any Linux machine that supports ALSA and Icecast.

To date, this has been tested using following Pi audio hats:
* AudioInjector Stereo (Pi 2 & 3)
* Fe-Pi Audio (Pi 2 & 3)
* PiSound (Pi 3)
