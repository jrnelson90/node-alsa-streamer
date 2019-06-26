// Import node modules.
const processSpawn = require(`child_process`).spawn;

// Local private variables.
let childProcess;

class Arecord extends require(`events`).EventEmitter {
	/**
	 * Constructor of Arecord class.
	 * @param {Object} options Object with optional options variables
	 * @param {Object} logger Object with log, warn, and error functions
	 * @returns this
	 */
	constructor(options = {}, logger) {
		super();

		this.options = Object.assign({
			device: null,				// Recording device to use.
			channels: 2,				// Channel count.
			format: `S16_LE`,			// Format type.
			rate: 48000,				// Sample rate.
			type: `wav`,				// File type.
		}, options);

		this.logger = logger;

		this.command = {
			arguments: [
				// Show no progress
				`-q`,
				// Channel count
				`-c`, this.options.channels.toString(),
				// Sample rate
				`-r`, this.options.rate.toString(),
				// Output File type
				`-t`, this.options.type,
				// Input Format type
				`-f`, this.options.format
			],
			options: {
				encoding: `binary`
			}
		};

		if (this.options.device) {
			this.command.arguments.unshift(`-D`, this.options.device);
		}

		if (this.logger) {
			// Log command.
			this.logger.log(`node-arecord: Command 'arecord ${this.command.arguments.join(` `)}'`);
		}

		return this;
	}
	/**
	 * Creates and starts the audio recording process.
	 * @returns this
	 */
	start() {
		if (childProcess) {
			if (this.logger) {
				this.logger.warn(`node-arecord: Process already active, killed old one started new process.`);
			}
			childProcess.kill();
		}

		// Create new child process and give the recording commands.
		childProcess = processSpawn("arecord", this.command.arguments, this.command.options);

		// Store this in `self` so it can be accessed in the callback.
		let self = this;
		childProcess.on(`close`, function(exitCode) {
			if (self.logger) {
				self.logger.log(`node-arecord: Exit code '${exitCode}'.`);
			}
			self.emit(`close`, exitCode);
		});

		if (this.logger) {
			this.logger.log(`node-arecord: Started recording.`);
		}

		return this;
	}
	/**
	 * Stops and removes the audio recording process.
	 * @returns this
	 */
	stop() {
		if (!childProcess) {
			if (this.logger) {
				this.logger.warn(`node-arecord: Unable to stop recording, no process active.`);
			}
			return this;
		}

		childProcess.kill();
		childProcess = null;

		if (this.logger) {
			this.logger.log(`node-arecord: Stopped recording.`);
		}

		return this;
	}
	/**
	 * Get the audio stream of the recording process.
	 * @returns The stream.
	 */
	stream() {
		if (!childProcess) {
			if (this.logger) {
				this.logger.warn(`node-arecord: Unable to retrieve stream, because no process not active. Call the start or resume function first.`);
			}
			return null;
		}

		return childProcess.stdout;
	}
}

module.exports = Arecord;
