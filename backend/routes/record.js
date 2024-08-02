const express = require("express");
const recordRouter = express.Router();
const dbo = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;

// Create a new record
recordRouter.route("/record/add").post(async (req, res) => {
	try {
		let db_connect = dbo.getDb();
		if (!db_connect) {
			return res.status(500).send("Database connection not established");
		}

		const { firstName, lastName, email, phoneNumber, password } = req.body;

		// Check if all required fields are present
		if (!firstName || !lastName || !email || !phoneNumber || !password) {
			return res.status(400).send("All fields are required");
		}

		// Check if the email already exists
		let userExists = await db_connect
			.collection("users")
			.findOne({ email });
		if (userExists) {
			return res.status(400).send("User with this email already exists");
		}

		let newUser = {
			firstName,
			lastName,
			email,
			phoneNumber,
			password,
			role: "",
			checking: 0,
			savings: 0,
		};
		let result = await db_connect.collection("users").insertOne(newUser);

		// Set session information
		if (req.session) {
			req.session.userId = result.insertedId.toString();
			req.session.email = email;
			req.session.firstName = firstName;
			req.session.lastName = lastName;
			req.session.phoneNumber = phoneNumber;

			res.status(200).json({
				message: `User created with email: ${email}`,
				sessionId: req.sessionID,
				userId: result.insertedId,
				status: "Session set",
			});
		} else {
			res.status(500).send("Session is not available");
		}
	} catch (err) {
		console.log(err);
		res.status(500).send("Error creating a new user");
	}
});


recordRouter.route("/balance").get(async (req, res) => {
	if (req.session && req.session.userId) {
		try {
			let db_connect = dbo.getDb();
			if (!db_connect) {
				return res.status(500).send("Database connection not established");
			}

			const user = await db_connect
				.collection("users")
				.findOne({ _id: new ObjectId(req.session.userId) });

			if (user) {
				res.status(200).json({
					checking: user.checking,
					savings: user.savings,
				});
			} else {
				res.status(404).send("User not found");
			}
		} catch (err) {
			console.log(err);
			res.status(500).send("Error fetching user balance");
		}
	} else {
		res.status(401).send("Unauthorized: No session available");
	}
});


recordRouter.route("/logout").post((req, res) => {
	if (req.session) {
		req.session.destroy(err => {
			if (err) {
				return res.status(500).send("Logout failed");
			} else {
				return res.status(200).send("Logged out successfully");
			}
		});
	} else {
		return res.status(200).send("No session to destroy");
	}
});


  recordRouter.route("/record/login").post(async (req, res) => {
	try {
	  let db_connect = dbo.getDb();
	  if (!db_connect) {
		return res.status(500).send("Database connection not established");
	  }
  
	  const { email, password } = req.body;
	  const bank_user = await db_connect
		.collection("users")
		.findOne({ email, password });
	  console.log(bank_user);
  
	  if (bank_user) {
		if (req.session) {
		  req.session.userId = bank_user._id.toString();
		  req.session.email = email;
		  req.session.firstName = bank_user.firstName;
		  req.session.lastName = bank_user.lastName;
	      req.session.phoneNumber = bank_user.phoneNumber;
  
		  console.log(req.session.userId);
  
		  let status = req.session.userId ? "Session set" : "Session not set";
  
		  res.status(200).json({
			message: `Successfully logged in as ${email}`,
			sessionId: req.sessionID,
			userId: bank_user._id,
			status: status,
		  });
		} else {
		  res.status(500).send("Session is not available");
		}
	  } else {
		res.status(404).send("User not found");
	  }
	} catch (err) {
	  console.log(err);
	  res.status(500).send("Error logging in user");
	}
  });
// Get all records
recordRouter.route("/record").get(async (req, res) => {
	try {
		let db_connect = dbo.getDb();
		if (!db_connect) {
			return res.status(500).send("Database connection not established");
		}

		let result = await db_connect
			.collection("users")
			.find({}, { projection: { password: 0 } })
			.toArray();
		res.status(200).send(result);
	} catch (err) {
		console.log(err);
		res.status(500).send("Error acquiring list of users");
	}
});

