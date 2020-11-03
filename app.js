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

console.log("[+] Building Schemes...")
var listingScheme = new mongoose.Schema({
	title: String,
	desc: String,
	fullDesc: String,
	img: String,
	price: Number,
	lister: String,
	user_id: String
});

var userSchema = new mongoose.Schema({
	username: String,
	password: String
});
//Add more stuff to userSchema
userSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User", userSchema);
var Listing = mongoose.model("Listing", listingScheme);

console.log("[+] Setting up Params...")
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
//mongoose.connect("mongodb://localhost/users");
//nothing sensitve here so if you gonna hack it don't expect much lamo
mongoose.connect("mongodb+srv://dbUser:ziPL293Yvm3abqlp@mongocluster.g0nig.mongodb.net/<dbname>?retryWrites=true&w=majority");

app.listen(process.env.PORT || "3000", process.env.IP, function(){
	console.log("[+] PORT BOUND");	
});


function checkOwnership(req, res, next){
	var id = req.params.id;
	var user = req.user;
	console.log("Checking Ownership");
	
	if (req.isAuthenticated()){
		Listing.findById(id, function(err, listing){
			if (err){
				console.log(err);
				res.redirect("back");
			}
			else{
				if (listing.user_id == user._id){
					next();
				}
				else{
					res.redirect("back");
				}
			}
		})
	}
	else{
		res.redirect("back");
	}
	
}

function debugDB(err, done){
	if (err){
		console.log("Failed to create entry in DB");
		console.log(err);
	}
	else{
		console.log("Entry succesfully added to DB");
	}
}

app.get("/", function(req, res){
	//Check passport
	var authed = req.isAuthenticated();
	var errText = "";
	//Get listings
	Listing.find({}, function(err, data){
		if (err){
			errText = "Could not load listings";
			console.log(err);
			res.render("home.ejs", {authed: authed, errorText: errText, listings: data});
		}
		else{
			res.render("home.ejs", {authed: authed, errorText: errText, listings: data});
		}
	})
});

app.get("/profile", function(req, res){
	//Check passport
	if (req.isAuthenticated() === false){
		return res.redirect("/login");
	}
	
	console.log(req.user);
	
	res.render("profile.ejs", {username: req.user.username, authed: true});
});

app.get("/logout", function(req,res){
	var errText = "";
	req.logout();
	//Check passport
	var authed = req.isAuthenticated();
	Listing.find({}, function(err, data){
		if (err){
			errText = "Could not load listings";
			console.log(err);
			res.render("home.ejs", {authed: authed, errorText: errText, listings: data});
		}
		else{
			res.render("home.ejs", {authed: authed, errorText: errText, listings: data});
		}
	})
});

app.get("/login", function(req,res){
	res.render("login.ejs", {errorText: ""});
});

app.get("/register", function(req,res){
	res.render("register.ejs", {errorText: ""});
});

app.post("/register", function(req,res){
	console.log(req.body);
	var _username = req.body.username;
	var _password = req.body.password;
	
	User.register(new User({username: _username}), _password, function(err, user){
		if (err){
			//Failed
			console.log("Error: " + err);
			return res.render("register.ejs", {errorText: err});
		}
		else{
			passport.authenticate("local")(req, res, function(){
				//Redirect user
				res.redirect("/")
			})
		}
	})
});

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { 
		console.log("ERROR: " + err);
		return res.render('login.ejs', {errorText: "Interal Server Error"}); 
	}
    if (!user) { 
		console.log("ERROR: user is null");
		return res.render('login.ejs', {errorText: "Username/Password doesn't exist"}); 
	}
    req.logIn(user, function(err) {
      if (err) { 
		  console.log("ERROR2: " + err);
		  return res.render('login.ejs', {errorText: "Interal Server Error"}); 
	  }
	console.log('Loggedin');
    return res.redirect('/profile');
    });
  })(req, res, next);
});

app.get("/newListing", function(req,res){
	//Check passport
	if (req.isAuthenticated() === false){
		return res.redirect("/login");
	}
	
	res.render("newListing.ejs", {username: req.user.username, authed: true});
});

app.post("/newListing", function(req,res){
	//Check passport
	if (req.isAuthenticated() === false){
		return res.redirect("/login");
	}
	
	//Construct Lisiting
	var tmpListing = new Listing({
		title: req.body.title,
		desc: req.body.desc,
		fullDesc: req.body.fullDesc,
		img: req.body.img,
		price: req.body.price,
		lister: req.user.username,
		user_id: req.user._id
	})
	
	//Save onto db
	tmpListing.save(debugDB);
	
	res.redirect("/");
});

app.get("/listing/:id", function(req,res){
	
	var isOwner = false;
	var requestID = "";
	//Check if owner
	if (req.isAuthenticated()){
		requestID = req.user._id;
	}
	
	console.log(req.params);
	
	Listing.findById(req.params.id, function(err, listing){
		if (err){
			console.log(err);
			res.redirect("back");
		}
		else{
			console.log("Found!");
			//Check if owner
			if (req.isAuthenticated()){
				isOwner = (listing.user_id == req.user._id);
				res.render("listing.ejs", {owner: isOwner, listing: listing, authed: true});
			}
			else{
				res.render("listing.ejs", {owner: false, listing: listing, authed: false});
			}
		}
	})
});

app.get("/listing/:id/edit", checkOwnership, function(req, res){
	//Get reference to listing
	Listing.findById(req.params.id, function(err, tmpListing){
			if (err){
				console.log(err);
				res.redirect("back");
			}
			else{
				//Authed and own the listing
				res.render("edit.ejs", {authed: true, username:req.user.username, listing: tmpListing});
			}
	})
});

app.put("/listing/:id", checkOwnership, function(req, res){
	//Get reference to listing
	Listing.findByIdAndUpdate(req.params.id, req.body.listing, function(err, tmpListing){
			if (err){
				console.log(err);
				res.redirect("back");
			}
			else{
				//Authed and own the listing
				res.redirect("/");
			}
	})
})

app.delete("/listing/:id", checkOwnership, function(req, res){
	//Get reference to listing
	Listing.findByIdAndRemove(req.params.id, function(err){
			if (err){
				console.log(err);
				res.redirect("/");
			}
			else{
				//Authed and own the listing
				res.redirect("/");
			}
	})
})

function main(){
	console.log("[+] Ready.");
}

main();