const { MongoClient, ServerApiVersion } = require("mongodb");
require('dotenv').config(); // Load environment variables from .env file

const uri = process.env.ATLAS_URI || "mongodb+srv://mayahxd:Eusoucagada65@cluster0.ts37otw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

let _db;

module.exports = {
	connectToServer: function (callback) {
		console.log("Attempting to connect to MongoDB");

		const client = new MongoClient(uri);

		async function run() {
			try {
				// Connect the client to the server
				await client.connect();

				// Send a ping to confirm a successful connection
				await client.db("admin").command({ ping: 1 });
				console.log("Pinged your deployment. You successfully connected to MongoDB!");

				// Specify the database to use
				_db = client.db("bank_users");
				console.log("Connected to the bank_users database");

				// Execute the callback after a successful connection
				if (callback) callback();
			} catch (err) {
				console.error("Failed to connect to MongoDB", err);
				if (callback) callback(err); // Pass the error to the callback
			}
		}

		run().catch(console.dir);
	},

	getDb: function () {
		return _db; // Return the database connection
	},
};