// Get a single record by email address
recordRouter.route("/record/:email").get(async (req, res) => {
	try {
		let db_connect = dbo.getDb();
		if (!db_connect) {
			return res.status(500).send("Database connection not established");
		}

		let email = req.params.email;

		let result = await db_connect
			.collection("users")
			.findOne({ email }, { projection: { password: 0 } });
		if (result) {
			res.status(200).send(result);
		} else {
			res.status(404).send("User not found");
		}
	} catch (err) {
		console.log(err);
		res.status(500).send("Error acquiring user by email");
	}
});

// Update a record by email address
recordRouter.route("/update/updateRole").post(async (req, res) => {
	try {
		let db_connect = dbo.getDb();
		let myquery = { email: req.body.email };
		let newvalues = {
			$set: {
				role: req.body.role,
			},
		};
		let result = await db_connect
			.collection("users")
			.updateOne(myquery, newvalues);
		if (result.modifiedCount > 0) {
			res.status(200).send("User role updated successfully");
		} else {
			res.status(500).send("User role update failed");
		}
	} catch (err) {
		console.log(err);
		res.status(500).send("Error updating user by email");
	}
});

recordRouter.route("/account_summary").get((req, res) => {
	console.log(req.session)
	if (req.session && req.session.userId) {
	  res.status(200).json({
		firstName: req.session.firstName,
		lastName: req.session.lastName,
		email: req.session.email,
		phoneNumber: req.session.phoneNumber,
	  });
	} else {
	  res.status(401).send("Unauthorized: No session available");
	}
  });
  

  recordRouter.route("/update/deposit").post(async (req, res) => {
	try {
		let db_connect = dbo.getDb();

		if (!req.session || !req.session.email) {
			return res.status(401).send("Unauthorized: No session available");
		}

		let email = req.session.email;
		let amount = req.body.amount;
		let account_type = req.body.account_type;


		let findUser = await db_connect.collection("users").findOne({ email });

		if (!findUser) {
			return res.status(404).send("User not found");
		}

		let newDeposit;
		if (account_type !== "checking" && account_type !== "savings") {
			return res.status(400).send("Invalid account type");
		} else if (account_type === "checking") {
			newDeposit = {
				$set: {
					checking: (findUser.checking * 100 + amount * 100) / 100,
				},
			};
		} else if (account_type === "savings") {
			newDeposit = {
				$set: {
					savings: (findUser.savings * 100 + amount * 100) / 100,
				},
			};
		}
		let result = await db_connect
			.collection("users")
			.updateOne({ email }, newDeposit);
		if (result.modifiedCount > 0) {
			res.status(200).send({ message: `Deposit of ${amount} successful` });
		} else {
			res.status(400).send("Deposit failed");
		}
	} catch (err) {
		console.log(err);
		res.status(500).send("Error depositing money");
	}
});



// Transfer money from one account to another
recordRouter.route("/update/transfer").post(async (req, res) => {
	try {
		let db_connect = dbo.getDb();

		if (!req.session || !req.session.email) {
			console.log("Unauthorized: No session available");
			return res.status(401).send("Unauthorized: No session available");
		}

		let email = req.session.email;
		let amount = parseFloat(req.body.amount); // Ensure the amount is parsed as a number
		let from_account_type = req.body.from_account_type;
		let to_account_type = req.body.to_account_type;

		if (isNaN(amount) || amount <= 0) {
			console.log("Invalid amount");
			return res.status(400).send("Invalid amount");
		}

		let findUser = await db_connect.collection("users").findOne({ email });

		if (!findUser) {
			console.log("User not found");
			return res.status(404).send("User not found");
		}

		let updateQuery;
		if (
			(from_account_type === "checking" && to_account_type === "savings") ||
			(from_account_type === "savings" && to_account_type === "checking")
		) {
			if (from_account_type === "checking" && findUser.checking < amount) {
				console.log("Insufficient funds in checking account");
				return res.status(400).send("Insufficient funds in checking account");
			} else if (from_account_type === "savings" && findUser.savings < amount) {
				console.log("Insufficient funds in savings account");
				return res.status(400).send("Insufficient funds in savings account");
			}

			updateQuery = {
				$inc: {
					[from_account_type]: -amount,
					[to_account_type]: amount,
				},
			};
		} else {
			console.log("Invalid account types for transfer");
			return res.status(400).send("Invalid account types for transfer");
		}

		let result = await db_connect.collection("users").updateOne({ email }, updateQuery);
		if (result.modifiedCount > 0) {
			res.status(200).send({ message: "Transfer successful" });
		} else {
			console.log("Transfer failed");
			res.status(400).send({ message: "Transfer failed" });
		}
	} catch (err) {
		console.log(err);
		res.status(500).send("Error transferring money");
	}
});

