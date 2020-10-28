//GLOBALS
console.log("[+] Server is starting...")
var mongoose = require("mongoose");
var express = require("express");
var parser = require("body-parser");
var session = require("express-session");
var passport = require("passport");
var passportLocal = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var methodOverride = require("method-override");
var app = express();

var friendBook = ["Vaughan", "Harry"];

//Schemas
var catsSchema = mongoose.Schema({
	name: String,
	age: Number,
	isCatGirl: Boolean
});
var Cat = mongoose.model("Cat", catsSchema);
var userSchema = new mongoose.Schema({
	username: String,
	password: String
});
//Add more stuff to userSchema
userSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User", userSchema);

console.log("[+] Setting up params...")
//Set static so we don't have to type /public all the time
app.use(express.static("public"));
app.use(parser.urlencoded({extended: true}));
app.use(require("express-session")({secret: 'Ygt2a2YLYSK7PCjg', resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

passport.use(new passportLocal(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

console.log("[+] Connecting To Database...")
mongoose.connect("mongodb://localhost/users");

function isLoggedIn(req, res, next){
	if (req.isAuthenticated()){
		return next();
	}
	
	res.redirect("/authTest");
}

function checkOwnership(req, res, next){
	if (req.isAuthenticated()){
		Cat.findById(req.params.id, function(err, cat){
			if (err){
				res.redirect("back");
			}
			else{
				if (cat.author.id.equals(req.user.id)){
					next();
				}
				else
					res.redirect("back");
				}
			}
		})
	}
	
	res.redirect("back");
}


app.listen(process.env.port || "3000", process.env.ip, function(){
	console.log("[+] PORT BOUND");	
});


app.get("/", function(req, res){
	//res.send("Done.");
	res.render("landing.ejs");
});

app.get("/debug/:data", function(req, res){
	var data = req.params.data;
	res.render("data.ejs", {data: data});
});

app.get("/posts", function(req, res){
	var data = [
		{title: "title1", author: "Anon1"},
		{title: "title2", author: "Anon2"},
		{title: "title3", author: "Anon3"},
		{title: "title4", author: "Anon4"},
	];
	res.render("posts.ejs", {posts: data});
});

app.get("/cats", isLoggedIn, function(req, res){
	
	Cat.find({}, function(err, data){
		if (err){
			console.log("Databse error :S")
		}
		else{
			res.render("cats.ejs", {cats: data});
		}
	})
});

app.post("/cats", isLoggedIn, function(req, res){
	
	console.log(req.body);
	
	var isGirl = false;
	isGirl = (req.body.catGirl == 'on');
	
	createNewCat(req.body.catName, req.body.catAge, isGirl);
	
	res.redirect("/cats");
});
app.get("/cats/:id/edit", checkOwnership,function(req, res){
	
	Cat.findById(req.params.id, function(err, cat){
		res.render("edit.ejs", {cat: cat})
  	});
	
	res.render("authTest.ejs");
});


app.get("/friends", function(req, res){
	res.render("friends.ejs", {friends: friendBook});
});

app.post("/friends", function(req, res){
	//console.log(req);
	console.log(req.body);
	
	friendBook.push(req.body.friend);
	
	res.redirect("/friends");
});

app.get("/login", function(req,res){
	res.render("login.ejs");
})

app.post("/login", passport.authenticate("local", {
		successRedirect: "/cats",
		failureRedirect: "/login"
	}), function(req, res){
	
	console.log("login got post");
	
});

app.post("/signUp", function(req, res){
	var username = req.body.username;
	var password = req.body.password;
	
	console.log(req.body);
	
	User.register(new User({username: username}), password, function(err, user){
		if (err){
			console.log(err);
			return res.render("signUp.ejs");
		}
		else{
			passport.authenticate("local")(req, res, function(){
				res.redirect("/cats");
			})
		}
	})
});

app.get("/signUp", function(req, res){
	res.render("signUp.ejs");
});

app.get("/logout", function(req, res){
	req.logout();
	res.redirect("/");
});

app.get("/authTest", function(req, res){
	res.render("authTest.ejs");
});

function createNewCat(_name, _age, _isCatGirl){
	var obj = new Cat({
		name:_name,
		age:_age,
		isCatGirl:_isCatGirl
	})
	
	obj.save(errCallBack);
	
	return obj;
}

function errCallBack(err, done){
	if (err){
		console.log("info not found")
	}
	else{
		console.log("info saved!")
	}
}

function main(){
	console.log("[+] Ready.");
	
	//Add onto db
	//createNewCat("Koneko", 15, true);
}

main();