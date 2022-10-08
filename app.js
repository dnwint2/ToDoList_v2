//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//connect to mongoose db (create if dne)
mongoose
  .connect(
    "mongodb+srv://dnwint2:66UQtkHUHEfJdr.@cluster0.iegpich.mongodb.net/?retryWrites=true@w=majority"
    // "mongodb://localhost:27017/todolistDB"
    // 66UQtkHUHEfJdr.
    // mongodb+srv://dnwint2:<password>@cluster0.iegpich.mongodb.net/?retryWrites=true&w=majority
  )
  .then(function() {
    console.log("Successfully connected to Mongodb Atlas DB.");
  })
  .catch(function(error) {
    console.log("Failed to connect to Mongodb Atlas DB.");
    console.log(error);
  }); //?retryWrites=true&w=majority
//mongodb+srv://dnwint2:<password>@cluster0.iegpich.mongodb.net/?retryWrites=true&w=majority

// create items collection
const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

// default items array
// --make items
const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});
// -- add to array
const defaultItems = [item1, item2, item3];

// create lists collection

const listSchema = mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);

//routing stuff

// get page (home route)
app.get("/", function(req, res) {
  Item.find({}, function(err, foundItems) {
    if (err) {
      console.log(err);
    } else if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Default items have been successfully added!");
          res.redirect("/");
        }
      });
    } else {
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }
  });
});

//custom list
app.get("/:customListName", function(req, res) {
  // if the user goes to a route <home>/somecustomlistname
  // convert the url customListName parameter to kebab case
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({ name: customListName }, function(err, foundList) {
    // search for a list with - the custom list name converted to kebab-case -
    if (err) {
      // if there's an error somewhere, console log it
      console.log(err);
    } else if (foundList === null) {
      // if no list with the custom name is found,
      // create one with default items & save
      const defaultList = new List({
        name: customListName,
        items: defaultItems
      });
      const saveNewDefaultList = defaultList
        .save()
        .then(function() {
          res.redirect(`/${customListName}`);
        })
        .catch(function() {
          console.log("Did not successfully 'findOne'");
        });
    } else {
      // if a list is found, render it
      res.render("list", {
        listTitle: foundList.name,
        newListItems: foundList.items
      });
    }
  });
});

// route for adding an item
app.post("/", function(req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({ name: itemName });

  if (listName === "Today") {
    item
      .save()
      .then(() => {
        console.log(
          "Item was saved to the default 'Today' list (items collection)"
        );
        res.redirect("/");
      })
      .catch(() => {
        console.log("List Name = Today but item save failed somehow");
      });
  } else {
    List.findOne({ name: listName }, function(err, foundList) {
      if (err) {
        console.log("Error in new custom list item 'findOne'.");
        console.log(err);
      } else if (foundList === null) {
        console.log(`Looked for '${foundList}' and found nothing.`);
      } else {
        console.log(`Found '${foundList}'. Woohoo!`);
        foundList.items.push(item);
        foundList
          .save()
          .then(() => {
            console.log(`Item was saved to the custom ${listName} list.`);
            res.redirect(`/${listName}`);
          })
          .catch(() => {
            console.log("Item was not saved.");
          });
      }
    });
  }
});

// route for deleting an item
app.post("/delete", function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.deleteOne({ _id: checkedItemId }, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Item was successfully deleted");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkedItemId } } },
      function(err, foundList) {
        if (err) {
          console.log(err);
        } else {
          res.redirect(`/${listName}`);
        }
      }
    );
  }
});

// get about page
app.get("/about", function(req, res) {
  res.render("about");
});

// spool up server
app.listen(process.env.PORT || 3000, function() {
  console.log("Server started!");
});
