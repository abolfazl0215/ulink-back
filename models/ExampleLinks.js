const mongoose = require("mongoose");

const exampleLinksSchema = new mongoose.Schema([{ type: String }]);
const ExampleLinks = mongoose.model(
  "ExampleLinks",
  exampleLinksSchema,
);

module.exports = ExampleLinks;