// Withdraw money into a user's account
recordRouter.route("/update/withdraw").post(async (req, res) => {
	try {
		let db_connect = dbo.getDb();

		if (!req.session || !req.session.email) {
			console.log("Unauthorized: No session available");
			return res.status(401).send("Unauthorized: No session available");
		}

		let email = req.session.email;
		let amount = parseFloat(req.body.amount); // Ensure the amount is parsed as a number
		let account_type = req.body.account_type;

		if (isNaN(amount) || amount <= 0) {
			console.log("Invalid amount");
			return res.status(400).send("Invalid amount");
		}

		let findUser = await db_connect.collection("users").findOne({ email });

		if (!findUser) {
			console.log("User not found");
			return res.status(404).send("User not found");
		}

		let newWithdrawal;
		if (account_type !== "checking" && account_type !== "savings") {
			console.log("Invalid account type");
			return res.status(400).send("Invalid account type");
		} else if (account_type === "checking") {
			if (amount > findUser.checking) {
				console.log("Insufficient funds");
				return res.status(400).send("Insufficient funds");
			} else {
				newWithdrawal = {
					$set: {
						checking: (findUser.checking * 100 - amount * 100) / 100,
					},
				};
			}
		} else if (account_type === "savings") {
			if (amount > findUser.savings) {
				console.log("Insufficient funds");
				return res.status(400).send("Insufficient funds");
			} else {
				newWithdrawal = {
					$set: {
						savings: (findUser.savings * 100 - amount * 100) / 100,
					},
				};
			}
		}
		let result = await db_connect.collection("users").updateOne({ email }, newWithdrawal);
		if (result.modifiedCount > 0) {
			res.status(200).send({ message: "Withdraw successful" });
		} else {
			console.log("Withdraw failed");
			res.status(400).send({ message: "Withdraw failed" });
		}
	} catch (err) {
		console.log(err);
		res.status(500).send("Error withdrawing money");
	}
});

// Delete a record by email address
recordRouter.route("/record/delete/:email").delete(async (req, res) => {
    try {
        let db_connect = dbo.getDb();
        if (!db_connect) {
            return res.status(500).send("Database connection not established");
        }

        let email = req.params.email;

        // Find and delete the user by email
        let result = await db_connect.collection("users").deleteOne({ email });

        if (result.deletedCount > 0) {
            res.status(200).send(`User with email ${email} successfully deleted`);
        } else {
            res.status(404).send("User not found");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Error deleting user");
    }
});

// Delete all users
recordRouter.route("/record/delete-all").delete(async (req, res) => {
    try {
        let db_connect = dbo.getDb();
        if (!db_connect) {
            return res.status(500).send("Database connection not established");
        }

        // Delete all documents in the 'users' collection
        let result = await db_connect.collection("users").deleteMany({});

        if (result.deletedCount > 0) {
            res.status(200).send(`Successfully deleted all users`);
        } else {
            res.status(404).send("No users found to delete");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Error deleting users");
    }
});



// Export the router
module.exports = recordRouter;
