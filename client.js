const util = require("util");
const readline = require("readline");
const { JSDOM } = require("jsdom");
const { ChatManager, TokenProvider } = require("@pusher/chatkit-client");
const axios = require("axios");
const prompt = require("prompt");
const ora = require("ora");

const makeChatkitNodeCompatible = () => {
	const { window } = new JSDOM();
	global.window = window;
	global.navigator = {};
};

makeChatkitNodeCompatible();

const authenticate = async username => {
	try {
		await axios.post("http://localhost:3333/users", { username });
	} catch ({ message }) {
		throw new Error(`Failed to authenticate, ${message}/ Echec d'authentification, merde ${message}`);
	}
};

const main = async () => {
	const spinner = ora();
	try {
		prompt.start();
		prompt.message = "";

		const get = util.promisify(prompt.get);

		const usernameSchema = [
			{
				description: "Enter your username/Choisis un username",
				name: "username",
				type: "string",
				pattern: /^[a-zA-Z0-9\-]+$/,
				message: "Username must be only letters, numbers, or dashes/Ton username doit contenir que des lettres, numeros ou - ",
				required: true
			}
		];

		const { username } = await get(usernameSchema);

		try {
			spinner.start("Authenticating..");
			await authenticate(username);
			spinner.succeed(`Authenticated as ${username}`);
		} catch (err) {
			spinner.fail();
			throw err;
		}

		const chatManager = new ChatManager({
			instanceLocator: "v1:us1:7b64113c-8463-4175-af87-d4380d274ec6",
			userId: username,
			tokenProvider: new TokenProvider({
				url: "http://localhost:3333/authenticate"
			})
		});

		spinner.start("Connecting to Pusher../Connection à Pusher..");
		const currentUser = await chatManager.connect();
		spinner.succeed("Connected");

		spinner.start("Fetching rooms../Recherche de Room en cours..");
		const joinableRooms = await currentUser.getJoinableRooms();
		spinner.succeed("Fetched rooms/Room ");

		const availableRooms = [...currentUser.rooms, ...joinableRooms];

		if (!availableRooms)
			throw new Error(
				"Couldn't find any available rooms. call the developer AmYou he will tell you what to do ^^ "
			);

		console.log("Available rooms:");
		availableRooms.forEach((room, index) => {
			console.log(`${index} - ${room.name}`);
		});

		const roomSchema = [
			{
				description: "Select a room",
				name: "room",
				type: "number",
				cast: "integer",
				pattern: /^[0-9]+$/,
				conform: verif => {
					if (verif >= availableRooms.length) {
						return false;
					}
					return true;
				},
				message: "Room must only be numbers/Pour selectionner une Room seul le numéro de celle-ci est accepter",
				required: true
			}
		];

		const { room: chosenRoom } = await get(roomSchema);
		const room = availableRooms[chosenRoom];

		spinner.start(`Joining room/Est-en train de rejoindre la room ${chosenRoom}..`);

		await currentUser.subscribeToRoomMultipart({
			roomId: room.id,
			hooks: {
				onMessage: message => {
					const { sender, parts } = message;
					if (sender.id === username) {
						return
					}
					console.log(`${sender.id}: ${parts[0].payload.content}`)
				}
			},
			messageLimit:0

		});
		spinner.succeed(`Joined/A rejoins ${room.name}`);
		console.log(
			"Communication Start hit<Enter>."
		);

		const input = readline.createInterface({ input: process.stdin }); /*stdin, stdout and stderr pas que ds Node child parent heritage etc... ^^ cf fiches*/

		input.on("line", async text => {
			await currentUser.sendSimpleMessage({ roomId: room.id, text });
		});
	} catch (error) {
		spinner.fail();
		console.log(error);
		process.exit(1);
	}
};

main();