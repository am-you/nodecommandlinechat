const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Chatkit = require('@pusher/chatkit-server');

const app = express();

const chatkit = new Chatkit.default({
	instanceLocator: 'v1:us1:7b64113c-8463-4175-af87-d4380d274ec6',
	key:
		'b5b2a5a1-8433-444d-a6be-4bc7937f1ab1:kj0ldZbFv77U7QlA9nptwKwvOQsGpCITuK39k4MUwi8='
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.post('/users', (req, res) => {
	const { username } = req.body;
	chatkit
		.createUser({
			id: username,
			name: username
		})
		.then(() => {
			console.log(`User created: ${username}`);
			res.sendStatus(201)
		})
		.catch(err => {
			if (err.error === 'services/chatkit/user_already_exists') {
				console.log(`User already exists: ${username}`);
				res.sendStatus(200)
			} else {
				res.status(err.status).json(err)
			}
		})
});

app.post('/authenticate', (req, res) => {
	const authData = chatkit.authenticate({ userId: req.query.user_id });
	res.status(authData.status).send(authData.body)
});

const port = 3333;
app.listen(port, err => {
	if (err) {
		console.log(err)
	} else {
		console.log(`AmYou Communication system Running on port ${port}`)
	}
});
