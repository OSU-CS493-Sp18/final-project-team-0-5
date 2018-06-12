use users;

console.log("INITIALIZING MONGODB");

db.createUser({
	user: "user",
	pwd: "pass",
	roles: [ { role: "readWrite", db: "users" } ]
});

db.createCollection('users');

db.users.insertOne({
	userID: "user1",
	name: "default",
	email: "default@fake.com",
	password: "pwd",
	businesses: [],
	reviews: [],
	photos: []
});	